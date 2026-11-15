// GotchaScreen ("gotcha"): a trap card's reveal. The card flips to its GOTCHA! back with the
// truth and the lesson; the stamp sound lands as it turns. Got it dismisses it.
LST.GotchaScreen = class GotchaScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-gotcha"), true);
    document.getElementById("btn-gotcha").addEventListener("click", () => game.dismissGotcha());
  }

  static get KIND_LABEL() { return { cursed: "Cursed", delayed: "Delayed cost", build: "Build-dependent", gamble: "Gamble", dud: "Dud", weak: "Nearly a dud" }; }

  onShow() { this.render(); }

  render() {
    const id = this.game.gotchaQueue[0];
    const c = id && LST.cardById(id);
    if (!c) return;
    const rar = LST.RARITY[c.rarity];
    const flip = document.getElementById("gotcha-flip");
    flip.style.setProperty("--accent", c.color);
    flip.style.setProperty("--rarity", rar.color);
    flip.className = `gotcha-flip ${c.rarity}`;
    flip.innerHTML = `
      <div class="face front card ${c.rarity}" style="--accent:${c.color};--rarity:${rar.color}">
        <span class="ribbon">${rar.label}</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>
        <span class="name">${c.name}</span>
        <span class="desc">${c.desc}</span>
        <span class="fine">${c.fine}</span>
      </div>
      <div class="face back">
        <span class="stamp">GOTCHA!</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>
        <span class="name">${c.name} <i class="kind">${LST.GotchaScreen.KIND_LABEL[c.kind]}</i></span>
        <span class="truth">${c.truth}</span>
      </div>`;
    document.getElementById("gotcha-lesson").innerHTML = `<b>Lesson:</b> ${c.lesson}`;
    void flip.offsetWidth;
    flip.classList.add("go");
    setTimeout(() => { LST.audio.play("stamp"); LST.haptics.buzz(30); }, 900);
  }
};
