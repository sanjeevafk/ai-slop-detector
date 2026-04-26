# main.py - Ensembled Detector (Flux + General AI Detector)
import logging
import os
import time

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image, UnidentifiedImageError
import io
import torch

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="[%(asctime)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("ai-slop-detector")

app = FastAPI()

allowed_origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
allow_list = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")

flux_processor = None
flux_model = None
general_processor = None
general_model = None

device = torch.device(MODEL_DEVICE if torch.cuda.is_available() or MODEL_DEVICE == "cpu" else "cpu")


def load_models():
    global flux_processor, flux_model, general_processor, general_model

    if flux_model is None or general_model is None:
        # Model 1: Flux-specialized (your current)
        flux_processor = AutoImageProcessor.from_pretrained(
            "prithivMLmods/OpenSDI-Flux.1-SigLIP2"
        )
        flux_model = SiglipForImageClassification.from_pretrained(
            "prithivMLmods/OpenSDI-Flux.1-SigLIP2"
        )

        # Model 2: General AI-vs-Human (strong on recent generators)
        general_processor = AutoImageProcessor.from_pretrained(
            "Ateeqq/ai-vs-human-image-detector"
        )
        general_model = SiglipForImageClassification.from_pretrained(
            "Ateeqq/ai-vs-human-image-detector"
        )

        flux_model.to(device).eval()
        general_model.to(device).eval()

@app.get("/")
def home():
    return {"status": "AI Detector Running (Ensembling Flux + General Model)"}


@app.get("/status")
def status_check():
    return {
        "models_loaded": flux_model is not None and general_model is not None,
        "device": str(device),
    }

@app.post("/detect")
async def detect_content(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only image uploads are supported.",
        )

    logger.info("Analyzing %s (%s)", file.filename, file.content_type)

    try:
        load_models()
        start_time = time.time()
        file_bytes = await file.read()
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        
        # Inference on Flux model
        flux_inputs = flux_processor(images=image, return_tensors="pt")
        flux_inputs = {key: value.to(device) for key, value in flux_inputs.items()}
        with torch.no_grad():
            flux_outputs = flux_model(**flux_inputs)
        flux_probs = torch.softmax(flux_outputs.logits, dim=-1)[0]
        flux_ai_score = flux_probs[0].item() if flux_model.config.id2label[0] == "Flux.1_Generated" else flux_probs[1].item()  # AI class
        
        # Inference on General model
        general_inputs = general_processor(images=image, return_tensors="pt")
        general_inputs = {key: value.to(device) for key, value in general_inputs.items()}
        with torch.no_grad():
            general_outputs = general_model(**general_inputs)
        general_probs = torch.softmax(general_outputs.logits, dim=-1)[0]
        general_ai_score = general_probs[0].item() if general_model.config.id2label[0] == "ai" else general_probs[1].item()  # 'ai' label
        
        # Ensemble: Average AI probabilities
        ensemble_ai_score = (flux_ai_score + general_ai_score) / 2
        ensemble_real_score = 1 - ensemble_ai_score
        
        result = [
            {"label": "AI-Generated", "score": round(ensemble_ai_score, 4)},
            {"label": "Real", "score": round(ensemble_real_score, 4)}
        ]
        result.sort(key=lambda x: x["score"], reverse=True)
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Ensemble AI=%.4f (Flux=%.4f, General=%.4f) duration=%sms",
            ensemble_ai_score,
            flux_ai_score,
            general_ai_score,
            duration_ms,
        )
        return result
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image payload.",
        )
    except Exception as e:
        error_detail = str(e)
        logger.exception("Processing error: %s", error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Processing error.",
        )