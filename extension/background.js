chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "DETECT_TEXT") {
        fetch(msg.url, {
            method: "POST",
            body: (() => {
                const form = new FormData();
                form.append("text", msg.text);
                return form;
            })()
        })
        .then(res => res.json())
        .then(data => sendResponse({ ok: true, result: data }))
        .catch(err => sendResponse({ ok: false, error: err.toString() }));

        return true; // keeps sendResponse alive asynchronously
    }
});
