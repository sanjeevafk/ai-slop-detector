# AI Slop Detector

AI Slop Detector is a **privacy-first browser extension** that detects **AI-generated images** (and sampled video frames) directly on webpages.

All inference runs **entirely on your local machine**.  
**No images, frames, or metadata are uploaded or logged.**

This project is intended for users who want practical AI-content detection without relying on cloud APIs, telemetry, or third-party services.

---

## Overview

Modern AI image generators are increasingly realistic, and many platforms do not clearly label synthetic media. This extension provides a **local, model-based signal** to help identify likely AI-generated visual content while preserving user privacy.

The system consists of:
- A **local FastAPI backend** for inference
- A **Manifest V3 browser extension** that communicates only with `localhost`

No external network calls are made.

---

## Detection Approach

The backend uses an **ensemble of two vision classifiers**, combining **specialized detection** with **general-purpose coverage**.

### Models Used (Ensemble)

1. **prithivMLmods/OpenSDI-Flux.1-SigLIP2**
   - Binary classifier trained specifically to distinguish Flux.1-generated images from real photographs
   - Very effective on Flux-based outputs, including older Grok Imagine variants
   - Robust to moderate post-processing and morphing

2. **Ateeqq/ai-vs-human-image-detector**
   - General-purpose AI vs human image classifier
   - Trained on a broad mix of recent generators (Midjourney v6+, Stable Diffusion 3.5, GPT-4o images, etc.)
   - Provides strong coverage for non-Flux generators

### Ensemble Strategy

- Each model outputs an AI probability score
- The final score is the **average of both probabilities**
- This reduces single-model bias and improves robustness across generators

> **Accuracy note**  
> No detector is 100% accurate. Real-world accuracy is typically **~85–95%**, depending on generator, image quality, and post-processing. Cutting-edge proprietary models (e.g., current Aurora-based Grok Imagine) may still evade detection.

---

## Features

- Automatic scanning of images on any webpage
- Visual overlays:
  - Red border for likely AI-generated content
  - Confidence badge with probability score
- Works on dynamically loaded pages (infinite scroll, lazy loading)
- Basic video support via representative frame analysis
- Adjustable confidence threshold
- No accounts, API keys, or telemetry

---

## System Requirements

### Backend
- Python **3.10+**
- CPU inference supported (GPU optional)

### Browser
- Chrome, Edge, or Firefox
- Manifest V3 compatible

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/voidcommit-afk/ai-slop-detector.git
cd ai-slop-detector
```
### 2. Install Backend Dependencies 
```
cd backend 
pip install fastapi uvicorn transformers torch pillow
```
### 3. Start the Local Backend 
```
uvicorn main:app --reload
```
Keep this terminal running First launch will download approximately ~800 MB of model weights (one-time)

### 4. Load the Browser Extension (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` directory from the repository

---

### 5. Test

Visit sites with known AI imagery, such as:
- `civitai.com`
- `lexica.art`
- AI art–focused subreddits

Likely AI-generated images should display a **red border** and a **confidence badge**.

---

## Customization
- Reduce false positives: Increase `CONFIDENCE_THRESHOLD` in `extension/content.js` (e.g., to 0.85 or 0.90)
- Detect more subtle AI: Lower the threshold to 0.70 or 0.75
- After changes: Reload the extension in chrome://extensions


### Confidence Threshold Examples

- **Reduce false positives**
```js
CONFIDENCE_THRESHOLD = 0.85 // or 0.90
```
- Detect more subtle AI artifacts
```js
CONFIDENCE_THRESHOLD = 0.70 // or 0.75
```
After modifying:
- Reload the extension in `chrome://extensions`

## Privacy & Security

- **100% local inference** – All model processing happens on your device
- No outbound network requests from the extension or backend
- No telemetry, analytics, or tracking
- No data persistence or logging
- The browser extension communicates **only** with `localhost:8000`

Your images never leave your computer.

---

## Known Limitations

- **Speed**: CPU-only inference can take ~10–30 seconds per batch on average hardware (first run also downloads models)
- **Evasion**: Very recent or proprietary generators (e.g., current Aurora-based Grok Imagine) may still evade detection
- **Video support**: Currently samples only a single representative frame
- **Probabilistic nature**: Output is a confidence score, not definitive proof – false positives and false negatives are possible

Detection accuracy in the wild is typically **~85–95%**, varying by generator and post-processing.

---

## Contributing

Contributions are welcome! Potential areas include:

- GPU acceleration and improved batching
- Integration of additional ensemble models
- Multi-frame video analysis
- UI/UX enhancements (popup controls, per-site settings)
- Performance optimizations (quantization, caching)

Feel free to open issues or submit pull requests.

---

## License

MIT License

---

Built as a learning project with a strong emphasis on **privacy**, **local inference**, and **realistic expectations** of AI detection capabilities.

Enjoy responsibly and keep questioning what's real on the web.
