// Definitions for structures agents can physically build in the world.

export const STRUCTURE_BUILD_DEF = {
  campfire: {
    id: 'campfire',
    name: 'Campfire',
    requiredKnowledge: 'fire_making',
    minMastery: 0.35,
    allowedTiles: ['grass', 'dirt', 'sand', 'forest'],
    requiresAdjacentWater: false,
    maxHealth: 80,
    decayRate: 0.08,
    buildTime: 20,
  },
  shelter: {
    id: 'shelter',
    name: 'Shelter',
    requiredKnowledge: 'basic_shelter',
    minMastery: 0.35,
    allowedTiles: ['grass', 'dirt', 'sand'],
    requiresAdjacentWater: false,
    maxHealth: 150,
    decayRate: 0.03,
    buildTime: 40,
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    requiredKnowledge: 'crop_farming',
    minMastery: 0.40,
    allowedTiles: ['grass', 'dirt'],
    requiresAdjacentWater: false,
    maxHealth: 100,
    decayRate: 0.04,
    buildTime: 35,
  },
  fishing_dock: {
    id: 'fishing_dock',
    name: 'Fishing Dock',
    requiredKnowledge: 'fishing',
    minMastery: 0.35,
    allowedTiles: ['sand', 'grass', 'dirt'],
    requiresAdjacentWater: true,
    maxHealth: 100,
    decayRate: 0.05,
    buildTime: 30,
  },
};

export class PlacedStructure {
  constructor(type, builtByAgentId, tick) {
    const def = STRUCTURE_BUILD_DEF[type];
    this.type       = type;
    this.name       = def.name;
    this.health     = def.maxHealth;
    this.maxHealth  = def.maxHealth;
    this.decayRate  = def.decayRate;
    this.builtBy    = builtByAgentId;
    this.builtAt    = tick;
  }

  get healthFraction() { return this.health / this.maxHealth; }
  get intact()         { return this.health > 0; }

  decay() {
    this.health = Math.max(0, this.health - this.decayRate);
  }

  repair(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
