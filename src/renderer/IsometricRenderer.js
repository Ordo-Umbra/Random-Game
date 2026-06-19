import { TILE_DEF } from '../world/Tile.js';

const BASE_TILE_W = 64;
const BASE_TILE_H = 32;
const AGENT_COLORS = [
  '#e05050', '#50a0e0', '#50c050', '#e0a030',
  '#c050e0', '#50e0d0', '#e07050', '#a0a0ff',
];

export class IsometricRenderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.camera = camera;
  }

  resize() {
    this.canvas.width  = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  render(world, agents, societies) {
    const { ctx, canvas, camera } = this;
    const tileW = BASE_TILE_W * camera.zoom;
    const tileH = BASE_TILE_H * camera.zoom;
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles back-to-front (painter's algorithm for iso)
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.getTile(x, y);
        if (!tile) continue;

        const { sx, sy } = this._isoProject(x, y, cx, cy, tileW, tileH, camera);

        // Frustum cull
        if (sx < -tileW || sx > canvas.width + tileW) continue;
        if (sy < -tileH * 4 || sy > canvas.height + tileH) continue;

        this._drawTile(ctx, tile, sx, sy, tileW, tileH);
      }
    }

    // Draw agents
    for (const agent of agents) {
      if (!agent.alive) continue;
      const { sx, sy } = this._isoProject(agent.x, agent.y, cx, cy, tileW, tileH, camera);
      if (sx < -tileW || sx > canvas.width + tileW) continue;
      this._drawAgent(ctx, agent, sx, sy, tileW, tileH, societies);
    }
  }

  _isoProject(tx, ty, cx, cy, tileW, tileH, camera) {
    const rx = tx - camera.x;
    const ry = ty - camera.y;
    const sx = cx + (rx - ry) * (tileW / 2);
    const sy = cy + (rx + ry) * (tileH / 2);
    return { sx, sy };
  }

  _drawTile(ctx, tile, sx, sy, tileW, tileH) {
    const def = TILE_DEF[tile.type];
    const elevOffset = Math.round(tile.elevation * 12 * (tileH / BASE_TILE_H));

    // Side face (darker)
    ctx.beginPath();
    ctx.moveTo(sx,              sy - elevOffset);
    ctx.lineTo(sx + tileW / 2, sy + tileH / 2 - elevOffset);
    ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
    ctx.lineTo(sx,              sy);
    ctx.closePath();
    ctx.fillStyle = shadeColor(def.color, -30);
    ctx.fill();

    // Right side face
    ctx.beginPath();
    ctx.moveTo(sx + tileW / 2, sy + tileH / 2 - elevOffset);
    ctx.lineTo(sx + tileW,     sy - elevOffset);
    ctx.lineTo(sx + tileW,     sy);
    ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
    ctx.closePath();
    ctx.fillStyle = shadeColor(def.color, -50);
    ctx.fill();

    // Top face
    ctx.beginPath();
    ctx.moveTo(sx,              sy - elevOffset);
    ctx.lineTo(sx + tileW / 2, sy - tileH / 2 - elevOffset);
    ctx.lineTo(sx + tileW,     sy - elevOffset);
    ctx.lineTo(sx + tileW / 2, sy + tileH / 2 - elevOffset);
    ctx.closePath();
    ctx.fillStyle = def.topColor;
    ctx.fill();

    // Forest: draw simple tree dots
    if (tile.type === 'forest') {
      const r = tileH * 0.32;
      ctx.beginPath();
      ctx.arc(sx + tileW / 2, sy - tileH * 0.8 - elevOffset, r, 0, Math.PI * 2);
      ctx.fillStyle = '#2d7a2d';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + tileW / 2, sy - tileH * 0.8 - elevOffset, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#3a9a3a';
      ctx.fill();
    }

    // Mountain: draw peak triangle
    if (tile.type === 'mountain' || tile.type === 'snow') {
      const peakColor = tile.type === 'snow' ? '#e0e8f0' : '#aaaaaa';
      ctx.beginPath();
      ctx.moveTo(sx + tileW / 2, sy - tileH * 1.5 - elevOffset);
      ctx.lineTo(sx + tileW * 0.25, sy - tileH * 0.5 - elevOffset);
      ctx.lineTo(sx + tileW * 0.75, sy - tileH * 0.5 - elevOffset);
      ctx.closePath();
      ctx.fillStyle = peakColor;
      ctx.fill();
    }
  }

  _drawAgent(ctx, agent, sx, sy, tileW, tileH, societies) {
    const r = Math.max(3, tileW * 0.1);
    const ax = sx + tileW / 2;
    const ay = sy - r * 0.5;

    // Society color ring
    const societyColor = agent.societyId !== null
      ? AGENT_COLORS[agent.societyId % AGENT_COLORS.length]
      : '#888888';

    ctx.beginPath();
    ctx.arc(ax, ay, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = societyColor + '66';
    ctx.fill();

    // Agent body
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${agent._hue}, 60%, 65%)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hunger indicator (tiny bar below)
    if (agent.hunger < 0.5) {
      const bw = r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ax - r, ay + r + 2, bw, 3);
      ctx.fillStyle = `hsl(${agent.hunger * 120}, 80%, 50%)`;
      ctx.fillRect(ax - r, ay + r + 2, bw * agent.hunger, 3);
    }
  }

  // Returns the tile coordinates under the given screen position
  getTileAt(screenX, screenY, world) {
    const { canvas, camera } = this;
    const tileW = BASE_TILE_W * camera.zoom;
    const tileH = BASE_TILE_H * camera.zoom;
    const { x, y } = camera.screenToTile(screenX, screenY, tileW, tileH);
    if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null;
    return { x, y, tile: world.getTile(x, y) };
  }

  // Returns the agent closest to the given screen position, within a pixel radius
  getAgentAt(screenX, screenY, agents, pixelRadius = 14) {
    const { canvas, camera } = this;
    const tileW = BASE_TILE_W * camera.zoom;
    const tileH = BASE_TILE_H * camera.zoom;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    let best = null, bestDist = pixelRadius;
    for (const agent of agents) {
      if (!agent.alive) continue;
      const { sx, sy } = this._isoProject(agent.x, agent.y, cx, cy, tileW, tileH, camera);
      const ax = sx + tileW / 2, ay = sy;
      const d = Math.hypot(screenX - ax, screenY - ay);
      if (d < bestDist) { bestDist = d; best = agent; }
    }
    return best;
  }
}

// Lighten (+) or darken (-) a hex color by amt
function shadeColor(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16) + amt;
  let g = parseInt(hex.slice(3, 5), 16) + amt;
  let b = parseInt(hex.slice(5, 7), 16) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}
