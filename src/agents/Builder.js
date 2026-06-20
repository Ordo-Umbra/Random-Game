import { STRUCTURE_BUILD_DEF } from '../world/PlacedStructure.js';

const NEARBY_RADIUS  = 10;   // don't build same type if one exists this close
const SEARCH_RANGE   = 7;    // tile radius to search for a valid build spot
const REPAIR_RATE    = 0.5;  // health restored per tick when agent repairs
const BUILD_COOLDOWN = 250;  // ticks between build attempts per agent
const MAX_CARRY      = 8;    // max units of each material an agent can carry

export class Builder {
  constructor() {
    this._cooldown     = Math.floor(Math.random() * BUILD_COOLDOWN);
    this._buildingType = null;   // currently placing (timer counting down)
    this._buildTimer   = 0;
    this._plannedType  = null;   // committed future build — gathering or pathing there
    this._plannedSpot  = null;   // {x, y} of the reserved build site
  }

  get isBuilding() {
    // Mid-build timer: Brain exits early so only Builder drives the tick
    return this._buildingType !== null;
  }

  // Human-readable status for the Inspector
  get activity() {
    if (this._buildingType) return `building ${STRUCTURE_BUILD_DEF[this._buildingType]?.name ?? this._buildingType}`;
    if (this._plannedType)  return `gathering for ${STRUCTURE_BUILD_DEF[this._plannedType]?.name ?? this._plannedType}`;
    return 'idle';
  }

  update(agent, world) {
    // Passive repair: if standing on a damaged known structure, fix it.
    // Metal Tools (SU2) double the repair rate.
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

    // Mid-build countdown (priority 3 in Brain — Brain already returned early here)
    if (this._buildingType !== null) {
      this._buildTimer--;
      agent.corpus.use(STRUCTURE_BUILD_DEF[this._buildingType].requiredKnowledge);
      if (this._buildTimer <= 0) this._finishBuild(agent, world);
      return true;
    }

    // Resume material gathering for a planned build
    if (this._plannedType !== null) {
      return this._gatherForBuild(agent, world);
    }

    // Don't start new builds when needs are low
    if (agent.hunger < 0.5 || agent.energy < 0.3) return false;

    return this._tryStartBuild(agent, world);
  }

  // Find a viable structure to build and either start it (if we have materials
  // and are at the spot) or commit to it and begin gathering.
  _tryStartBuild(agent, world) {
    for (const [id, def] of Object.entries(STRUCTURE_BUILD_DEF)) {
      if (agent.corpus.getMastery(def.requiredKnowledge) < def.minMastery) continue;
      if (world.findNearestStructure(agent.x, agent.y, id, NEARBY_RADIUS)) continue;

      const spot = findBuildSpot(agent.x, agent.y, def, world, SEARCH_RANGE);
      if (!spot) continue;

      const cost = def.cost ?? { wood: 0, stone: 0 };
      const hasMats = agent.inventory.wood  >= cost.wood &&
                      agent.inventory.stone >= cost.stone;

      if (hasMats) {
        // Have everything — walk to spot or build
        if (agent.x === spot.x && agent.y === spot.y) {
          this._startBuild(agent, id);
          return true;
        }
        if (!agent.hasPath) {
          const path = world.findPath(agent.x, agent.y, spot.x, spot.y);
          if (path) agent.setPath(path);
        }
        return false;
      }

      // Need materials — commit to this plan and start gathering
      this._plannedType = id;
      this._plannedSpot = spot;
      return false;
    }
    return false;
  }

  // Called each tick while _plannedType is set.
  // Gathers needed resources then walks to the build spot.
  _gatherForBuild(agent, world) {
    const def = STRUCTURE_BUILD_DEF[this._plannedType];
    const cost = def.cost ?? { wood: 0, stone: 0 };
    const inv  = agent.inventory;

    // Abandon if spot was taken or a nearby structure of the same type appeared
    if (world.getStructure(this._plannedSpot.x, this._plannedSpot.y) ||
        world.findNearestStructure(agent.x, agent.y, this._plannedType, NEARBY_RADIUS)) {
      this._plannedType = null;
      this._plannedSpot = null;
      return false;
    }

    // Gather from the tile the agent is currently standing on
    const tile = world.getTile(agent.x, agent.y);
    if (tile?.resource === 'wood')  inv.wood  = Math.min(MAX_CARRY, inv.wood  + 1);
    if (tile?.resource === 'stone') inv.stone = Math.min(MAX_CARRY, inv.stone + 1);

    const haveEnough = inv.wood >= cost.wood && inv.stone >= cost.stone;

    if (haveEnough) {
      // Materials secured — head to the build site
      if (agent.x === this._plannedSpot.x && agent.y === this._plannedSpot.y) {
        const type = this._plannedType;
        this._plannedType = null;
        this._plannedSpot = null;
        this._startBuild(agent, type);
        return true;
      }
      if (!agent.hasPath) {
        const path = world.findPath(agent.x, agent.y, this._plannedSpot.x, this._plannedSpot.y);
        if (path) agent.setPath(path);
      }
      return false;
    }

    // Not enough yet — path to nearest source of the needed material
    if (!agent.hasPath) {
      const needed = inv.wood < cost.wood ? 'wood' : 'stone';
      const src = world.findNearestWithResource(agent.x, agent.y, needed, 35);
      if (src) {
        const path = world.findPath(agent.x, agent.y, src.x, src.y);
        if (path) { agent.setPath(path); }
      } else {
        // Resource not found anywhere within range — abandon this build
        this._plannedType = null;
        this._plannedSpot = null;
      }
    }
    return false;
  }

  _startBuild(agent, type) {
    const def = STRUCTURE_BUILD_DEF[type];

    // Consume the gathered materials
    const cost = def.cost ?? { wood: 0, stone: 0 };
    agent.inventory.wood  = Math.max(0, agent.inventory.wood  - cost.wood);
    agent.inventory.stone = Math.max(0, agent.inventory.stone - cost.stone);

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
