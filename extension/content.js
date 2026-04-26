// content.js - Full Updated Version for Binary Flux Detector Model
console.log("👁️ AI Detector: Content script loaded");

const DEFAULT_SETTINGS = {
  minImageSize: 60,
  confidenceThreshold: 0.65,
  maxItemsToScan: 40
};

let processedImages = new Set();
let settings = { ...DEFAULT_SETTINGS };

function scanPageContent() {
  const images = Array.from(document.querySelectorAll("img"));
  let scanCount = 0;

  for (const img of images) {
    if (scanCount >= settings.maxItemsToScan) break;
    if (img.width < settings.minImageSize || img.height < settings.minImageSize) continue;
    if (processedImages.has(img.src)) continue;

    processedImages.add(img.src);
    scanCount++;
    processImageElement(img);
  }
}

async function processImageElement(img) {
  console.log("Checking image:", img.src);

  chrome.runtime.sendMessage(
    { action: "DETECT_IMAGE_URL", payload: img.src },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log("Detection result:", response.data);
        handleModelResponse(response.data, img);
      } else {
        console.warn("Detection failed for:", img.src, response?.error);
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

  if (aiScore > settings.confidenceThreshold) {
    confidence = aiScore;
    message = "Likely AI";
  }

  if (message) {
    console.log(`Flagging as ${message}: ${Math.round(confidence * 100)}%`);
    flagContent(element, confidence, message);
  }
}

function flagContent(element, confidence, message) {
  if (element.dataset.aiSlopFlagged) return;
  element.dataset.aiSlopFlagged = "true";

  element.style.outline = "4px solid rgba(214, 106, 47, 0.9)";
  element.style.outlineOffset = "2px";

  const badge = document.createElement("div");
  badge.textContent = `AI ${Math.round(confidence * 100)}%`;
  badge.style.position = "absolute";
  badge.style.top = "8px";
  badge.style.left = "8px";
  badge.style.background = "rgba(19, 17, 26, 0.9)";
  badge.style.color = "#f8f2ea";
  badge.style.padding = "6px 10px";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "700";
  badge.style.letterSpacing = "0.02em";
  badge.style.zIndex = "999999";
  badge.style.borderRadius = "999px";
  badge.style.pointerEvents = "none";
  badge.style.boxShadow = "0 6px 16px rgba(19, 17, 26, 0.3)";

  const parent = element.parentElement;
  if (parent && parent.style.position === "") {
    parent.style.position = "relative";
  }
  parent?.appendChild(badge);
}

// Initial scan + watch for dynamic content
window.addEventListener("load", () => {
  loadSettings().then(() => setTimeout(scanPageContent, 1200));
});

let scanTimer;
const observer = new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanPageContent, 700);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});

async function loadSettings() {
  const stored = await chrome.storage.local.get("settings");
  settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
}