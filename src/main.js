import { World }               from './world/World.js';
import { Agent }               from './agents/Agent.js';
import { Brain }               from './agents/Brain.js';
import { IsometricRenderer }   from './renderer/IsometricRenderer.js';
import { Camera }              from './renderer/Camera.js';
import { SocietyTracker }      from './societies/Society.js';
import { UI }                  from './ui/UI.js';
import { Inspector }           from './ui/Inspector.js';
import { TileType }            from './world/Tile.js';
import { tickReproduction }    from './agents/Reproduction.js';
import { EventSystem }         from './world/Events.js';
import { Animal, AnimalType, ANIMAL_DEF } from './animals/Animal.js';
import { updateAnimal }        from './animals/AnimalBrain.js';
import { Skeleton }            from './world/Skeleton.js';

// ── Config ──────────────────────────────────────────────────────────────────
const WORLD_W        = 64;
const WORLD_H        = 64;
const SEED           = Date.now() & 0xffff;
const INITIAL_AGENTS = 20;
const TICK_MS        = 50;

// Initial animal counts
const INITIAL_DEER   = 10;
const INITIAL_RABBITS = 8;
const INITIAL_WOLVES  = 4;

// ── Bootstrap ────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('world-canvas');
const camera   = new Camera(canvas);
const renderer = new IsometricRenderer(canvas, camera);

const world    = new World(WORLD_W, WORLD_H, SEED);
const societies = new SocietyTracker();
const events   = new EventSystem();
const brains   = new Map();

let agents  = [];
let animals = [];
let activeTool  = 'inspect';
let speedFactor = 1;
let lastTickTime = performance.now();

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => renderer.resize());
renderer.resize();

// ── Spawn helpers ─────────────────────────────────────────────────────────────
function spawnAgent(x, y) {
  const agent = new Agent(x, y);
  agents.push(agent);
  brains.set(agent.id, new Brain());
  return agent;
}

function spawnAnimal(type, x, y) {
  const animal = new Animal(type, x, y);
  animals.push(animal);
  return animal;
}

// Find a passable tile of preferred types scattered around the world
function findSpawnTile(preferredTypes) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = Math.floor(Math.random() * WORLD_W);
    const y = Math.floor(Math.random() * WORLD_H);
    const tile = world.getTile(x, y);
    if (tile && tile.passable && preferredTypes.includes(tile.type)) return { x, y };
  }
  return null;
}

// ── Seed world ────────────────────────────────────────────────────────────────
(function seedAgents() {
  let placed = 0;
  const cx = Math.floor(WORLD_W / 2), cy = Math.floor(WORLD_H / 2);
  for (let r = 1; r < 20 && placed < INITIAL_AGENTS; r++) {
    for (let angle = 0; angle < Math.PI * 2 && placed < INITIAL_AGENTS; angle += 0.5) {
      const x = Math.round(cx + r * Math.cos(angle));
      const y = Math.round(cy + r * Math.sin(angle));
      const tile = world.getTile(x, y);
      if (tile && tile.passable) { spawnAgent(x, y); placed++; }
    }
  }
})();

(function seedAnimals() {
  const deerDef   = ANIMAL_DEF.deer;
  const rabbitDef = ANIMAL_DEF.rabbit;
  const wolfDef   = ANIMAL_DEF.wolf;

  for (let i = 0; i < INITIAL_DEER; i++) {
    const pos = findSpawnTile(deerDef.preferredTiles);
    if (pos) spawnAnimal(AnimalType.DEER, pos.x, pos.y);
  }
  for (let i = 0; i < INITIAL_RABBITS; i++) {
    const pos = findSpawnTile(rabbitDef.preferredTiles);
    if (pos) spawnAnimal(AnimalType.RABBIT, pos.x, pos.y);
  }
  for (let i = 0; i < INITIAL_WOLVES; i++) {
    const pos = findSpawnTile(wolfDef.preferredTiles);
    if (pos) spawnAnimal(AnimalType.WOLF, pos.x, pos.y);
  }
})();

