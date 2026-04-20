// The Marauder's Map — background service worker
// Monitors window/tab lifecycle and coordinates the opening / closing rituals.

const incognitoTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Marauder's Map] Installed. The parchment awaits.");
});

chrome.windows.onCreated.addListener((win) => {
  if (win.incognito) {
    console.log("[Marauder's Map] Incognito window opened:", win.id);
  }
}, { windowTypes: ["normal"] });

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.incognito) {
    incognitoTabs.add(tab.id);
  }
});

// Fallback injection for tabs where the static content_script missed the load
// (e.g. SPAs pre-rendered before the extension enabled, or reload edge cases).
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.incognito) return;
  if (changeInfo.status !== "complete") return;
  if (!tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) return;

  chrome.scripting
    .executeScript({
      target: { tabId },
      func: () => {
        if (!window.__maraudersBooted) {
          window.dispatchEvent(new CustomEvent("marauders:boot"));
        }
      },
    })
    .catch(() => {
      /* Some pages (Chrome Web Store, etc.) reject injection — ignore silently. */
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (incognitoTabs.has(tabId)) {
    incognitoTabs.delete(tabId);
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  console.log("[Marauder's Map] Window closed:", windowId, "— Mischief Managed.");
});
