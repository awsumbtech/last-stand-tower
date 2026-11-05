// CardFlip: a reusable "flip to read" part for shop cards (and any card-like element).
//
// A card with details gets a back face (CardFlip.backHTML) that sits on top of the front with
// the exact same size, so flipping never changes the card's height. Tapping the card body flips
// it; the card's own take button (.tag) is never part of the flip, and the flip never buys.
//
// Motion: a quick 3D rotateY (two 150 ms halves, the face swaps at 90 degrees). With
// prefers-reduced-motion or "Shake & flashes" off it swaps instantly.
LST.CardFlip = class CardFlip {
  static HALF_MS = 150;

  // Markup for the back face. title: card name · body: the explanation · note: optional tip.
  static backHTML({ title, label = "The catch", body, note = "" }) {
    return `<span class="card-back" aria-hidden="true" aria-live="polite">
        <span class="back-label">${label}</span>
        <span class="back-title">${title}</span>
        <span class="back-body">${body}</span>
        ${note ? `<span class="back-note">${note}</span>` : ""}
        <button type="button" class="back-hint flip-back" aria-label="Flip back to the front">Tap to flip back</button>
      </span>`;
  }

  // Small corner marker on the front that says "there's more on the back".
  static markerHTML(known) {
    return `<button type="button" class="flip-marker${known ? " known" : ""}" aria-expanded="false" aria-label="${known ? "Known trap: read the catch" : "Read the catch"}">${known ? CardFlip.EYE : "!"}</button>`;
  }

  static canFlip(el) { return !!(el && el.querySelector(":scope > .card-back")); }
  static isFlipped(el) { return el.classList.contains("flipped"); }

  static reducedMotion() {
    const media = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return media || (LST.settings && LST.settings.get("motion") === false);
  }

  // Flip the card to the other face. Returns the new state (true = back showing).
  static toggle(el, opts = {}) {
    if (!CardFlip.canFlip(el) || el.dataset.flipping) return CardFlip.isFlipped(el);
    const to = !CardFlip.isFlipped(el);
    // Keyboard: the back's "flip back" button takes focus while the back shows, the marker gets
    // it back afterwards, and the front's controls (take button) leave the tab order meanwhile.
    const hadFocus = typeof document !== "undefined" && el.contains(document.activeElement);
    const set = () => {
      el.classList.toggle("flipped", to);
      const back = el.querySelector(":scope > .card-back");
      back.setAttribute("aria-hidden", String(!to));
      const marker = el.querySelector(":scope > .flip-marker");
      if (marker) marker.setAttribute("aria-expanded", String(to));
      for (const c of el.querySelectorAll(":scope > button")) {
        if (to) c.setAttribute("tabindex", "-1"); else c.removeAttribute("tabindex");
      }
      if (hadFocus || opts.focus) {
        const target = to ? back.querySelector(".flip-back") : marker;
        if (target) target.focus();
      }
    };
    if (opts.instant || CardFlip.reducedMotion()) { set(); return to; }
    el.dataset.flipping = "1";
    el.classList.add("flip-out");
    setTimeout(() => {
      set();
      el.classList.remove("flip-out");
      el.classList.add("flip-in");
      setTimeout(() => { el.classList.remove("flip-in"); delete el.dataset.flipping; }, CardFlip.HALF_MS);
    }, CardFlip.HALF_MS);
    return to;
  }
};
LST.CardFlip.EYE = '<svg class="eye-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
