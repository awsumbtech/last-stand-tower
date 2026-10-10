// All canvas drawing. The game state is read-only from here.

LST.Renderer = class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.scale = 1; // world units -> CSS pixels
    this.width = 0; // CSS pixels
    this.height = 0;
    this.time = 0;
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    const portrait = this.height > this.width * 1.3;
    const world = portrait ? LST.CONFIG.WORLD_SIZE_PORTRAIT : LST.CONFIG.WORLD_SIZE;
    this.scale = Math.min(this.width, this.height) / world;
  }

  // Half the visible area in world units (the tower is at 0,0).
  get halfW() { return this.width / 2 / this.scale; }
  get halfH() { return this.height / 2 / this.scale; }

  draw(game, dt) {
    this.time += dt;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#07070f";
    ctx.fillRect(0, 0, this.width, this.height);

    // World transform: origin at the screen center, plus screen shake.
    const shake = game.shake > 0 ? game.shake * 8 : 0;
    ctx.save();
    ctx.translate(
      this.width / 2 + (Math.random() - 0.5) * shake,
      this.height / 2 + (Math.random() - 0.5) * shake
    );
    ctx.scale(this.scale, this.scale);

    this.drawGrid();
    this.drawRange(game.tower);
    for (const p of game.particles) this.drawParticle(p);
    for (const e of game.enemies) this.drawEnemy(e);
    for (const p of game.projectiles) this.drawProjectile(p);
    this.drawTower(game.tower);
    for (const t of game.texts) this.drawText(t);

    ctx.restore();

    if (game.state === "playing" && game.waveIntro > 0) this.drawWaveBanner(game);
  }

  drawGrid() {
    const ctx = this.ctx;
    const step = 50;
    const w = Math.ceil(this.halfW / step) * step;
    const h = Math.ceil(this.halfH / step) * step;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -w; x <= w; x += step) { ctx.moveTo(x, -h); ctx.lineTo(x, h); }
    for (let y = -h; y <= h; y += step) { ctx.moveTo(-w, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }

  drawRange(tower) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 240, 255, 0.035)";
    ctx.fill();
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -this.time * 12;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawTower(t) {
    const ctx = this.ctx;
    const color = t.hitFlash > 0 ? "#ff4d6d" : "#00f0ff";
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    // Base: a slowly rotating hexagon.
    ctx.save();
    ctx.rotate(this.time * 0.3);
    this.polygon(6, t.radius);
    ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Barrel points at the current target.
    ctx.rotate(t.angle);
    ctx.fillStyle = color;
    ctx.fillRect(0, -4, t.radius + 10, 8);
    ctx.beginPath();
    ctx.arc(0, 0, t.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(e) {
    const ctx = this.ctx;
    const color = e.hitFlash > 0 ? "#ffffff" : e.color;
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.age / 0.4); // fade in after spawning
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.fillStyle = color + "33";
    ctx.lineWidth = 2.5;
    ctx.save();
    ctx.rotate(e.spin);
    if (e.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    } else if (e.shape === "triangle") {
      this.polygon(3, e.radius * 1.2);
    } else if (e.shape === "square") {
      this.polygon(4, e.radius * 1.2);
    } else {
      this.polygon(6, e.radius);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Small HP bar once damaged.
    if (e.hp < e.maxHp) {
      ctx.shadowBlur = 0;
      const w = e.radius * 2;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(-w / 2, -e.radius - 9, w, 3);
      ctx.fillStyle = e.color;
      ctx.fillRect(-w / 2, -e.radius - 9, w * Math.max(0, e.hp / e.maxHp), 3);
    }
    ctx.restore();
  }

  drawProjectile(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#c8fbff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticle(p) {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  drawText(t) {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }

  drawWaveBanner(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.waveIntro);
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.font = `bold ${Math.round(Math.min(48, this.width / 10))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`WAVE ${game.wave}`, this.width / 2, this.height * 0.3);
    ctx.restore();
  }

  // Regular polygon path centered on the current origin.
  polygon(sides, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
};
