// Toast: small floating messages at the bottom of the screen. mini(text) shows one for 2.2 s;
// offer(text, label, onTap) shows the update toast with one button (one at a time).
LST.Toast = class Toast {
  constructor(doc = document) { this.doc = doc; }

  mini(text) {
    const t = this.doc.createElement("div");
    t.className = "mini-toast";
    t.textContent = text;
    this.doc.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  offer(text, label, onTap) {
    if (this.doc.querySelector(".update-toast")) return;
    const toast = this.doc.createElement("div");
    toast.className = "update-toast";
    toast.innerHTML = `<span>${text}</span><button type="button" class="btn">${label}</button>`;
    toast.querySelector("button").addEventListener("click", () => {
      onTap();
      toast.remove();
    });
    this.doc.body.appendChild(toast);
  }
};
