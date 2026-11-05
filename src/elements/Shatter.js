// Shatter (pair bonus, Fire + Ice): a frozen enemy that's also burning takes extra damage.
LST.ElementRegistry.registerPair(new (class Shatter extends LST.PairBonus {
  modify({ enemy: e }) {
    return LST.StatusEffects.get(e, "frozen") && LST.StatusEffects.get(e, "burn") ? 1 + this.bonus : 1;
  }
})({ id: "shatter", name: "Shatter", needs: ["ember", "frostbite"], bonus: 0.25, color: "#c8f4ff" }));
