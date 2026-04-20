# The Marauder's Map — Incognito Extension

A Chrome (Manifest V3) extension that turns every Incognito window into a
Marauder's Map experience: the parchment unfolds with *"I solemnly swear
that I am up to no good."*, an ink-footprint trail follows the cursor, and
*"Mischief Managed."* fades in as the tab closes.

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.

## Enable it in Incognito (required)

Chrome blocks extensions from Incognito by default. You must opt in manually:

1. Open `chrome://extensions`.
2. Find **The Marauder's Map**.
3. Click **Details**.
4. Toggle **Allow in Incognito** ON.

Open a new Incognito window (`Ctrl+Shift+N`) and the parchment should unfold
on the first real page load. Close the window to see *Mischief Managed*.

## Files

| File            | Role                                                         |
| --------------- | ------------------------------------------------------------ |
| `manifest.json` | MV3 manifest, `"incognito": "spanning"`                      |
| `background.js` | Service worker — monitors window/tab lifecycle               |
| `content.js`    | Injects the overlay, ink animation, footprint trail, filter  |
| `styles.css`    | Parchment, ink, and footprint canvas styles                  |

## Notes & limitations

- Chrome does not allow extensions to inject into internal pages
  (`chrome://`, the Web Store, the new-tab page). You will see the parchment
  on the first real URL you visit, not on the Incognito start page.
- The closing *"Mischief Managed."* overlay is painted during `beforeunload`.
  Browsers don't hold tabs open for animations, so it's a brief flash —
  not a full 1s sequence. This is an unavoidable browser constraint.
- Animations respect `prefers-reduced-motion`.
- **Map artwork is bundled locally** in `images/` and exposed via
  `web_accessible_resources` in `manifest.json`. URLs are resolved at
  runtime with `chrome.runtime.getURL(...)` and injected as CSS custom
  properties on `:root`. This bypasses third-party sites' CSP (DuckDuckGo,
  banks, etc.) that would otherwise block the original S3 hosts.

## Credits

The folded-map structure, 3D-transform unfold choreography, and footstep
shapes are adapted from [@oliviale](https://codepen.io/oliviale)'s
Marauder's Map CodePen (CSS Animations / Harry Potter collections).
