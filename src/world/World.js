import { generateTerrain } from './TerrainGen.js';
import { TileType, Tile } from './Tile.js';
import { PlacedStructure } from './PlacedStructure.js';

export class World {
  constructor(width, height, seed = 42) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.tiles = generateTerrain(width, height, seed);
    this.agents = [];     // populated by AgentManager
    this.tick = 0;

    // Map<"x,y", PlacedStructure>
    this.structures = new Map();

    // Skeleton[] — remains of dead agents and animals
    this.skeletons = [];
  }

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.tiles[y][x];
  }

  setTile(x, y, type) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const old = this.tiles[y][x];
    this.tiles[y][x] = new Tile(type, old.elevation);
  }

  // Returns passable neighbours (4-directional) for pathfinding
  neighbours(x, y) {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const result = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const t = this.getTile(nx, ny);
      if (t && t.passable) result.push({ x: nx, y: ny });
    }
    return result;
  }

  // Simple BFS pathfind; returns array of {x,y} or null if unreachable
  findPath(sx, sy, tx, ty, maxSteps = 200) {
    if (sx === tx && sy === ty) return [];
    const goal = `${tx},${ty}`;
    const visited = new Map();
    const queue = [{ x: sx, y: sy, path: [] }];
    visited.set(`${sx},${sy}`, true);

    while (queue.length > 0) {
      const { x, y, path } = queue.shift();
      if (path.length > maxSteps) break;
      for (const n of this.neighbours(x, y)) {
        const key = `${n.x},${n.y}`;
        if (visited.has(key)) continue;
        visited.set(key, true);
        const newPath = [...path, n];
        if (key === goal) return newPath;
        queue.push({ x: n.x, y: n.y, path: newPath });
      }
    }
    return null;
  }

  // Find nearest tile of a given type within radius; returns {x,y} or null
  findNearest(ox, oy, type, radius = 20) {
    let best = null, bestDist = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = ox + dx, ny = oy + dy;
        const t = this.getTile(nx, ny);
        if (t && t.type === type) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestDist) { bestDist = d; best = { x: nx, y: ny }; }
        }
      }
    }
    return best;
  }

  // ── Structure helpers ──────────────────────────────────────────────────────

  _key(x, y) { return `${x},${y}`; }

  getStructure(x, y) {
    return this.structures.get(this._key(x, y)) ?? null;
  }

  placeStructure(x, y, type, agentId) {
    this.structures.set(this._key(x, y), new PlacedStructure(type, agentId, this.tick));
  }

  removeStructure(x, y) {
    this.structures.delete(this._key(x, y));
  }

  // Find nearest structure of a given type within radius; returns {x, y} or null
  findNearestStructure(ox, oy, type, radius = 12) {
    let best = null, bestDist = Infinity;
    for (const [key, s] of this.structures) {
      if (s.type !== type) continue;
      const [sx, sy] = key.split(',').map(Number);
      const d = Math.abs(sx - ox) + Math.abs(sy - oy);
      if (d <= radius && d < bestDist) { bestDist = d; best = { x: sx, y: sy }; }
    }
    return best;
  }

  // Find nearest passable tile whose tile.resource matches the given string
  findNearestWithResource(ox, oy, resource, radius = 30) {
    let best = null, bestDist = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = ox + dx, ny = oy + dy;
        const t = this.getTile(nx, ny);
        if (t && t.passable && t.resource === resource) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestDist) { bestDist = d; best = { x: nx, y: ny }; }
        }
      }
    }
    return best;
  }

  // Whether any adjacent tile (4-dir) is water
  hasAdjacentWater(x, y) {
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const t = this.getTile(x + dx, y + dy);
      if (t && (t.type === TileType.SHALLOW_WATER || t.type === TileType.DEEP_WATER)) return true;
    }
    return false;
  }

  // Called each game tick by the game loop
  update() {
    this.tick++;

    // Decay all structures; remove collapsed ones
    for (const [key, s] of this.structures) {
      s.decay();
      if (!s.intact) this.structures.delete(key);
    }

    // Remove fully decayed skeletons
    this.skeletons = this.skeletons.filter(s => !s.isDecayed(this.tick));
  }
}
