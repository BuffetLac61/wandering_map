// The Marauder's Map — content script
// Runs at document_start on every frame that matches <all_urls>, but only
// performs work inside Incognito windows.

(() => {
  if (!chrome?.extension?.inIncognitoContext) return;
  if (window.__maraudersBooted) return;
  window.__maraudersBooted = true;

  const OPEN_PHRASE = "I solemnly swear that I am up to no good.";
  const CLOSE_PHRASE = "Mischief Managed.";

  // Map artwork hosted on the original CodePen author's S3 bucket.
  // Strict CSPs (img-src whitelists) may block these — see README.
  const ASSET_BASE = "https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/";
  const A = (name) => `${ASSET_BASE}${name}`;

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
        <div class="marauders-front" style="--image:url('${A("8.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-2">
        <div class="marauders-front" style="--image:url('${A("18.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-3">
        <div class="marauders-front" style="--image:url('${A("7.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-4">
        <div class="marauders-front" style="--image:url('${A("10.png")}')"></div>
      </div>
      <div class="marauders-map-side marauders-side-5">
        <div class="marauders-front" style="--image:url('${A("6.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
      <div class="marauders-map-side marauders-side-6">
        <div class="marauders-front" style="--image:url('${A("11.png")}')"></div>
        <div class="marauders-back"></div>
      </div>
    </div>
  `;

  // ---------- Opening ritual ------------------------------------------------
  const buildOpeningOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "marauders-overlay marauders-opening";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="marauders-stage">
        ${buildMap()}
        <div class="marauders-phrase">
          <svg viewBox="0 0 1200 120" class="marauders-ink" preserveAspectRatio="xMidYMid meet">
            <text x="600" y="85" text-anchor="middle"
                  class="marauders-ink-text"
                  font-family="'Satisfy','Dancing Script','Apple Chancery','Segoe Script',cursive"
                  font-size="62">
              ${OPEN_PHRASE}
            </text>
          </svg>
        </div>
      </div>
    `;
    return overlay;
  };

  const runOpeningSequence = () => {
    const overlay = buildOpeningOverlay();
    mount(overlay);

    const mapBase = overlay.querySelector(".marauders-map-base");

    // Timeline:
    //   0ms     — overlay mounts, map folded, phrase begins drawing
    //   800ms   — map begins unfolding (CSS transitions fire)
    //   3200ms  — all flaps/sides settled (800 + 2400ms of CSS choreography)
    //   ~6000ms — footsteps walk complete (active+2.5s delay + 3s animation)
    //   6000ms  — overlay fade-out
    //   6700ms  — overlay removed
    requestAnimationFrame(() => {
      setTimeout(() => mapBase.classList.add("marauders-active"), 800);
    });
    setTimeout(() => overlay.classList.add("marauders-fade-out"), 6000);
    setTimeout(() => overlay.remove(), 6700);
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
      <div class="marauders-stage">
        <div class="marauders-phrase">
          <svg viewBox="0 0 1200 140" class="marauders-ink" preserveAspectRatio="xMidYMid meet">
            <text x="600" y="100" text-anchor="middle"
                  class="marauders-ink-text marauders-ink-text-instant"
                  font-family="'Satisfy','Dancing Script','Apple Chancery','Segoe Script',cursive"
                  font-size="84">
              ${CLOSE_PHRASE}
            </text>
          </svg>
        </div>
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
