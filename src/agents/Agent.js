import { Corpus } from './Corpus.js';

let _nextId = 0;

export class Agent {
  constructor(x, y) {
    this.id = _nextId++;
    this.x = x;
    this.y = y;

    // Needs (0 = critical, 1 = full)
    this.hunger = 1;
    this.energy = 1;
    this.social = 0.5;

    this.age = 0;
    this.lifespan = 800 + Math.floor(Math.random() * 400); // ticks

    this.corpus = new Corpus();
    this.societyId = null;   // assigned by SocietyTracker

    // Movement state
    this._path = [];
    this._goal = null;        // { x, y } or null
    this._actionCooldown = 0;

    // Visual — slight color variation per agent for readability
    this._hue = Math.floor(Math.random() * 360);
  }

  get alive() {
    return this.hunger > 0 && this.energy > 0 && this.age < this.lifespan;
  }

  // Called once per world tick by the Brain
  tick(world, allAgents) {
    if (!this.alive) return;
    this.age++;
    this.corpus.tick();

    // Passive need decay
    this.hunger = Math.max(0, this.hunger - 0.0008);
    this.energy = Math.max(0, this.energy - 0.0004);
    this.social  = Math.max(0, this.social  - 0.0002);

    // Count nearby agents for social need
    const nearbyCount = allAgents.filter(a =>
      a !== this && Math.abs(a.x - this.x) + Math.abs(a.y - this.y) <= 2
    ).length;
    if (nearbyCount > 0) this.social = Math.min(1, this.social + 0.001 * nearbyCount);

    this._actionCooldown--;
  }

  // Move one step along current path
  stepPath() {
    if (this._path.length === 0) return false;
    const next = this._path.shift();
    this.x = next.x;
    this.y = next.y;
    return true;
  }

  // Assign a new path computed from outside (Brain / World)
  setPath(path) {
    this._path = path ?? [];
  }

  get hasPath() {
    return this._path.length > 0;
  }

  get isIdle() {
    return this._path.length === 0 && this._goal === null && this._actionCooldown <= 0;
  }

  // Eat from current tile if it has a food resource; returns amount eaten
  eat(world) {
    const tile = world.getTile(this.x, this.y);
    if (!tile) return 0;
    if (tile.resource === 'food' || tile.resource === 'fish') {
      const gain = 0.15;
      this.hunger = Math.min(1, this.hunger + gain);
      this.corpus.use('crop_farming');
      this.corpus.use('fishing');
      return gain;
    }
    return 0;
  }

  // Rest; gains energy faster if agent knows shelter
  rest() {
    const shelterBonus = this.corpus.getMastery('basic_shelter') * 0.5;
    this.energy = Math.min(1, this.energy + 0.01 + shelterBonus * 0.005);
  }
}
