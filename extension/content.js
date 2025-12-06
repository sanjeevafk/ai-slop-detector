console.log("AI Detector: content.js running");

// BACKEND URL
const API_URL = "http://localhost:8000/detect-text";

async function detectAI(text) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                type: "DETECT_TEXT",
                text,
                url: "http://localhost:8000/detect-text"
            },
            (response) => {
                resolve(response?.result || response);
            }
        );
    });
}



function showBadge(el, prob) {
    const badge = document.createElement("div");
    badge.innerText = `⚠️ AI (${(prob * 100).toFixed(1)}%)`;

    badge.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        background: yellow;
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 9999999;
    `;

    el.style.position = "relative";
    el.appendChild(badge);
}

async function scanPage() {
    console.log("AI Detector: scanPage() STARTED");

    const paragraphs = Array.from(document.querySelectorAll("p"));
    console.log("Found paragraphs:", paragraphs.length);

    for (const p of paragraphs) {
        const text = p.innerText.trim();
        if (text.length < 80) continue;

        console.log("Checking paragraph:", text.slice(0, 60));

        const result = await detectAI(text);
        console.log("API result:", result);

        let prob = 0;

        if (Array.isArray(result) && result[0]?.score !== undefined) {
            prob = result[0].score;
        } else if (result.ai_probability !== undefined) {
            prob = result.ai_probability;
        }

        if (prob > 0.75) {
            showBadge(p, prob);
        }
    }
}

scanPage(); 
