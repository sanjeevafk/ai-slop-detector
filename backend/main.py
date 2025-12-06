# type: ignore

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

app = FastAPI()

# CORS: allow browser extension to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HuggingFace endpoint for your model
HF_URL = "https://router.huggingface.co/hf-inference/models/prithivMLmods/Deep-Fake-Detector-v2-Model"
HF_TOKEN = os.environ.get("HF_TOKEN")  # Set this in system env


# ---- IMAGE ENDPOINT ----
@app.post("/detect-image")
async def detect_image(file: UploadFile = File(...)):
    img_bytes = await file.read()

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "image/jpeg",
    }

    response = requests.post(HF_URL, headers=headers, data=img_bytes)

    try:
        return response.json()
    except:
        return {"error": "HF returned non-JSON", "raw": response.text}


# ---- TEXT ENDPOINT ----
@app.post("/detect-text")
async def detect_text(text: str = Form(...)):
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {"inputs": text}

    response = requests.post(HF_URL, headers=headers, json=payload)

    try:
        return response.json()
    except:
        return {"error": "HF returned non-JSON", "raw": response.text}
