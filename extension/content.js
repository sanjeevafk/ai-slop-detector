// content.js - Full Updated Version for Binary Flux Detector Model
console.log("👁️ AI Detector: Content script loaded");

const CONFIG = {
  MIN_IMAGE_SIZE: 60,           // Lowered for thumbnails
  CONFIDENCE_THRESHOLD: 0.65,   // Adjust lower (e.g., 0.5) if missing detections, higher (0.8) for fewer false positives
  MAX_ITEMS_TO_SCAN: 40
};

let processedImages = new Set();

function scanPageContent() {
  const images = Array.from(document.querySelectorAll("img"));
  let scanCount = 0;

  for (const img of images) {
    if (scanCount >= CONFIG.MAX_ITEMS_TO_SCAN) break;
    if (img.width < CONFIG.MIN_IMAGE_SIZE || img.height < CONFIG.MIN_IMAGE_SIZE) continue;
    if (processedImages.has(img.src)) continue;

    processedImages.add(img.src);
    scanCount++;
    processImageElement(img);
  }
}

async function processImageElement(img) {
  console.log("🔍 Checking image:", img.src);

  chrome.runtime.sendMessage(
    { action: "DETECT_IMAGE_URL", payload: img.src },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log("✅ Detection result:", response.data);
        handleModelResponse(response.data, img);
      } else {
        console.warn("❌ Detection failed for:", img.src, response?.error);
      }
    }
  );
}

function handleModelResponse(data, element) {
  if (!Array.isArray(data) || data.length === 0) return;

  const scores = {};
  data.forEach(item => { scores[item.label] = item.score; });

  // Specific to prithivMLmods/OpenSDI-Flux.1-SigLIP2: Labels are "Flux.1_Generated" and "Real_Image"
  const aiScore = scores["AI-Generated"] || scores["ai"] || scores["Flux.1_Generated"] || 0;
  let confidence = 0;
  let message = "";

  if (aiScore > CONFIG.CONFIDENCE_THRESHOLD) {
    confidence = aiScore;
    message = "Flux-Generated (Likely AI)";
  }

  if (message) {
    console.log(`🚩 Flagging as ${message}: ${Math.round(confidence * 100)}%`);
    flagContent(element, confidence, message);
  }
}

function flagContent(element, confidence, message) {
  element.style.border = "5px solid red";
  element.style.boxSizing = "border-box";

  const badge = document.createElement("div");
  badge.textContent = `🤖 ${message} (${Math.round(confidence * 100)}%)`;
  badge.style.position = "absolute";
  badge.style.top = "4px";
  badge.style.left = "4px";
  badge.style.background = "rgba(255,0,0,0.9)";
  badge.style.color = "white";
  badge.style.padding = "4px 8px";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "bold";
  badge.style.zIndex = "999999";
  badge.style.borderRadius = "4px";
  badge.style.pointerEvents = "none";

  if (element.parentElement.style.position === "") {
    element.parentElement.style.position = "relative";
  }
  element.parentElement.appendChild(badge);
}

// Initial scan + watch for dynamic content
window.addEventListener("load", () => {
  setTimeout(scanPageContent, 1500);
});

const observer = new MutationObserver(() => {
  scanPageContent();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});