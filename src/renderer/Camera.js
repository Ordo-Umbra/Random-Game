const BASE_TILE_W = 64;
const BASE_TILE_H = 32;
const DRAG_THRESHOLD = 5;   // pixels before a press becomes a drag
const KEY_PAN_SPEED  = 0.3; // tiles per frame at zoom 1

export class Camera {
  constructor(canvas) {
    this.x    = 0;
    this.y    = 0;
    this.zoom = 1;

    this._canvas      = canvas;
    this._dragging    = false;
    this._dragStarted = false;
    this._downPos     = { x: 0, y: 0 };
    this._lastPos     = { x: 0, y: 0 };
    this._pinchDist   = 0;
    this._keys        = {};

    // Expose to main.js so click events can be suppressed after a drag
    this.wasDragging  = false;

    this._attach();
  }

  _attach() {
    const c = this._canvas;

    // ── Mouse ──────────────────────────────────────────────────────────────
    c.addEventListener('mousedown', e => {
      this._dragging    = true;
      this._dragStarted = false;
      this.wasDragging  = false;
      this._downPos     = { x: e.clientX, y: e.clientY };
      this._lastPos     = { x: e.clientX, y: e.clientY };
      if (e.button === 1 || e.button === 2) e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      const dx = e.clientX - this._downPos.x;
      const dy = e.clientY - this._downPos.y;
      if (!this._dragStarted && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this._dragStarted = true;
      }
      if (!this._dragStarted) return;
      this.wasDragging = true;
      this._pan(e.clientX - this._lastPos.x, e.clientY - this._lastPos.y);
      this._lastPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { this._dragging = false; });

    c.addEventListener('contextmenu', e => e.preventDefault());

    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom = Math.max(0.3, Math.min(3, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    }, { passive: false });

    // ── Touch ──────────────────────────────────────────────────────────────
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this._dragging    = true;
        this._dragStarted = false;
        this.wasDragging  = false;
        this._downPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this._lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this._dragging  = false;
        this._pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && this._dragging) {
        const tx = e.touches[0].clientX, ty = e.touches[0].clientY;
        if (!this._dragStarted &&
            Math.hypot(tx - this._downPos.x, ty - this._downPos.y) > DRAG_THRESHOLD) {
          this._dragStarted = true;
        }
        if (this._dragStarted) {
          this.wasDragging = true;
          this._pan(tx - this._lastPos.x, ty - this._lastPos.y);
        }
        this._lastPos = { x: tx, y: ty };
      } else if (e.touches.length === 2 && this._pinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        this.zoom = Math.max(0.3, Math.min(3, this.zoom * (dist / this._pinchDist)));
        this._pinchDist = dist;
      }
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      if (e.touches.length === 0) { this._dragging = false; this._pinchDist = 0; }
    }, { passive: false });

    // ── Keyboard ───────────────────────────────────────────────────────────
    window.addEventListener('keydown', e => { this._keys[e.key] = true; });
    window.addEventListener('keyup',   e => { this._keys[e.key] = false; });
  }

  // Call once per render frame to apply keyboard panning
  updateKeyboard() {
    const speed = KEY_PAN_SPEED / this.zoom;
    const k = this._keys;
    if (k['ArrowLeft']  || k['a'] || k['A']) this.x -= speed;
    if (k['ArrowRight'] || k['d'] || k['D']) this.x += speed;
    if (k['ArrowUp']    || k['w'] || k['W']) this.y -= speed;
    if (k['ArrowDown']  || k['s'] || k['S']) this.y += speed;
  }

  _pan(screenDx, screenDy) {
    const tileW = BASE_TILE_W * this.zoom;
    this.x -= screenDx / (tileW / 2);
    this.y -= screenDy / (tileW / 4);
  }

  screenToTile(sx, sy, tileW, tileH) {
    const cx = this._canvas.width  / 2;
    const cy = this._canvas.height / 2;
    const ox = sx - cx, oy = sy - cy;
    return {
      x: Math.round((ox / tileW + oy / tileH) + this.x),
      y: Math.round((oy / tileH - ox / tileW) + this.y),
    };
  }
}
