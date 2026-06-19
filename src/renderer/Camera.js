export class Camera {
  constructor(canvas) {
    this.x = 0;         // world-space offset (tile units)
    this.y = 0;
    this.zoom = 1;      // multiplier on tile size

    this._canvas = canvas;
    this._dragging = false;
    this._lastMouse = { x: 0, y: 0 };

    this._attachEvents();
  }

  _attachEvents() {
    const c = this._canvas;

    c.addEventListener('mousedown', e => {
      if (e.button === 1 || e.button === 2) {
        this._dragging = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    });
    c.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      const TILE_W = 64 * this.zoom;
      const dx = (e.clientX - this._lastMouse.x) / (TILE_W / 2);
      const dy = (e.clientY - this._lastMouse.y) / (TILE_W / 4);
      this.x -= dx;
      this.y -= dy;
      this._lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { this._dragging = false; });
    c.addEventListener('contextmenu', e => e.preventDefault());

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.3, Math.min(3, this.zoom * factor));
    }, { passive: false });
  }

  // Convert iso screen coords back to tile coords (approximate)
  screenToTile(sx, sy, tileW, tileH) {
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    const ox = sx - cx;
    const oy = sy - cy;
    const tx = (ox / tileW + oy / tileH) + this.x;
    const ty = (oy / tileH - ox / tileW) + this.y;
    return { x: Math.round(tx), y: Math.round(ty) };
  }
}
