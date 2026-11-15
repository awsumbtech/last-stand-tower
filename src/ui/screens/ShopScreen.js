// ShopScreen ("upgrade"): the pick-1-of-3 shop between waves (and the Head Start draft).
// Deals the cards (CardFlip backs for elemental and known-trap cards), the free / extra price
// tags, Return a trap, Reroll, Repair, Auto-pick and Next wave. One delegated listener takes
// or flips a card.
LST.ShopScreen = class ShopScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-upgrade"));
    const $ = (id) => document.getElementById(id);
    this.els = {
      upCoins: $("up-coins"), cardRow: $("card-row"), shopHint: $("shop-hint"), auto: $("btn-auto"),
      reroll: $("btn-reroll"), rerollPrice: $("reroll-price"), repair: $("btn-repair"), repairPrice: $("repair-price"),
      repairHp: $("repair-hp"), next: $("btn-next"),
    };
    const e = this.els;
    e.auto.addEventListener("click", () => game.autoDraft());
    $("btn-return").addEventListener("click", () => game.returnTrap());
    e.next.addEventListener("click", () => game.leaveShop());
    e.reroll.addEventListener("click", () => game.rerollShop());
    e.repair.addEventListener("click", () => game.repairTower());
    // Cards with a back face (CardFlip) only flip when tapped; their take button is the only
    // way to take them. Plain cards still take on a tap anywhere, as before.
    e.cardRow.addEventListener("click", (ev) => {
      const card = ev.target.closest("[data-slot]");
      if (!card) return;
      this.tapCard(card, !!ev.target.closest(".tag"));
    });
    e.cardRow.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const card = ev.target.closest("[data-slot]");
      if (!card) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.tapCard(card, !!ev.target.closest(".tag"));
    });
  }

  take(card) {
    if (card.classList.contains("locked")) { LST.audio.play("deny"); LST.UI.pop(card, "shake"); return; }
    this.game.takeCard(+card.dataset.slot);
  }

  tapCard(card, onTakeButton) {
    if (onTakeButton || !LST.CardFlip.canFlip(card)) this.take(card);
    else { LST.CardFlip.toggle(card); LST.audio.play("tap"); }
  }

  onShow() { this.render({ deal: true }); }

  // opts.deal: cards fly in (new shop) · opts.rerolled: open cards re-deal · opts.took: slot just taken
  render(opts = {}) {
    const g = this.game, e = this.els;
    const s = g.shop;
    if (!s) return;
    if (opts.took !== undefined || opts.repaired || opts.rerolled) LST.UI.pop(document.getElementById("up-coins-pill"), "bump");
    const d = g.draft;
    document.getElementById("up-title").innerHTML = d ? `Head Start <span class="hand">${d.hand} / ${d.of}</span>` : `Wave <span id="up-wave">${g.wave}</span> cleared!`;
    e.upCoins.textContent = LST.utils.formatNumber(g.coins);

    const extraPrice = g.shopPrice("extraCard");
    const open = s.cards.filter((c) => !c.taken).length;
    e.shopHint.innerHTML = d && !s.picked
      ? `Wave ${d.hand}'s shop: pick a card, it's <b>free</b>!`
      : !s.picked
      ? "Pick a card. It's <b>free</b>!"
      : open ? "Want another? Extra cards cost coins." : "All cards taken. Nice haul!";
    e.auto.classList.toggle("hidden", !d || d.hand >= d.of);
    e.reroll.classList.toggle("hidden", !!d && d.hand < d.of);
    e.shopHint.classList.toggle("free", !s.picked);

    e.cardRow.innerHTML = "";
    s.cards.forEach((slot, i) => {
      const { card, taken } = slot;
      const lvl = g.upgradeLevels[card.id] || 0;
      const appraisal = LST.meta.level("appraisal");
      const known = card.trap && LST.meta.knowsTrap(card.id);
      const shownLvl = taken ? lvl : lvl + 1; // level after taking it
      const rar = LST.RARITY[card.rarity];
      const locked = !taken && s.picked && g.coins < extraPrice;
      const info = !card.trap && typeof card.details === "function"; // elemental cards: "How it works" back
      const flips = info || (!!card.trap && (appraisal >= 2 || known)); // the catch is known: it goes on the back
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.className = `card ${card.rarity}` + (taken ? " taken" : "") + (locked ? " locked" : "") +
        (opts.took === i ? " bought" : "") + (slot.from && opts.took === i ? " mystery" : "") +
        (card.trap && appraisal >= 1 && !["dud", "build", "weak"].includes(card.kind) ? " cursed" : "") +
        (opts.deal || (opts.rerolled && !taken) ? " deal" : "");
      el.style.setProperty("--accent", card.color);
      el.style.setProperty("--rarity", rar.color);
      el.style.setProperty("--i", i);
      el.dataset.slot = i;
      el.setAttribute("aria-label", `${card.name}, ${rar.label}: ${card.desc}`);
      // Price pill. On a flippable card it is a real <button> (the only way to take it), so a
      // flip tap never buys; on a plain card the whole card is the button and this is a span.
      const tagCls = taken ? "tag done" : !s.picked ? "tag free" : "tag";
      const tagBody = taken ? "&#10003; Taken" : !s.picked ? "FREE" : `<i class="coin"></i>${extraPrice}`;
      const takeBtn = flips && !taken
        ? `<button type="button" class="${tagCls}" aria-label="Take ${card.name}${s.picked ? ` for ${extraPrice} coins` : ", free"}">${tagBody}</button>`
        : `<span class="${tagCls}">${tagBody}</span>`;
      el.innerHTML = `
        <span class="ribbon">${rar.label}</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${card.icon}</svg></span>
        <span class="name">${card.name}</span>
        ${flips ? LST.CardFlip.markerHTML(known, info ? "info" : "") : ""}
        <span class="level">${slot.from ? "from Mystery Box" : card.trap ? "NEW" : (shownLvl === 1 && !taken ? "NEW" : "Lv " + shownLvl) + (card.maxLevel ? " / " + card.maxLevel : "")}</span>
        <span class="desc">${card.desc}</span>
        ${card.trap ? `<span class="fine">${card.fine}</span>` : `<span class="stat">${card.stat(g.tower)}</span>`}
        ${takeBtn}
        ${flips ? LST.CardFlip.backHTML(info
          ? { title: card.name, label: "How it works", body: card.details(g.tower), kind: "info" }
          : { title: card.name, body: card.truth }) : ""}`;
      if (flips) {
        // Holds its own buttons (flip marker + take), so the card itself is a group, not a button.
        el.classList.add("has-back");
        el.setAttribute("role", "group");
        el.removeAttribute("tabindex");
      }
      e.cardRow.appendChild(el);
    });

    // Appraisal L3: return a trap you just took.
    const ret = g.returnableTrap();
    const retEl = document.getElementById("btn-return");
    retEl.classList.toggle("hidden", !ret);
    if (ret) retEl.innerHTML = `&#8617; Return ${LST.cardById(ret.id).name} <small>(${ret.paid ? "+" + ret.paid + " coins" : "free reroll"})</small>`;
    if (opts.returned) e.shopHint.innerHTML = `${LST.cardById(opts.returned).name} returned. Good eye!`;

    const rerollPrice = g.shopPrice("reroll");
    e.rerollPrice.textContent = rerollPrice;
    e.reroll.disabled = !open || g.coins < rerollPrice;
    const t = g.tower;
    const repairPrice = g.shopPrice("repair");
    e.repairPrice.textContent = repairPrice;
    e.repairHp.textContent = `${Math.ceil(t.hp)}/${Math.round(t.maxHp)}`;
    e.repair.disabled = t.hp >= t.maxHp || g.coins < repairPrice;
    e.repair.classList.toggle("urgent", t.hp < t.maxHp * 0.4 && !e.repair.disabled);
    if (opts.repaired) LST.UI.pop(e.repair, "bump");

    const canGo = g.canLeaveShop();
    e.next.disabled = !canGo;
    e.next.innerHTML = !canGo ? "Pick a card first" : d && d.hand < d.of ? "Next hand &#9654;" : `${d ? "Start wave " + (d.of + 1) : "Next wave"} &#9654;`;
    if (opts.deal) LST.audio.play("deal");
  }
};
