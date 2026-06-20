import { Corpus }  from './Corpus.js';
import { Builder } from './Builder.js';

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
    this.builder = new Builder();
    this.societyId = null;   // assigned by SocietyTracker

    // Movement state
    this._path = [];
    this._goal = null;
    this._actionCooldown = 0;

    // Reproduction
    this.reproduceCooldown = 150 + Math.floor(Math.random() * 100);
    this.minReproduceAge   = 80;

    // Visual — slight color variation per agent for readability
    this._hue = Math.floor(Math.random() * 360);
  }

  get alive() {
    return this.hunger > 0 && this.energy > 0 && this.age < this.lifespan;
  }

  get canReproduce() {
    return (
      this.alive &&
      this.age >= this.minReproduceAge &&
      this.reproduceCooldown <= 0 &&
      this.hunger >= 0.6 &&
      this.energy >= 0.4
    );
  }

  // URP capacity field κ: agent's available potential to integrate new knowledge
  get kappa() {
    return this.hunger * 0.5 + this.energy * 0.5;
  }

  // Called once per world tick by the Brain
  tick(world, allAgents) {
    if (!this.alive) return;
    this.age++;

    // Knowledge preservation: ritual mastery, or standing near a Monument
    let preserve = this.corpus.getMastery('ritual');
    if (world && hasNearbyStructure(this.x, this.y, 'monument', world, 5)) {
      preserve = Math.max(preserve, 0.5);
    }
    this.corpus.tick(preserve);

    // Passive need decay — food preservation & a nearby granary slow starvation
    const foodPres = this.corpus.getMastery('food_preservation');
    let hungerDecay = 0.0008 * (1 - foodPres * 0.4);
    if (world && hasNearbyStructure(this.x, this.y, 'granary', world, 4)) {
      hungerDecay *= 0.6;
    }
    this.hunger = Math.max(0, this.hunger - hungerDecay);
    this.energy = Math.max(0, this.energy - 0.0004);
    this.social  = Math.max(0, this.social  - 0.0002);

    // Count nearby agents for social need
    const nearbyCount = allAgents.filter(a =>
      a !== this && Math.abs(a.x - this.x) + Math.abs(a.y - this.y) <= 2
    ).length;
    if (nearbyCount > 0) this.social = Math.min(1, this.social + 0.001 * nearbyCount);

    // A Monument lifts the whole settlement's morale
    if (world && hasNearbyStructure(this.x, this.y, 'monument', world, 5)) {
      this.social = Math.min(1, this.social + 0.002);
    }

    if (this.reproduceCooldown > 0) this.reproduceCooldown--;
    this._actionCooldown--;

    // Medicine (SU2): chance to recover critical energy, discovered near death
    const medicineMastery = this.corpus.getMastery('medicine');
    if (medicineMastery > 0.3 && this.energy < 0.2 && Math.random() < medicineMastery * 0.003) {
      this.energy = Math.min(1, this.energy + 0.06);
      this.corpus.use('medicine');
    }
  }

  stepPath() {
    if (this._path.length === 0) return false;
    const next = this._path.shift();
    this.x = next.x;
    this.y = next.y;
    return true;
  }

  setPath(path) {
    this._path = path ?? [];
  }

  get hasPath() {
    return this._path.length > 0;
  }

  get isIdle() {
    return this._path.length === 0 && this._goal === null && this._actionCooldown <= 0;
  }

  // Eat from current tile; gains bonus from farms, docks, and nearby campfires
  eat(world) {
    const tile = world.getTile(this.x, this.y);
    if (!tile) return 0;

    let gain = 0;

    if (tile.resource === 'food' || tile.resource === 'fish') {
      // Foraging (U1): better extraction from wild land
      gain = 0.15 + this.corpus.getMastery('foraging') * 0.12;
      if (this.corpus.getMastery('foraging') > 0.1) this.corpus.use('foraging');
    }

    const structure = world.getStructure(this.x, this.y);
    if (structure && structure.intact) {
      if (structure.type === 'farm') {
        // Irrigation (SU2): lifts farm yield
        gain = Math.max(gain, 0.18 + this.corpus.getMastery('irrigation') * 0.15);
        this.corpus.use('crop_farming');
        if (this.corpus.getMastery('irrigation') > 0.1) this.corpus.use('irrigation');
      }
      if (structure.type === 'fishing_dock') {
        gain = Math.max(gain, 0.16);
        this.corpus.use('fishing');
      }
      if (structure.type === 'pasture') {
        gain = Math.max(gain, 0.24);   // domesticated meat: reliable and rich
        this.corpus.use('animal_husbandry');
      }
      if (structure.type === 'granary') {
        gain = Math.max(gain, 0.30);   // preserved stores: the best single meal
        this.corpus.use('food_preservation');
      }
    }

    if (gain > 0 && hasNearbyStructure(this.x, this.y, 'campfire', world, 2)) {
      const cookingMastery = this.corpus.getMastery('cooking');
      gain *= 1.3 + cookingMastery * 0.5;  // cooking adds up to +50% on top of campfire bonus
      this.corpus.use('fire_making');
      if (cookingMastery > 0.1) this.corpus.use('cooking');
    }

    if (gain > 0) {
      this.hunger = Math.min(1, this.hunger + gain);
    }
    return gain;
  }

  // Rest; energy regen is boosted by nearby shelter (stone house is best)
  rest(world) {
    let regen = 0.01;
    if (world && hasNearbyStructure(this.x, this.y, 'stone_house', world, 1)) {
      regen += 0.03;     // stone house: warmest, most secure rest
    } else if (world && hasNearbyStructure(this.x, this.y, 'shelter', world, 1)) {
      regen += 0.015;
    }
    regen += this.corpus.getMastery('basic_shelter') * 0.003;
    this.energy = Math.min(1, this.energy + regen);
  }
}

function hasNearbyStructure(x, y, type, world, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const s = world.getStructure(x + dx, y + dy);
      if (s && s.type === type && s.intact) return true;
    }
  }
  return false;
}
