import { generateTerrain } from './TerrainGen.js';
import { TileType, Tile } from './Tile.js';

export class World {
  constructor(width, height, seed = 42) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.tiles = generateTerrain(width, height, seed);
    this.agents = [];     // populated by AgentManager
    this.tick = 0;
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

  // Called each game tick by the game loop
  update() {
    this.tick++;
    // Future: resource regrowth, weather, etc.
  }
}
