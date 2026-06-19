import { TileType } from '../world/Tile.js';
import { broadcastKnowledge, attemptDiscovery } from '../knowledge/Transmission.js';

// Priority-based decision-making: each tick Brain picks one action for the agent.
// Order of priority: survive → socialize/teach → explore

const MOVE_EVERY = 3;    // ticks between movement steps

export class Brain {
  constructor() {
    this._moveTimer = 0;
  }

  update(agent, world, allAgents, tick) {
    if (!agent.alive) return;

    // Knowledge systems run regardless of other actions
    attemptDiscovery(agent, world);
    broadcastKnowledge(agent, allAgents, tick);

    this._moveTimer++;

    // --- Priority 1: Critical hunger — find food immediately ---
    if (agent.hunger < 0.25) {
      this._seekFood(agent, world);
      return;
    }

    // --- Priority 2: Critical energy — rest ---
    if (agent.energy < 0.15) {
      agent.rest();
      return;
    }

    // --- Priority 3: Low hunger — wander toward food ---
    if (agent.hunger < 0.6) {
      this._seekFood(agent, world);
      return;
    }

    // --- Priority 4: Follow existing path or pick a wander destination ---
    if (agent.hasPath) {
      if (this._moveTimer >= MOVE_EVERY) {
        agent.stepPath();
        this._moveTimer = 0;
      }
      return;
    }

    // Idle wander
    this._wander(agent, world);
  }

  _seekFood(agent, world) {
    if (agent.hasPath) {
      if (this._moveTimer >= MOVE_EVERY) {
        const atGoal = !agent.stepPath();
        this._moveTimer = 0;
        if (atGoal || !agent.hasPath) agent.eat(world);
      }
      return;
    }

    // Try to eat where we stand first
    if (agent.eat(world) > 0) return;

    // Find nearest food tile
    const foodTile = world.findNearest(agent.x, agent.y, TileType.GRASS, 25)
      || world.findNearest(agent.x, agent.y, TileType.FOREST, 25)
      || world.findNearest(agent.x, agent.y, TileType.SHALLOW_WATER, 25);

    if (foodTile) {
      const path = world.findPath(agent.x, agent.y, foodTile.x, foodTile.y);
      if (path) agent.setPath(path);
    }
  }

  _wander(agent, world) {
    if (this._moveTimer < MOVE_EVERY * 4) return; // wait a bit before wandering
    this._moveTimer = 0;

    // Pick a random reachable tile nearby
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
