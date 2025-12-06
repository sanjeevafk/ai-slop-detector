# AI Slop Detector
A no-nonsense browser extension that flags AI-generated text in the wild. Built on a Hugging Face model, further fine-tuned on a larger pool of synthetic “slop” to improve real-world detection.

## Status: WIP
The project is evolving. Expect breaking changes, incomplete features, and experiments that may or may not survive.

## What It Does
AI-generated content is getting harder to spot. This tool runs a lightweight detector on page text and throws a warning when the signal looks machine-made. The goal: stop people from blindly trusting polished, generic, mass-produced language.

## How It Works
- Uses a fine-tuned HF model trained on mixed AI-output datasets  
- Runs detection on selected webpage text  
- Surfaces a warning with a probability score  
- Extension targets Manifest V3 (Chrome/Edge; Firefox planned)

## Planned Features
- Real-time on-page detection  
- Adjustable sensitivity  
- Optional inference API for low-end hardware  
- Offline mode (experimental)  
- Minimal UI with focus on signal, not aesthetics

## Project Structure (WIP)
- ai-slop-detector/
- model/ # fine-tuning scripts and config
- extension/ # browser extension code
- api/ # optional inference backend
- utils/ # preprocessing and detection helpers


## Tech Stack
Python, HF Transformers, JS/TS, Browser Extension APIs, optional FastAPI/Node backend.

## Install (Coming Soon)
Basic cloning and setup instructions will be added once the prototype stops breaking every other day.

## Progress
- Repo initialized  
- Model research underway  
- Fine-tuning pipeline in progress  
- Extension UI skeleton  
- Inference path experiments

## Contributing
Open to PRs, constructive cynicism, and better datasets once the core pipeline stabilizes.

## License
MIT (planned)
