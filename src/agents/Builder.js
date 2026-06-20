import { STRUCTURE_BUILD_DEF } from '../world/PlacedStructure.js';

const NEARBY_RADIUS  = 10;   // don't build same type if one exists this close
const SEARCH_RANGE   = 7;    // tile radius to search for a valid build spot
const REPAIR_RATE    = 0.5;  // health restored per tick when agent repairs
const BUILD_COOLDOWN = 250;  // ticks between build attempts per agent

export class Builder {
  constructor() {
    this._cooldown     = Math.floor(Math.random() * BUILD_COOLDOWN);
    this._buildingType = null;
    this._buildTimer   = 0;
  }

  get isBuilding() { return this._buildingType !== null; }

  // Returns true if the builder is consuming this agent's action this tick.
  // Must be called after the agent has moved to the right tile.
  update(agent, world) {
    // Passive repair: if standing on a damaged structure we know, fix it.
    // Metal Tools (SU2) make repair work faster.
    const here = world.getStructure(agent.x, agent.y);
    if (here && !this._buildingType) {
      const def = STRUCTURE_BUILD_DEF[here.type];
      if (def && agent.corpus.getMastery(def.requiredKnowledge) >= def.minMastery * 0.6) {
        const repairBoost = 1 + agent.corpus.getMastery('metal_tools') * 1.0;
        here.repair(REPAIR_RATE * repairBoost);
        agent.corpus.use(def.requiredKnowledge);
      }
    }

    if (this._cooldown > 0) { this._cooldown--; return false; }

    // Mid-build countdown
    if (this._buildingType !== null) {
      this._buildTimer--;
      agent.corpus.use(STRUCTURE_BUILD_DEF[this._buildingType].requiredKnowledge);
      if (this._buildTimer <= 0) this._finishBuild(agent, world);
      return true;
    }

    // Don't build if needs are low
    if (agent.hunger < 0.5 || agent.energy < 0.3) return false;

    return this._tryStartBuild(agent, world);
  }

  _tryStartBuild(agent, world) {
    for (const [id, def] of Object.entries(STRUCTURE_BUILD_DEF)) {
      if (agent.corpus.getMastery(def.requiredKnowledge) < def.minMastery) continue;
      if (world.findNearestStructure(agent.x, agent.y, id, NEARBY_RADIUS)) continue;

      const spot = findBuildSpot(agent.x, agent.y, def, world, SEARCH_RANGE);
      if (!spot) continue;

      if (agent.x === spot.x && agent.y === spot.y) {
        this._startBuild(agent, id);
        return true;
      }

      // Not there yet — set path and wait for Brain to walk us there next tick
      if (!agent.hasPath) {
        const path = world.findPath(agent.x, agent.y, spot.x, spot.y);
        if (path) agent.setPath(path);
      }
      return false;
    }
    return false;
  }

  _startBuild(agent, type) {
    const def = STRUCTURE_BUILD_DEF[type];
    this._buildingType = type;
    // Metal Tools (SU2) speed up construction by up to ~40%
    const speedup = 1 - agent.corpus.getMastery('metal_tools') * 0.4;
    this._buildTimer = Math.max(1, Math.round(def.buildTime * speedup));
    if (agent.corpus.getMastery('metal_tools') > 0.1) agent.corpus.use('metal_tools');
    agent.energy = Math.max(0.05, agent.energy - 0.08);
    agent.hunger = Math.max(0.05, agent.hunger - 0.05);
  }

  _finishBuild(agent, world) {
    if (!world.getStructure(agent.x, agent.y)) {
      world.placeStructure(agent.x, agent.y, this._buildingType, agent.id);
    }
    this._buildingType = null;
    this._cooldown     = BUILD_COOLDOWN + Math.floor(Math.random() * 100);
  }
}

function findBuildSpot(ox, oy, def, world, range) {
  let best = null, bestScore = -Infinity;
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const nx = ox + dx, ny = oy + dy;
      const tile = world.getTile(nx, ny);
      if (!tile || !tile.passable) continue;
      if (!def.allowedTiles.includes(tile.type)) continue;
      if (world.getStructure(nx, ny)) continue;
      if (def.requiresAdjacentWater && !world.hasAdjacentWater(nx, ny)) continue;

      const score = -(Math.abs(dx) + Math.abs(dy));
      if (score > bestScore) { bestScore = score; best = { x: nx, y: ny }; }
    }
  }
  return best;
}
