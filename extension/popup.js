const elements = {
	backendUrl: document.getElementById("backendUrl"),
	backendState: document.getElementById("backendState"),
	threshold: document.getElementById("threshold"),
	thresholdValue: document.getElementById("thresholdValue"),
	maxItems: document.getElementById("maxItems"),
	minSize: document.getElementById("minSize"),
	saveBtn: document.getElementById("saveBtn"),
	resetBtn: document.getElementById("resetBtn"),
	scanCount: document.getElementById("scanCount"),
	flagCount: document.getElementById("flagCount"),
	errorCount: document.getElementById("errorCount")
};

function updateThresholdDisplay(value) {
	elements.thresholdValue.textContent = Number(value).toFixed(2);
}

function renderState(state) {
	if (!state) return;

	elements.backendUrl.value = state.settings.backendUrl;
	elements.threshold.value = state.settings.confidenceThreshold;
	updateThresholdDisplay(state.settings.confidenceThreshold);
	elements.maxItems.value = state.settings.maxItemsToScan;
	elements.minSize.value = state.settings.minImageSize;

	elements.scanCount.textContent = state.stats.scanned;
	elements.flagCount.textContent = state.stats.flagged;
	elements.errorCount.textContent = state.stats.errors;

	elements.backendState.textContent = state.backend.online ? "online" : "offline";
	elements.backendState.style.background = state.backend.online
		? "rgba(11, 107, 107, 0.18)"
		: "rgba(214, 106, 47, 0.18)";
	elements.backendState.style.color = state.backend.online ? "#0b6b6b" : "#d66a2f";
}

function fetchState() {
	chrome.runtime.sendMessage({ action: "GET_UI_STATE" }, (response) => {
		if (chrome.runtime.lastError) {
			return;
		}
		if (response?.success) {
			renderState(response.data);
		}
	});
}

elements.threshold.addEventListener("input", (event) => {
	updateThresholdDisplay(event.target.value);
});

elements.saveBtn.addEventListener("click", () => {
	const payload = {
		backendUrl: elements.backendUrl.value.trim() || "http://localhost:8000",
		confidenceThreshold: Number(elements.threshold.value),
		maxItemsToScan: Number(elements.maxItems.value),
		minImageSize: Number(elements.minSize.value)
	};

	chrome.runtime.sendMessage({ action: "UPDATE_SETTINGS", payload }, () => {
		fetchState();
	});
});

elements.resetBtn.addEventListener("click", () => {
	chrome.runtime.sendMessage({ action: "RESET_STATS" }, () => {
		fetchState();
	});
});

fetchState();
setInterval(fetchState, 10000);