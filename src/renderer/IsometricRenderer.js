import { TILE_DEF }    from '../world/Tile.js';
import { ANIMAL_DEF } from '../animals/Animal.js';

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

  render(world, agents, societies, animals) {
    const { ctx, canvas, camera } = this;
    const tileW = BASE_TILE_W * camera.zoom;
    const tileH = BASE_TILE_H * camera.zoom;
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles and structures back-to-front (painter's algorithm for iso)
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.getTile(x, y);
        if (!tile) continue;

        const { sx, sy } = this._isoProject(x, y, cx, cy, tileW, tileH, camera);

        // Frustum cull
        if (sx < -tileW || sx > canvas.width + tileW) continue;
        if (sy < -tileH * 4 || sy > canvas.height + tileH) continue;

        this._drawTile(ctx, tile, sx, sy, tileW, tileH);

        const structure = world.getStructure(x, y);
        if (structure && structure.intact) {
          this._drawStructure(ctx, structure, tile, sx, sy, tileW, tileH);
        }
      }
    }

    // Draw skeletons (on ground, under entities)
    for (const skeleton of world.skeletons) {
      const { sx, sy } = this._isoProject(skeleton.x, skeleton.y, cx, cy, tileW, tileH, camera);
      if (sx < -tileW || sx > canvas.width + tileW) continue;
      const tile = world.getTile(skeleton.x, skeleton.y);
      const elevOffset = tile ? Math.round(tile.elevation * 12 * (tileH / BASE_TILE_H)) : 0;
      this._drawSkeleton(ctx, skeleton, sx, sy, tileW, tileH, elevOffset, world.tick);
    }

    // Draw animals
    for (const animal of animals) {
      if (!animal.alive) continue;
      const { sx, sy } = this._isoProject(animal.x, animal.y, cx, cy, tileW, tileH, camera);
      if (sx < -tileW || sx > canvas.width + tileW) continue;
      this._drawAnimal(ctx, animal, sx, sy, tileW, tileH);
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

  _drawStructure(ctx, structure, tile, sx, sy, tileW, tileH) {
    const elevOffset = Math.round(tile.elevation * 12 * (tileH / BASE_TILE_H));
    const cx = sx + tileW / 2;
    const ty = sy - elevOffset;
    const health = structure.healthFraction;

    // Fade slightly when damaged
    ctx.globalAlpha = 0.5 + health * 0.5;

    switch (structure.type) {
      case 'campfire': {
        // Stone ring
        ctx.beginPath();
        ctx.ellipse(cx, ty - tileH * 0.1, tileW * 0.13, tileH * 0.13, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
        // Fire glow
        ctx.beginPath();
        ctx.ellipse(cx, ty - tileH * 0.18, tileW * 0.07, tileH * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e86020';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, ty - tileH * 0.22, tileW * 0.04, tileH * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffe060';
        ctx.fill();
        break;
      }
      case 'shelter': {
        // Simple hut: back wall + roof
        const w = tileW * 0.38, h = tileH * 0.55;
        // Back wall
        ctx.beginPath();
        ctx.rect(cx - w / 2, ty - tileH * 0.6 - h, w, h);
        ctx.fillStyle = '#7a5230';
        ctx.fill();
        // Roof triangle
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 - 4, ty - tileH * 0.6 - h);
        ctx.lineTo(cx,              ty - tileH * 0.6 - h - tileH * 0.35);
        ctx.lineTo(cx + w / 2 + 4, ty - tileH * 0.6 - h);
        ctx.closePath();
        ctx.fillStyle = '#5a3a1a';
        ctx.fill();
        break;
      }
      case 'farm': {
        // Green furrow lines across the tile top
        ctx.strokeStyle = '#5ab040';
        ctx.lineWidth   = Math.max(1, tileW * 0.025);
        for (let i = 1; i <= 3; i++) {
          const t = i / 4;
          // Interpolate along the top face diamond
          const lx = sx + tileW * t;
          const ly = ty - tileH / 2 + tileH * t;
          const rx = sx + tileW * t;
          const ry = ty + tileH / 2 - tileH * t;
          ctx.beginPath();
          ctx.moveTo(lx - tileW * 0.25, ly);
          ctx.lineTo(rx + tileW * 0.25, ry - tileH * 0.25);
          ctx.stroke();
        }
        // Small crop dots
        ctx.fillStyle = '#80d050';
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const ex = cx + Math.cos(angle) * tileW * 0.14;
          const ey = (ty - tileH * 0.05) + Math.sin(angle) * tileH * 0.1;
          ctx.beginPath();
          ctx.arc(ex, ey - tileH * 0.15, tileW * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'fishing_dock': {
        // Horizontal dock planks
        ctx.strokeStyle = '#8a6030';
        ctx.lineWidth   = Math.max(1, tileW * 0.04);
        for (let i = 0; i < 3; i++) {
          const t = 0.3 + i * 0.2;
          ctx.beginPath();
          ctx.moveTo(sx + tileW * t - tileW * 0.15, ty - tileH * 0.1 + tileH * t * 0.5);
          ctx.lineTo(sx + tileW * t + tileW * 0.15, ty - tileH * 0.1 + tileH * t * 0.5);
          ctx.stroke();
        }
        // Vertical post
        ctx.beginPath();
        ctx.moveTo(cx, ty - tileH * 0.05);
        ctx.lineTo(cx, ty - tileH * 0.05 - tileH * 0.4);
        ctx.stroke();
        break;
      }
    }

    ctx.globalAlpha = 1;

    // Health bar if damaged
    if (health < 0.8) {
      const bw = tileW * 0.4;
      const bx = cx - bw / 2;
      const by = ty - tileH * 0.85;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = `hsl(${health * 120}, 80%, 50%)`;
      ctx.fillRect(bx, by, bw * health, 3);
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

  _drawAnimal(ctx, animal, sx, sy, tileW, tileH) {
    const def  = ANIMAL_DEF[animal.type];
    const r    = Math.max(2, tileW * def.drawSize);
    const ax   = sx + tileW / 2;
    const ay   = sy - r * 0.4;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(ax, ay + r * 0.5, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();

    // Body
    ctx.beginPath();
    if (animal.type === 'wolf') {
      // Elongated oval for wolf
      ctx.ellipse(ax, ay, r * 1.4, r * 0.8, Math.PI * 0.08, 0, Math.PI * 2);
    } else {
      ctx.arc(ax, ay, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.strokeStyle = def.highlightColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rabbit ears (two tiny dots above)
    if (animal.type === 'rabbit') {
      ctx.fillStyle = def.highlightColor;
      ctx.beginPath(); ctx.arc(ax - r * 0.3, ay - r * 1.0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ax + r * 0.3, ay - r * 1.0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }

    // Wolf eyes (two small dots)
    if (animal.type === 'wolf') {
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath(); ctx.arc(ax - r * 0.4, ay - r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ax + r * 0.4, ay - r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
    }

    // Health bar if damaged
    if (animal.health < animal.maxHealth) {
      const bw  = r * 2.2;
      const bx  = ax - bw / 2;
      const by  = ay - r - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = `hsl(${(animal.health / animal.maxHealth) * 120}, 80%, 50%)`;
      ctx.fillRect(bx, by, bw * (animal.health / animal.maxHealth), 3);
    }
  }

  _drawSkeleton(ctx, skeleton, sx, sy, tileW, tileH, elevOffset, tick) {
    const ax = sx + tileW / 2;
    const ay = sy - elevOffset - tileH * 0.05;
    const r  = Math.max(2, tileW * 0.06);

    const fade = 1 - skeleton.decayFraction(tick) * 0.75;
    ctx.globalAlpha = fade;

    // Bone cross
    const boneColor = skeleton.isAgent ? '#e8e0cc' : '#c8b898';
    ctx.strokeStyle = boneColor;
    ctx.lineWidth   = Math.max(1, r * 0.7);
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(ax - r, ay); ctx.lineTo(ax + r, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay - r); ctx.lineTo(ax, ay + r);
    ctx.stroke();

    // Skull dot
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    ctx.arc(ax, ay - r * 1.1, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.lineCap     = 'butt';
  }

  // Returns the agent closest to the given screen position, within a pixel radius
  getAgentAt(screenX, screenY, agents, pixelRadius = 14) {
    return this._nearestEntity(screenX, screenY, agents, pixelRadius,
      a => a.alive);
  }

  getAnimalAt(screenX, screenY, animals, pixelRadius = 12) {
    return this._nearestEntity(screenX, screenY, animals, pixelRadius,
      a => a.alive);
  }

  // Returns nearest skeleton to a clicked tile (same tile match)
  getSkeletonAt(screenX, screenY, world) {
    const hit = this.getTileAt(screenX, screenY, world);
    if (!hit) return null;
    return world.skeletons.find(s => s.x === hit.x && s.y === hit.y) ?? null;
  }

  _nearestEntity(screenX, screenY, list, radius, filter) {
    const { canvas, camera } = this;
    const tileW = BASE_TILE_W * camera.zoom;
    const tileH = BASE_TILE_H * camera.zoom;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    let best = null, bestDist = radius;
    for (const item of list) {
      if (!filter(item)) continue;
      const { sx, sy } = this._isoProject(item.x, item.y, cx, cy, tileW, tileH, camera);
      const d = Math.hypot(screenX - (sx + tileW / 2), screenY - sy);
      if (d < bestDist) { bestDist = d; best = item; }
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
