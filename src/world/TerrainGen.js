import { TileType, Tile } from './Tile.js';

// Simple deterministic noise using a seeded LCG + smoothing passes
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildNoiseMap(width, height, rng, scale = 4) {
  const grid = new Float32Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  // Smooth several times to get gentle hills
  for (let pass = 0; pass < scale; pass++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        grid[idx] = (
          grid[idx] * 4 +
          grid[(y - 1) * width + x] +
          grid[(y + 1) * width + x] +
          grid[y * width + (x - 1)] +
          grid[y * width + (x + 1)]
        ) / 8;
      }
    }
  }

  // Normalize to 0–1
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] < min) min = grid[i];
    if (grid[i] > max) max = grid[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < grid.length; i++) grid[i] = (grid[i] - min) / range;

  return grid;
}

function applyIslandMask(elevMap, width, height) {
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.min(cx, cy) * 0.9;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mask = Math.max(0, 1 - (dist / maxDist) ** 1.6);
      elevMap[y * width + x] *= mask;
    }
  }
}

export function generateTerrain(width, height, seed = 42) {
  const rng = seededRng(seed);
  const rng2 = seededRng(seed ^ 0xdeadbeef);

  const elevMap = buildNoiseMap(width, height, rng, 6);
  const moistMap = buildNoiseMap(width, height, rng2, 4);

  applyIslandMask(elevMap, width, height);

  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const e = elevMap[y * width + x];
      const m = moistMap[y * width + x];
      row.push(tileFromElevMoist(e, m));
    }
    tiles.push(row);
  }
  return tiles;
}

function tileFromElevMoist(e, m) {
  let type;
  if (e < 0.22)       type = TileType.DEEP_WATER;
  else if (e < 0.30)  type = TileType.SHALLOW_WATER;
  else if (e < 0.35)  type = TileType.SAND;
  else if (e < 0.72) {
    if (m > 0.65)     type = TileType.FOREST;
    else if (m > 0.3) type = TileType.GRASS;
    else              type = TileType.DIRT;
  } else if (e < 0.88) type = TileType.MOUNTAIN;
  else                  type = TileType.SNOW;

  const tile = new Tile(type, e);
  tile.moisture = m;
  tile.fertility = type === TileType.GRASS || type === TileType.FOREST ? m * 0.8 : 0;
  return tile;
}
