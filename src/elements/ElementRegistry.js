// ElementRegistry: every element and pair bonus registers here. It adds the element cards to
// LST.CARDS (Workshop-locked, so a player who hasn't unlocked one gets exactly the old deck),
// and the projectile calls it on each hit by a shot that carries elements.
LST.ElementRegistry = {
  elements: [],
  pairs: [],
  register(element) {
    this.elements.push(element);
    LST.CARDS.push(element.card());
    return element;
  },
  registerPair(pair) { this.pairs.push(pair); return pair; },
  byId(id) { return this.elements.find((e) => e.id === id) || null; },
  isElementCard(card) { return !!(card && card.element); },

  // Damage of a hit after pair bonuses (Shatter). Only called for shots with elements.
  hitDamage(proj, e, game) {
    let mult = 1;
    for (const p of this.pairs) {
      if (!p.owned(game.tower)) continue;
      const m = p.modify({ proj, enemy: e, game, tower: game.tower });
      if (m !== 1) { mult *= m; this.emit(game, p, e, { kind: "pair" }); }
    }
    return proj.damage * mult;
  },

  // After the hit landed: let each owned element react.
  onHit(proj, e, damage, game) {
    const els = proj.elements;
    for (const el of this.elements) {
      const level = els[el.id] || 0;
      if (!level) continue;
      const fx = el.onHit({ proj, enemy: e, damage, level, game, tower: game.tower });
      if (fx) this.emit(game, el, e, typeof fx === "object" ? fx : {});
    }
  },

  emit(game, el, e, extra) {
    if (game.events && LST.EVENTS.ELEMENT_HIT) game.events.emit(LST.EVENTS.ELEMENT_HIT, Object.assign({ element: el.id, color: el.color, x: e.x, y: e.y, radius: e.radius }, extra));
  },

  // Shot color: owned elements take turns, so every element's glow shows up.
  shotTint(tower, n) {
    const owned = this.elements.filter((el) => (tower.elements[el.id] || 0) > 0);
    return owned.length ? owned[n % owned.length].color : null;
  },
};
