// CodexTab: the Workshop's Codex tab. Every card you've been dealt and the traps you've found
// (with their lesson); tap one to read it in the hint line (WorkshopScreen.codexSel).
LST.CodexTab = class CodexTab {
  constructor(screen) { this.screen = screen; }

  render(grid, opts) {
    const m = LST.meta, s = this.screen, hint = s.hint;
    const found = LST.TRAPS.filter((t) => m.knowsTrap(t.id)).length;
    const seen = LST.CARDS.filter((c) => m.state.codex.seen.includes(c.id)).length;
    const sel = s.codexSel && LST.cardById(s.codexSel);
    const known = sel && (sel.trap ? m.knowsTrap(sel.id) : m.state.codex.seen.includes(sel.id));
    hint.innerHTML = sel && known
      ? (sel.trap ? `<b>${sel.name}:</b> ${sel.truth} <i>${sel.lesson}</i>` : `<b>${sel.name}:</b> ${sel.desc}`)
      : sel ? "Not found yet. Keep playing!"
      : `Cards <b>${seen}/${LST.CARDS.length}</b> &middot; Traps found <b>${found}/${LST.TRAPS.length}</b>. Tap one to read it.`;
    hint.classList.toggle("codex-detail", !!(sel && known));
    const add = (c, isTrap) => {
      const has = isTrap ? m.knowsTrap(c.id) : m.state.codex.seen.includes(c.id);
      const el = document.createElement("button");
      el.className = `codex-tile ${c.rarity}` + (isTrap ? " trap" : "") + (has ? " found" : " unknown") + (s.codexSel === c.id ? " sel" : "");
      el.dataset.codex = c.id;
      el.style.setProperty("--accent", c.color);
      el.setAttribute("aria-label", has ? c.name : "Unknown card");
      el.innerHTML = `<span class="icon">${has ? `<svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>` : "?"}</span>
        <span class="name">${has ? c.name : "???"}</span>${isTrap && has ? '<span class="stamp">GOTCHA</span>' : ""}`;
      grid.appendChild(el);
    };
    LST.CARDS.forEach((c) => add(c, false));
    LST.TRAPS.forEach((c) => add(c, true));
  }
};
