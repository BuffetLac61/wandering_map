// The Marauder's Map — content script
// Runs at document_start on every frame that matches <all_urls>, but only
// performs work inside Incognito windows.

(() => {
  if (!chrome?.extension?.inIncognitoContext) return;
  if (window.__maraudersBooted) return;
  window.__maraudersBooted = true;

  const OPEN_PHRASE = "I solemnly swear that I am up to no good.";
  const CLOSE_PHRASE = "Mischief Managed.";

  // Map artwork is bundled as web_accessible_resources so it loads from
  // chrome-extension:// URLs regardless of the host page's CSP.
  const IMG = (name) => chrome.runtime.getURL(`images/${name}`);
  const LOGO = () => chrome.runtime.getURL("logo.jpg");

  // ---------- Mount helpers -------------------------------------------------
  const mount = (el) => {
    const host = document.body || document.documentElement;
    host.appendChild(el);
  };

  const whenDomReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  // Inject every static image URL as a CSS custom property on :root, and
  // compute a scale factor that fits the unfolded map to the viewport.
  const injectImageVars = () => {
    const s = document.documentElement.style;
    s.setProperty("--mm-base",    `url("${IMG("9.png")}")`);
    s.setProperty("--mm-back",    `url("${IMG("back.png")}")`);
    s.setProperty("--mm-flap1f",  `url("${IMG("mini-1.png")}")`);
    s.setProperty("--mm-flap1b",  `url("${IMG("mini-3.png")}")`);
    s.setProperty("--mm-flap2f",  `url("${IMG("mini-2.png")}")`);
    s.setProperty("--mm-flap2b",  `url("${IMG("mini-4.png")}")`);
    s.setProperty("--mm-side5b",  `url("${IMG("1.png")}")`);
    s.setProperty("--mm-side6b",  `url("${IMG("17.png")}")`);
    s.setProperty("--mm-scroll",  `url("${IMG("scroll.svg")}")`);
  };

  // Unfolded map spans ~920px × 600px at scale 1. Fit to viewport with a
  // safety margin; cap at 2.2 to avoid obvious upscaling blur.
  const computeMapScale = () => {
    const scale = Math.min(
      (window.innerWidth  * 0.95) / 920,
      (window.innerHeight * 0.92) / 600,
      2.2
    );
    document.documentElement.style.setProperty("--mm-scale", scale.toFixed(3));
  };

  // ---------- The folded map ------------------------------------------------
  // Structure ported from oliviale's CodePen (Pug → HTML).
  const buildMap = () => `
    <div class="marauders-map-base">
      <div class="marauders-footsteps marauders-footsteps-1">
        <div class="marauders-footstep marauders-left"></div>
        <div class="marauders-footstep marauders-right"></div>
        <div class="marauders-scroll-name"><p>Severus Snape</p></div>
      </div>
      <div class="marauders-footsteps marauders-footsteps-2">
        <div class="marauders-footstep marauders-left"></div>
        <div class="marauders-footstep marauders-right"></div>
        <div class="marauders-scroll-name"><p>Harry Potter</p></div>
      </div>
      <div class="marauders-map-flap marauders-flap-1">
        <div class="marauders-map-flap-front"></div>
        <div class="marauders-map-flap-back"></div>
      </div>
      <div class="marauders-map-flap marauders-flap-2">
        <div class="marauders-map-flap-front"></div>
        <div class="marauders-map-flap-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-1">
        <div class="marauders-front" style="--image:url('${IMG("8.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-2">
        <div class="marauders-front" style="--image:url('${IMG("18.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-3">
        <div class="marauders-front" style="--image:url('${IMG("7.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-4">
        <div class="marauders-front" style="--image:url('${IMG("10.png")}')"></div>
      </div>
      <div class="marauders-map-side marauders-side-5">
        <div class="marauders-front" style="--image:url('${IMG("6.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-6">
        <div class="marauders-front" style="--image:url('${IMG("11.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
    </div>
  `;

  // ---------- Wandering ambient footsteps (pre-show phase) -----------------
  const spawnAmbientPair = (field) => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Pick a random centre, avoiding the middle 40% where logo + phrase sit.
    let cx, cy;
    for (let i = 0; i < 6; i++) {
      cx = Math.random() * w;
      cy = Math.random() * h;
      const inExclusion =
        cx > w * 0.30 && cx < w * 0.70 &&
        cy > h * 0.30 && cy < h * 0.70;
      if (!inExclusion) break;
    }

    const angleDeg = Math.random() * 360;
    const angleRad = (angleDeg * Math.PI) / 180;

    for (let side = 0; side < 2; side++) {
      const perpOffset = 11 * (side === 0 ? 1 : -1);
      const px = cx + Math.cos(angleRad + Math.PI / 2) * perpOffset;
      const py = cy + Math.sin(angleRad + Math.PI / 2) * perpOffset;

      const foot = document.createElement("div");
      foot.className = "marauders-ambient-footstep";
      foot.style.left = px + "px";
      foot.style.top = py + "px";
      foot.style.transform = `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`;
      foot.style.animationDelay = side * 120 + "ms";
      field.appendChild(foot);

      setTimeout(() => foot.remove(), 3500 + side * 120);
    }
  };

  // ---------- Opening ritual ------------------------------------------------
  const buildOpeningOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "marauders-overlay marauders-opening";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="marauders-ambient-field"></div>
      <div class="marauders-preshow">
        <img class="marauders-logo" src="${LOGO()}" alt="" draggable="false">
        <p class="marauders-phrase">${OPEN_PHRASE}</p>
      </div>
      <div class="marauders-map-stage">
        ${buildMap()}
      </div>
    `;
    return overlay;
  };

  const runOpeningSequence = () => {
    const overlay = buildOpeningOverlay();
    mount(overlay);

    const ambientField = overlay.querySelector(".marauders-ambient-field");
    const preshow      = overlay.querySelector(".marauders-preshow");
    const mapStage     = overlay.querySelector(".marauders-map-stage");
    const mapBase      = overlay.querySelector(".marauders-map-base");

    // Timeline:
    //   0ms     — overlay mounts, logo + phrase fade in
    //   400ms   — ambient footsteps begin spawning (every 250ms)
    //   2000ms  — stop spawning; preshow + ambient field fade out
    //   2500ms  — map-stage fades in (folded map appears)
    //   3100ms  — map begins unfolding (.marauders-active)
    //   5500ms  — unfold complete (3100 + 2400ms choreography)
    //   ~7600ms — on-map footsteps walk complete (2s delay + 2.5s animation)
    //   7800ms  — overlay fade-out
    //   8500ms  — overlay removed

    const spawnPair = () => spawnAmbientPair(ambientField);
    let ambientInterval;
    setTimeout(() => {
      spawnPair();
      ambientInterval = setInterval(spawnPair, 250);
    }, 400);
    setTimeout(() => clearInterval(ambientInterval), 2000);

    setTimeout(() => {
      preshow.classList.add("marauders-fade-out");
      ambientField.classList.add("marauders-fade-out");
    }, 2000);

    setTimeout(() => mapStage.classList.add("marauders-visible"), 2500);
    setTimeout(() => mapBase.classList.add("marauders-active"), 3100);

    setTimeout(() => overlay.classList.add("marauders-fade-out"), 7800);
    setTimeout(() => overlay.remove(), 8500);
  };

  // ---------- Closing ritual ------------------------------------------------
  // beforeunload fires synchronously while the page tears down — browsers
  // won't hold the tab open for animation. We paint one final frame with
  // the phrase only (the map artwork wouldn't finish loading in time).
  const buildClosingOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "marauders-overlay marauders-closing";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="marauders-preshow">
        <p class="marauders-phrase marauders-phrase-instant">${CLOSE_PHRASE}</p>
      </div>
    `;
    return overlay;
  };

  const runClosingSequence = () => {
    document
      .querySelectorAll(".marauders-overlay")
      .forEach((n) => n.remove());
    mount(buildClosingOverlay());
  };

  // ---------- Parchment filter ---------------------------------------------
  const applyParchmentFilter = () => {
    const texture = document.createElement("div");
    texture.className = "marauders-texture";
    texture.setAttribute("aria-hidden", "true");
    mount(texture);
  };

  // ---------- Ink footprint trail (uses example's .footstep visual) --------
  const setupCursorTrail = () => {
    let lastX = null;
    let lastY = null;
    let accDist = 0;
    let side = 0; // 0 = left foot, 1 = right foot
    const SPACING = 38;

    window.addEventListener(
      "mousemove",
      (e) => {
        if (lastX === null) {
          lastX = e.clientX;
          lastY = e.clientY;
          return;
        }
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        accDist += Math.hypot(dx, dy);

        if (accDist >= SPACING) {
          const angle = Math.atan2(dy, dx);
          const perpOffset = 9 * (side === 0 ? 1 : -1);
          const px = e.clientX + Math.cos(angle + Math.PI / 2) * perpOffset;
          const py = e.clientY + Math.sin(angle + Math.PI / 2) * perpOffset;
          const rotDeg = (angle * 180) / Math.PI + 90;

          const step = document.createElement("div");
          step.className =
            "marauders-trail-step " +
            (side === 0 ? "marauders-left" : "marauders-right");
          step.style.left = px + "px";
          step.style.top = py + "px";
          step.style.transform = `translate(-50%, -50%) rotate(${rotDeg}deg)`;
          (document.body || document.documentElement).appendChild(step);
          setTimeout(() => step.remove(), 1900);

          side ^= 1;
          accDist = 0;
        }

        lastX = e.clientX;
        lastY = e.clientY;
      },
      { passive: true }
    );
  };

  // ---------- Boot ----------------------------------------------------------
  injectImageVars();
  computeMapScale();
  window.addEventListener("resize", computeMapScale, { passive: true });

  whenDomReady(() => {
    applyParchmentFilter();
    runOpeningSequence();
    setupCursorTrail();
  });

  window.addEventListener("marauders:boot", () => {
    if (!document.querySelector(".marauders-overlay")) {
      whenDomReady(runOpeningSequence);
    }
  });

  window.addEventListener("beforeunload", runClosingSequence);
  window.addEventListener("pagehide", runClosingSequence);
})();