// ── UI wiring ────────────────────────────────────────────────────────────────
const inspector = new Inspector();
const ui = new UI(
  tool  => { activeTool  = tool; },
  speed => { speedFactor = speed; }
);

canvas.addEventListener('click', e => {
  if (camera.wasDragging) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (activeTool === 'inspect') {
    const agent = renderer.getAgentAt(sx, sy, agents);
    if (agent) { inspector.showAgent(agent, societies.societies); return; }

    const animal = renderer.getAnimalAt(sx, sy, animals);
    if (animal) { inspector.showAnimal(animal); return; }

    const skeleton = renderer.getSkeletonAt(sx, sy, world);
    if (skeleton) { inspector.showSkeleton(skeleton, world.tick); return; }

    const hit = renderer.getTileAt(sx, sy, world);
    if (hit) inspector.showTile(hit.x, hit.y, hit.tile, world.getStructure(hit.x, hit.y));
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

  // Agent hunting: check before Brain so hunger-seeking agents can intercept prey
  handleHunting();

  // Update agents
  for (const agent of agents) {
    const brain = brains.get(agent.id);
    if (brain) brain.update(agent, world, agents, world.tick);
    agent.tick(world, agents);
  }

  // Update animals
  for (const animal of animals) {
    updateAnimal(animal, world, agents, animals);
  }

  // Reproduction
  tickReproduction(agents, world, spawnAgent);

  // Reap dead agents → skeletons
  agents = agents.filter(a => {
    if (!a.alive) {
      brains.delete(a.id);
      world.skeletons.push(new Skeleton('agent', a.x, a.y, world.tick, {
        agentId:        a.id,
        agentAge:       a.age,
        corpusSnapshot: a.corpus.snapshot(),
      }));
      return false;
    }
    return true;
  });

  // Reap dead animals → skeletons
  animals = animals.filter(a => {
    if (!a.alive) {
      world.skeletons.push(new Skeleton(a.type, a.x, a.y, world.tick));
      return false;
    }
    return true;
  });

  // Society clustering
  societies.update(agents, world.tick);

  // Random world events
  events.update(world, agents, spawnAgent);

  // HUD
  ui.update(agents.length, world.tick, societies.count, events.recentEvents);
}

// Agent hunting interactions (separate from Brain to keep cross-system logic here)
function handleHunting() {
  for (const agent of agents) {
    if (!agent.alive || agent.hunger > 0.65) continue;

    // Catch prey on the same tile
    const prey = animals.find(a => a.alive && a.isPrey && a.x === agent.x && a.y === agent.y);
    if (prey) {
      const stoneMastery = agent.corpus.getMastery('stone_tools');
      if (Math.random() < 0.12 + stoneMastery * 0.30) {
        prey.takeDamage(1);
        if (!prey.alive) {
          agent.hunger = Math.min(1, agent.hunger + ANIMAL_DEF[prey.type].foodValue);
          agent.corpus.use('stone_tools');
        }
      }
      continue;
    }

    // Seek nearest prey if very hungry and currently idle
    if (agent.hunger < 0.35 && !agent.hasPath) {
      let best = null, bestDist = 14;
      for (const a of animals) {
        if (!a.alive || !a.isPrey) continue;
        const d = Math.abs(a.x - agent.x) + Math.abs(a.y - agent.y);
        if (d < bestDist) { bestDist = d; best = a; }
      }
      if (best) {
        const path = world.findPath(agent.x, agent.y, best.x, best.y);
        if (path) agent.setPath(path);
      }
    }
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
let _tickAccum = 0;

function loop(now) {
  requestAnimationFrame(loop);

  const dt = now - lastTickTime;
  lastTickTime = now;

  if (speedFactor > 0) {
    _tickAccum += dt * speedFactor;
    while (_tickAccum >= TICK_MS) {
      simTick();
      _tickAccum -= TICK_MS;
    }
  }

  camera.updateKeyboard();
  renderer.render(world, agents, societies.societies, animals);
}

requestAnimationFrame(loop);
