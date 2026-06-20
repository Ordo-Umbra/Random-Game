import { TileType } from '../world/Tile.js';
import { broadcastKnowledge, attemptDiscovery } from '../knowledge/Transmission.js';

const MOVE_EVERY = 3;    // ticks between movement steps

export class Brain {
  constructor() {
    this._moveTimer = 0;
  }

  update(agent, world, allAgents, tick) {
    if (!agent.alive) return;

    attemptDiscovery(agent, world, allAgents);
    broadcastKnowledge(agent, allAgents, tick);

    this._moveTimer++;

    // --- Priority 1: Critical hunger ---
    if (agent.hunger < 0.25) {
      this._seekFood(agent, world);
      return;
    }

    // --- Priority 2: Critical energy ---
    if (agent.energy < 0.15) {
      agent.rest(world);
      return;
    }

    // --- Priority 3: Builder (mid-build takes full action) ---
    if (agent.builder.isBuilding) {
      agent.builder.update(agent, world);
      return;
    }

    // --- Priority 4: Low hunger ---
    if (agent.hunger < 0.6) {
      this._seekFood(agent, world);
      return;
    }

    // --- Priority 5: Try to build something ---
    // Builder handles its own cooldown; if it sets a path we fall through to movement
    agent.builder.update(agent, world);

    // --- Priority 6: Follow existing path or wander ---
    if (agent.hasPath) {
      if (this._moveTimer >= MOVE_EVERY) {
        agent.stepPath();
        this._moveTimer = 0;
      }
      return;
    }

    this._wander(agent, world);
  }

  _seekFood(agent, world) {
    if (agent.hasPath) {
      if (this._moveTimer >= MOVE_EVERY) {
        agent.stepPath();
        this._moveTimer = 0;
        if (!agent.hasPath) agent.eat(world);
      }
      return;
    }

    if (agent.eat(world) > 0) return;

    // Prefer the richest food structures first, then natural tiles
    const farmSpot = world.findNearestStructure(agent.x, agent.y, 'granary', 20)
      || world.findNearestStructure(agent.x, agent.y, 'pasture', 20)
      || world.findNearestStructure(agent.x, agent.y, 'farm', 20)
      || world.findNearestStructure(agent.x, agent.y, 'fishing_dock', 20);

    const naturalSpot = !farmSpot && (
      world.findNearest(agent.x, agent.y, TileType.GRASS, 25)
      || world.findNearest(agent.x, agent.y, TileType.FOREST, 25)
      || world.findNearest(agent.x, agent.y, TileType.SHALLOW_WATER, 25)
    );

    const target = farmSpot || naturalSpot;
    if (target) {
      const path = world.findPath(agent.x, agent.y, target.x, target.y);
      if (path) agent.setPath(path);
    }
  }

  _wander(agent, world) {
    if (this._moveTimer < MOVE_EVERY * 4) return;
    this._moveTimer = 0;

    const dx = Math.floor(Math.random() * 7) - 3;
    const dy = Math.floor(Math.random() * 7) - 3;
    const tx = agent.x + dx, ty = agent.y + dy;
    const tile = world.getTile(tx, ty);
    if (tile && tile.passable) {
      const path = world.findPath(agent.x, agent.y, tx, ty, 30);
      if (path) agent.setPath(path);
    }
  }
}
