const DEFAULT_SETTINGS = {
  backendUrl: "http://localhost:8000",
  confidenceThreshold: 0.65,
  maxItemsToScan: 40,
  minImageSize: 60
};

const stats = {
  scanned: 0,
  flagged: 0,
  errors: 0
};

const cache = new Map();
const queue = [];
const MAX_CONCURRENCY = 2;
let inFlight = 0;

async function getSettings() {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
}

async function setSettings(nextSettings) {
  await chrome.storage.local.set({ settings: nextSettings });
}

function enqueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    drainQueue();
  });
}

function drainQueue() {
  if (inFlight >= MAX_CONCURRENCY || queue.length === 0) return;

  const { task, resolve, reject } = queue.shift();
  inFlight += 1;
  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      inFlight -= 1;
      drainQueue();
    });
}

async function checkBackendStatus() {
  const settings = await getSettings();
  try {
    const response = await fetch(`${settings.backendUrl}/status`, { method: "GET" });
    return { online: response.ok };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "DETECT_IMAGE_URL") {
    detectImageFromUrl(message.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.error("Detection error for:", message.payload, error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === "GET_UI_STATE") {
    Promise.all([getSettings(), checkBackendStatus()])
      .then(([settings, backend]) =>
        sendResponse({
          success: true,
          data: {
            settings,
            stats,
            backend
          }
        })
      )
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "UPDATE_SETTINGS") {
    setSettings(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "RESET_STATS") {
    stats.scanned = 0;
    stats.flagged = 0;
    stats.errors = 0;
    sendResponse({ success: true });
    return true;
  }
});

async function detectImageFromUrl(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  return enqueue(async () => {
    const settings = await getSettings();
    stats.scanned += 1;

    try {
      let blob;
      if (url.startsWith("data:")) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        blob = await response.blob();
      }

      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const serverRes = await fetch(`${settings.backendUrl}/detect`, {
        method: "POST",
        body: formData
      });

      if (!serverRes.ok) {
        throw new Error(`Server error: ${serverRes.status}`);
      }

      const json = await serverRes.json();
      cache.set(url, json);
      return json;
    } catch (error) {
      stats.errors += 1;
      throw error;
    }
  });
}