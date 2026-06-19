import { ANIMAL_DEF } from './Animal.js';

export function updateAnimal(animal, world, agents, allAnimals) {
  if (!animal.alive) return;
  animal.age++;
  animal._moveTimer++;

  if (animal.isPrey) {
    updatePrey(animal, world, agents);
  } else {
    updateWolf(animal, world, agents, allAnimals);
  }
}

// ── Prey (deer / rabbit) ─────────────────────────────────────────────────────

function updatePrey(animal, world, agents) {
  const def = ANIMAL_DEF[animal.type];

  // Find nearest threatening agent
  let threat = null, threatDist = def.fleeRange + 1;
  for (const a of agents) {
    if (!a.alive) continue;
    const d = Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y);
    if (d <= def.fleeRange && d < threatDist) { threat = a; threatDist = d; }
  }

  if (threat) {
    animal.state = 'flee';
    if (animal._moveTimer >= def.moveEvery) {
      animal._moveTimer = 0;
      // Move in direction away from threat
      const dx = animal.x - threat.x;
      const dy = animal.y - threat.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const tx = clamp(Math.round(animal.x + (dx / len) * 5), 0, world.width  - 1);
      const ty = clamp(Math.round(animal.y + (dy / len) * 5), 0, world.height - 1);
      const tile = world.getTile(tx, ty);
      if (tile && tile.passable) {
        const path = world.findPath(animal.x, animal.y, tx, ty, 25);
        if (path) { animal.clearPath(); animal.setPath(path); }
      }
      animal.stepPath();
    }
    return;
  }

  animal.state = 'wander';
  if (animal._moveTimer >= def.moveEvery) {
    animal._moveTimer = 0;
    if (animal.hasPath) {
      animal.stepPath();
    } else if (Math.random() < 0.45) {
      randomWander(animal, world, 3, 15);
    }
  }
}

// ── Wolf ──────────────────────────────────────────────────────────────────────

function updateWolf(animal, world, agents, allAnimals) {
  const def = ANIMAL_DEF.wolf;

  // Find nearest prey animal
  let target = null, targetDist = def.huntRange + 1;
  for (const a of allAnimals) {
    if (!a.alive || !a.isPrey || a === animal) continue;
    const d = Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y);
    if (d < targetDist) { targetDist = d; target = a; }
  }

  if (target) {
    animal.state    = 'hunt';
    animal._targetId = target.id;

    if (animal._moveTimer >= def.moveEvery) {
      animal._moveTimer = 0;
      if (animal.x === target.x && animal.y === target.y) {
        target.takeDamage(2); // wolves kill prey quickly
      } else {
        const path = world.findPath(animal.x, animal.y, target.x, target.y, 40);
        if (path) { animal.clearPath(); animal.setPath(path); }
        animal.stepPath();
      }
    }
    return;
  }

  // Opportunistically threaten weak nearby agents
  for (const a of agents) {
    if (!a.alive) continue;
    if (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y) > 1) continue;
    if (a.energy > 0.4 && a.hunger > 0.3) continue; // only attack weakened agents
    if (Math.random() < 0.04) {
      a.energy = Math.max(0, a.energy - def.attackDmg);
    }
  }

  animal.state    = 'wander';
  animal._targetId = null;
  if (animal._moveTimer >= def.moveEvery * 2) {
    animal._moveTimer = 0;
    if (animal.hasPath) {
      animal.stepPath();
    } else {
      randomWander(animal, world, 4, 20);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomWander(animal, world, range, maxSteps) {
  const dx = Math.floor(Math.random() * (range * 2 + 1)) - range;
  const dy = Math.floor(Math.random() * (range * 2 + 1)) - range;
  const tx = clamp(animal.x + dx, 0, world.width  - 1);
  const ty = clamp(animal.y + dy, 0, world.height - 1);
  const tile = world.getTile(tx, ty);
  if (tile && tile.passable) {
    const path = world.findPath(animal.x, animal.y, tx, ty, maxSteps);
    if (path) animal.setPath(path);
  }
}

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
