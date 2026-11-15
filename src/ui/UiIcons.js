// UiIcons: the small inline SVG icons the screens put in their markup (Gears, the Codex eye,
// the lock badge). The art plan replaces them with the UI icon sheet (F2, IconAtlas).
LST.UiIcons = class UiIcons {
  static get GEAR() { return '<svg class="gear" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.22 4.28L10.11 1.16L13.89 1.16L14.78 4.28L15.49 4.58L18.33 3.00L21.00 5.67L19.42 8.51L19.72 9.22L22.84 10.11L22.84 13.89L19.72 14.78L19.42 15.49L21.00 18.33L18.33 21.00L15.49 19.42L14.78 19.72L13.89 22.84L10.11 22.84L9.22 19.72L8.51 19.42L5.67 21.00L3.00 18.33L4.58 15.49L4.28 14.78L1.16 13.89L1.16 10.11L4.28 9.22L4.58 8.51L3.00 5.67L5.67 3.00L8.51 4.58Z M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2Z"/></svg>'; }
  static get EYE() { return '<svg class="eye-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></svg>'; }
  static get LOCK() { return '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'; }
};
