import { World }               from './world/World.js';
import { Agent }               from './agents/Agent.js';
import { Brain }               from './agents/Brain.js';
import { IsometricRenderer }   from './renderer/IsometricRenderer.js';
import { Camera }              from './renderer/Camera.js';
import { SocietyTracker }      from './societies/Society.js';
import { UI }                  from './ui/UI.js';
import { Inspector }           from './ui/Inspector.js';
import { TileType }            from './world/Tile.js';

// ── Config ──────────────────────────────────────────────────────────────────
const WORLD_W       = 64;
const WORLD_H       = 64;
const SEED          = Date.now() & 0xffff;
const INITIAL_AGENTS = 20;
const TICK_MS       = 50;   // ms per sim tick at speed 1

// ── Bootstrap ────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('world-canvas');
const camera   = new Camera(canvas);
const renderer = new IsometricRenderer(canvas, camera);

const world    = new World(WORLD_W, WORLD_H, SEED);
const societies = new SocietyTracker();
const brains   = new Map();   // agentId -> Brain

let agents = [];
let activeTool  = 'inspect';
let speedFactor = 1;
let lastTickTime = performance.now();

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  renderer.resize();
}
window.addEventListener('resize', resize);
resize();

// ── Spawn initial agents on passable grass/forest tiles ──────────────────────
function spawnAgent(x, y) {
  const agent = new Agent(x, y);
  const brain = new Brain();
  agents.push(agent);
  brains.set(agent.id, brain);
  return agent;
}

(function seedAgents() {
  let placed = 0;
  const cx = Math.floor(WORLD_W / 2), cy = Math.floor(WORLD_H / 2);
  for (let r = 1; r < 20 && placed < INITIAL_AGENTS; r++) {
    for (let angle = 0; angle < Math.PI * 2 && placed < INITIAL_AGENTS; angle += 0.5) {
      const x = Math.round(cx + r * Math.cos(angle));
      const y = Math.round(cy + r * Math.sin(angle));
      const tile = world.getTile(x, y);
      if (tile && tile.passable) {
        spawnAgent(x, y);
        placed++;
      }
    }
  }
})();

// ── UI wiring ────────────────────────────────────────────────────────────────
const inspector = new Inspector();
const ui = new UI(
  tool => { activeTool = tool; },
  speed => { speedFactor = speed; }
);

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (activeTool === 'inspect') {
    const agent = renderer.getAgentAt(sx, sy, agents);
    if (agent) {
      inspector.showAgent(agent, societies.societies);
      return;
    }
    const hit = renderer.getTileAt(sx, sy, world);
    if (hit) inspector.showTile(hit.x, hit.y, hit.tile);
    return;
  }

  const hit = renderer.getTileAt(sx, sy, world);
  if (!hit) return;

  if (activeTool === 'place-agent') {
    if (hit.tile.passable) spawnAgent(hit.x, hit.y);
    return;
  }

  const typeMap = {
    'place-forest':   TileType.FOREST,
    'place-water':    TileType.SHALLOW_WATER,
    'place-mountain': TileType.MOUNTAIN,
  };
  const type = typeMap[activeTool];
  if (type) world.setTile(hit.x, hit.y, type);
});

// ── Sim tick ─────────────────────────────────────────────────────────────────
function simTick() {
  if (speedFactor === 0) return;

  world.update();

  // Update all agents
  for (const agent of agents) {
    const brain = brains.get(agent.id);
    if (brain) brain.update(agent, world, agents, world.tick);
    agent.tick(world, agents);
  }

  // Reap dead agents
  agents = agents.filter(a => {
    if (!a.alive) { brains.delete(a.id); return false; }
    return true;
  });

  // Society clustering
  societies.update(agents, world.tick);

  // Update HUD
  ui.update(agents.length, world.tick, societies.count);
}

// ── Render loop ───────────────────────────────────────────────────────────────
let _tickAccum = 0;

function loop(now) {
  requestAnimationFrame(loop);

  const dt = now - lastTickTime;
  lastTickTime = now;

  if (speedFactor > 0) {
    _tickAccum += dt * speedFactor;
    const tickInterval = TICK_MS;
    while (_tickAccum >= tickInterval) {
      simTick();
      _tickAccum -= tickInterval;
    }
  }

  renderer.render(world, agents, societies.societies);
}

requestAnimationFrame(loop);
