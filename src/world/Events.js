import { TileType }              from './Tile.js';
import { StructureId, STRUCTURE_DEF } from '../knowledge/Structure.js';
import { STRUCTURE_BUILD_DEF }   from './PlacedStructure.js';

const EVENT_INTERVAL = 300;  // ticks between checks
const EVENT_CHANCE   = 0.45; // probability per check

// All 10 event type keys
const TYPES = [
  'wildfire',
  'flood',
  'drought',
  'meteor_strike',
  'plague',
  'storm',
  'bountiful_season',
  'migration',
  'knowledge_spark',
  'ancient_ruins',
];

export class EventSystem {
  constructor() {
    this._timer = 0;
    // Public: last N events for UI display
    this.recentEvents = [];
  }

  update(world, agents, spawnAgent) {
    this._timer++;
    if (this._timer < EVENT_INTERVAL) return;
    this._timer = 0;
    if (Math.random() > EVENT_CHANCE) return;

    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const cx = Math.floor(Math.random() * world.width);
    const cy = Math.floor(Math.random() * world.height);

    const result = this._dispatch(type, world, agents, spawnAgent, cx, cy);
    if (result) {
      this.recentEvents.unshift({ tick: world.tick, ...result });
      if (this.recentEvents.length > 4) this.recentEvents.pop();
    }
  }

  _dispatch(type, world, agents, spawnAgent, cx, cy) {
    switch (type) {
      case 'wildfire':        return wildfire(world, cx, cy);
      case 'flood':           return flood(world, cx, cy);
      case 'drought':         return drought(world, cx, cy);
      case 'meteor_strike':   return meteorStrike(world, agents, cx, cy);
      case 'plague':          return plague(agents, cx, cy);
      case 'storm':           return storm(agents);
      case 'bountiful_season':return bountifulSeason(agents);
      case 'migration':       return migration(world, agents, spawnAgent);
      case 'knowledge_spark': return knowledgeSpark(agents, cx, cy);
      case 'ancient_ruins':   return ancientRuins(world, cx, cy);
      default:                return null;
    }
  }
}

// ── Event implementations ────────────────────────────────────────────────────

function wildfire(world, cx, cy) {
  const origin = world.findNearest(cx, cy, TileType.FOREST, 25);
  if (!origin) return null;
  const radius = 3 + Math.floor(Math.random() * 5);
  let burned = 0;
  scatter(origin.x, origin.y, radius, 0.6, (nx, ny) => {
    const t = world.getTile(nx, ny);
    if (t && (t.type === TileType.FOREST || t.type === TileType.GRASS)) {
      world.setTile(nx, ny, TileType.DIRT);
      world.removeStructure(nx, ny);
      burned++;
    }
  });
  return burned > 0
    ? { name: '🔥 Wildfire', desc: `A wildfire consumed ${burned} tiles` }
    : null;
}

function flood(world, cx, cy) {
  const origin = world.findNearest(cx, cy, TileType.SHALLOW_WATER, 25)
    || world.findNearest(cx, cy, TileType.DEEP_WATER, 25);
  if (!origin) return null;
  const radius = 2 + Math.floor(Math.random() * 4);
  let flooded = 0;
  scatter(origin.x, origin.y, radius, 0.55, (nx, ny) => {
    const t = world.getTile(nx, ny);
    if (t && [TileType.GRASS, TileType.DIRT, TileType.SAND].includes(t.type)) {
      world.setTile(nx, ny, TileType.SHALLOW_WATER);
      world.removeStructure(nx, ny);
      flooded++;
    }
  });
  return flooded > 0
    ? { name: '🌊 Flood', desc: `Floodwaters swallowed ${flooded} tiles` }
    : null;
}

function drought(world, cx, cy) {
  const origin = world.findNearest(cx, cy, TileType.GRASS, 25);
  if (!origin) return null;
  const radius = 5 + Math.floor(Math.random() * 6);
  let dried = 0;
  scatter(origin.x, origin.y, radius, 0.55, (nx, ny) => {
    const t = world.getTile(nx, ny);
    if (t && t.type === TileType.GRASS) {
      world.setTile(nx, ny, TileType.DIRT);
      dried++;
    }
  });
  return dried > 0
    ? { name: '☀️ Drought', desc: `A drought parched ${dried} grassland tiles` }
    : null;
}

