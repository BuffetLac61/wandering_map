// The Marauder's Map — background service worker
// Monitors window/tab lifecycle and coordinates the opening / closing rituals.
//
// The opening animation should play ONCE per Incognito tab (on first real
// page load), not on every navigation within that tab. We track which tabs
// have already been shown the animation in an in-memory Set, keyed by tab id.

const shownTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Marauder's Map] Installed. The parchment awaits.");
});

chrome.windows.onCreated.addListener((win) => {
  if (win.incognito) {
    console.log("[Marauder's Map] Incognito window opened:", win.id);
  }
}, { windowTypes: ["normal"] });

// Fire the opening animation only on the first completed load in an Incognito
// tab. Subsequent navigations (clicking links, reloads) are ignored.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.incognito) return;
  if (changeInfo.status !== "complete") return;
  if (!tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) return;
  if (shownTabs.has(tabId)) return;

  shownTabs.add(tabId);

  chrome.scripting
    .executeScript({
      target: { tabId },
      func: () => {
        window.dispatchEvent(new CustomEvent("marauders:boot"));
      },
    })
    .catch(() => {
      /* Some pages (Chrome Web Store, etc.) reject injection — ignore silently. */
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  shownTabs.delete(tabId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  console.log("[Marauder's Map] Window closed:", windowId, "— Mischief Managed.");
});