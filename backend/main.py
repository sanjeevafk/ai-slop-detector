# main.py - Ensembled Detector (Flux + General AI Detector)
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image
import io
import torch

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model 1: Flux-specialized (your current)
flux_processor = AutoImageProcessor.from_pretrained("prithivMLmods/OpenSDI-Flux.1-SigLIP2")
flux_model = SiglipForImageClassification.from_pretrained("prithivMLmods/OpenSDI-Flux.1-SigLIP2")

# Model 2: General AI-vs-Human (strong on recent generators)
general_processor = AutoImageProcessor.from_pretrained("Ateeqq/ai-vs-human-image-detector")
general_model = SiglipForImageClassification.from_pretrained("Ateeqq/ai-vs-human-image-detector")

@app.get("/")
def home():
    return {"status": "AI Detector Running (Ensembling Flux + General Model)"}

@app.post("/detect")
async def detect_content(file: UploadFile = File(...)):
    print(f"🚨 Analyzing: {file.filename} ({file.content_type})...")
    
    try:
        file_bytes = await file.read()
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        
        # Inference on Flux model
        flux_inputs = flux_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            flux_outputs = flux_model(**flux_inputs)
        flux_probs = torch.softmax(flux_outputs.logits, dim=-1)[0]
        flux_ai_score = flux_probs[0].item() if flux_model.config.id2label[0] == "Flux.1_Generated" else flux_probs[1].item()  # AI class
        
        # Inference on General model
        general_inputs = general_processor(images=image, return_tensors="pt")
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
        
        print(f"✅ Ensemble Result: AI={ensemble_ai_score:.4f} (Flux={flux_ai_score:.4f}, General={general_ai_score:.4f})")
        return result
    
    except Exception as e:
        error_detail = str(e)
        print(f"❌ Error: {error_detail}")
        return {"error": "Processing Error", "details": error_detail}