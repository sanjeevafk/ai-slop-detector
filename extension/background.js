chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "DETECT_IMAGE_URL") {
    detectImageFromUrl(message.payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => {
        console.error("Detection error for:", message.payload, error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }
});

async function detectImageFromUrl(url) {
  try {
    // Handle data: URLs (common on Google Images)
    if (url.startsWith("data:")) {
      const response = await fetch(url);
      var blob = await response.blob();
    } else {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      var blob = await response.blob();
    }

    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const serverRes = await fetch("http://localhost:8000/detect", {
      method: "POST",
      body: formData
    });

    if (!serverRes.ok) {
      throw new Error(`Server error: ${serverRes.status}`);
    }

    const json = await serverRes.json();
    return json;

  } catch (error) {
    console.error("Backend/Fetch Error:", error);
    throw error;
  }
}