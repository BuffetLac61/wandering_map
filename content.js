// The Marauder's Map — content script
// Runs at document_start on every frame that matches <all_urls>, but only
// performs work inside Incognito windows.

(() => {
  if (!chrome?.extension?.inIncognitoContext) return;
  if (window.__maraudersBooted) return;
  window.__maraudersBooted = true;

  const OPEN_PHRASE = "I solemnly swear that I am up to no good.";
  const CLOSE_PHRASE = "Mischief Managed.";

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

  // ---------- Opening ritual ------------------------------------------------
  const buildOpeningOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "marauders-overlay marauders-opening";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="marauders-parchment">
        <div class="marauders-vignette"></div>
        <svg class="marauders-ink" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid meet">
          <text x="600" y="140" text-anchor="middle"
                class="marauders-ink-text"
                font-family="'Mrs Saint Delafield','Dancing Script','Segoe Script',cursive"
                font-size="72" font-weight="400">
            ${OPEN_PHRASE}
          </text>
        </svg>
      </div>
    `;
    return overlay;
  };

  const runOpeningSequence = () => {
    const overlay = buildOpeningOverlay();
    mount(overlay);

    // Let the unfold animation play, then the ink draws, then fade out.
    // Total: ~800ms unfold + 2200ms ink + 600ms dwell + 700ms fade = ~4.3s.
    setTimeout(() => overlay.classList.add("marauders-fade-out"), 3600);
    setTimeout(() => overlay.remove(), 4300);
  };

  // ---------- Closing ritual ------------------------------------------------
  // beforeunload fires synchronously while the page is tearing down. We can't
  // hold the tab open, but we can paint one final frame of the parchment.
  const buildClosingOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "marauders-overlay marauders-closing";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="marauders-parchment marauders-parchment-fold">
        <div class="marauders-vignette"></div>
        <svg class="marauders-ink" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid meet">
          <text x="600" y="140" text-anchor="middle"
                class="marauders-ink-text marauders-ink-text-instant"
                font-family="'Mrs Saint Delafield','Dancing Script','Segoe Script',cursive"
                font-size="84" font-weight="400">
            ${CLOSE_PHRASE}
          </text>
        </svg>
      </div>
    `;
    return overlay;
  };

  const runClosingSequence = () => {
    // Remove any existing overlay (opening could still be animating).
    document
      .querySelectorAll(".marauders-overlay")
      .forEach((n) => n.remove());
    mount(buildClosingOverlay());
  };

  // ---------- Parchment filter ---------------------------------------------
  const applyParchmentFilter = () => {
    document.documentElement.classList.add("marauders-filter");

    const texture = document.createElement("div");
    texture.className = "marauders-texture";
    texture.setAttribute("aria-hidden", "true");
    mount(texture);
  };

  // ---------- Ink footprint trail -------------------------------------------
  const setupCursorTrail = () => {
    const canvas = document.createElement("canvas");
    canvas.className = "marauders-trail";
    canvas.setAttribute("aria-hidden", "true");
    mount(canvas);

    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Footprint state
    const prints = []; // { x, y, side, age, max }
    let lastX = null;
    let lastY = null;
    let accDist = 0;
    let side = 0; // alternates 0 / 1 for left/right foot
    const SPACING = 42; // px between footfalls

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
          // Offset perpendicular to motion so prints straddle the cursor path.
          const offset = 9 * (side === 0 ? 1 : -1);
          const px = e.clientX + Math.cos(angle + Math.PI / 2) * offset;
          const py = e.clientY + Math.sin(angle + Math.PI / 2) * offset;
          prints.push({
            x: px,
            y: py,
            angle,
            side,
            age: 0,
            max: 90, // frames ~ 1.5s at 60fps
          });
          side ^= 1;
          accDist = 0;
        }
        lastX = e.clientX;
        lastY = e.clientY;
      },
      { passive: true }
    );

    const drawFootprint = (p) => {
      const alpha = Math.max(0, 1 - p.age / p.max) * 0.55;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + Math.PI / 2);
      ctx.fillStyle = `rgba(40, 22, 10, ${alpha})`;

      // Sole (elongated oval)
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heel (small oval behind)
      ctx.beginPath();
      ctx.ellipse(0, 10, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Toes (3 tiny dots in front)
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 2.4, -9, 1.2, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = prints.length - 1; i >= 0; i--) {
        const p = prints[i];
        p.age++;
        if (p.age >= p.max) {
          prints.splice(i, 1);
          continue;
        }
        drawFootprint(p);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // ---------- Boot ----------------------------------------------------------
  whenDomReady(() => {
    applyParchmentFilter();
    runOpeningSequence();
    setupCursorTrail();
  });

  // Fallback boot signal from the background worker for late-loading frames.
  window.addEventListener("marauders:boot", () => {
    if (!document.querySelector(".marauders-overlay")) {
      whenDomReady(runOpeningSequence);
    }
  });

  window.addEventListener("beforeunload", runClosingSequence);
  window.addEventListener("pagehide", runClosingSequence);
})();