function meteorStrike(world, agents, cx, cy) {
  // Pick a non-deep-water tile near the random point
  let tx = cx, ty = cy;
  for (let i = 0; i < 30; i++) {
    const t = world.getTile(tx, ty);
    if (t && t.type !== TileType.DEEP_WATER) break;
    tx = Math.floor(Math.random() * world.width);
    ty = Math.floor(Math.random() * world.height);
  }
  const radius = 1 + Math.floor(Math.random() * 2);
  let killed = 0;
  scatter(tx, ty, radius, 1.0, (nx, ny) => {
    world.setTile(nx, ny, TileType.MOUNTAIN);
    world.removeStructure(nx, ny);
    for (const a of agents) {
      if (a.x === nx && a.y === ny && a.alive) { a.hunger = 0; killed++; }
    }
  });
  return { name: '☄️ Meteor Strike', desc: `Impact at (${tx},${ty}) — ${killed} killed` };
}

function plague(agents, cx, cy) {
  const radius = 14;
  let hit = 0;
  for (const a of agents) {
    if (Math.abs(a.x - cx) + Math.abs(a.y - cy) <= radius) {
      a.hunger = Math.max(0.05, a.hunger - 0.45);
      hit++;
    }
  }
  return hit > 0 ? { name: '🦠 Plague', desc: `Sickness struck ${hit} agents` } : null;
}

function storm(agents) {
  let hit = 0;
  for (const a of agents) {
    if (a.alive) { a.energy = Math.max(0.05, a.energy - 0.4); hit++; }
  }
  return { name: '⛈️ Storm', desc: `A great storm exhausted ${hit} agents` };
}

function bountifulSeason(agents) {
  let fed = 0;
  for (const a of agents) {
    if (a.alive) { a.hunger = Math.min(1, a.hunger + 0.5); fed++; }
  }
  return { name: '🌾 Bountiful Season', desc: `A bumper harvest fed ${fed} agents` };
}

function migration(world, agents, spawnAgent) {
  const count = 4 + Math.floor(Math.random() * 6);
  const structIds = Object.values(StructureId);
  let spawned = 0;

  for (let attempt = 0; attempt < count * 8 && spawned < count; attempt++) {
    const edge = Math.floor(Math.random() * 4);
    const x = edge < 2 ? Math.floor(Math.random() * world.width)  : (edge === 2 ? 0 : world.width  - 1);
    const y = edge < 2 ? (edge === 0 ? 0 : world.height - 1)      : Math.floor(Math.random() * world.height);
    const tile = world.getTile(x, y);
    if (!tile || !tile.passable) continue;

    const agent = spawnAgent(x, y);
    const kCount = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < kCount; k++) {
      const id  = structIds[Math.floor(Math.random() * structIds.length)];
      const def = STRUCTURE_DEF[id];
      if (!def.prereqs.length || Math.random() < 0.3) {
        agent.corpus.addMastery(id, 0.2 + Math.random() * 0.5);
      }
    }
    spawned++;
  }
  return spawned > 0
    ? { name: '🚶 Migration', desc: `${spawned} migrants arrived from afar` }
    : null;
}

function knowledgeSpark(agents, cx, cy) {
  const radius    = 10;
  const structIds = Object.values(StructureId);
  const targetId  = structIds[Math.floor(Math.random() * structIds.length)];
  const def       = STRUCTURE_DEF[targetId];

  let sparked = 0;
  for (const a of agents) {
    if (!a.alive) continue;
    if (Math.abs(a.x - cx) + Math.abs(a.y - cy) > radius) continue;
    if (Math.random() > 0.55) continue;
    const prereqsMet = def.prereqs.every(p => a.corpus.getMastery(p) > 0.1);
    if (prereqsMet || !def.prereqs.length) {
      a.corpus.addMastery(targetId, 0.15 + Math.random() * 0.25);
      sparked++;
    }
  }
  return sparked > 0
    ? { name: '💡 Knowledge Spark', desc: `${sparked} agents gained insight into ${def.name}` }
    : null;
}

function ancientRuins(world, cx, cy) {
  const buildTypes = Object.keys(STRUCTURE_BUILD_DEF);
  const type = buildTypes[Math.floor(Math.random() * buildTypes.length)];
  const def  = STRUCTURE_BUILD_DEF[type];

  for (let i = 0; i < 40; i++) {
    const nx = cx + Math.floor(Math.random() * 24 - 12);
    const ny = cy + Math.floor(Math.random() * 24 - 12);
    const tile = world.getTile(nx, ny);
    if (!tile || !tile.passable) continue;
    if (!def.allowedTiles.includes(tile.type)) continue;
    if (def.requiresAdjacentWater && !world.hasAdjacentWater(nx, ny)) continue;
    if (world.getStructure(nx, ny)) continue;

    world.placeStructure(nx, ny, type, -1); // -1 = ancient, no builder
    return { name: '🏛️ Ancient Ruins', desc: `A ruined ${def.name} emerged from the earth` };
  }
  return null;
}

// Helper: iterate tiles in a rough circle with random scatter
function scatter(cx, cy, radius, density, fn) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      if (Math.random() > density) continue;
      fn(cx + dx, cy + dy);
    }
  }
}
