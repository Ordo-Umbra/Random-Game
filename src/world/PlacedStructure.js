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

  // ── Advanced structures (gated by the tech tree) ────────────────────────────

  // Pasture: domesticated animals → a steady meat supply
  pasture: {
    id: 'pasture',
    name: 'Pasture',
    requiredKnowledge: 'animal_husbandry',
    minMastery: 0.40,
    allowedTiles: ['grass', 'dirt'],
    requiresAdjacentWater: false,
    maxHealth: 120,
    decayRate: 0.04,
    buildTime: 45,
  },

  // Granary: preserved-food store — feeds and slows starvation nearby
  granary: {
    id: 'granary',
    name: 'Granary',
    requiredKnowledge: 'food_preservation',
    minMastery: 0.40,
    allowedTiles: ['grass', 'dirt', 'sand'],
    requiresAdjacentWater: false,
    maxHealth: 160,
    decayRate: 0.025,
    buildTime: 50,
  },

  // Stone House: durable shelter, far better rest than a basic shelter
  stone_house: {
    id: 'stone_house',
    name: 'Stone House',
    requiredKnowledge: 'masonry',
    minMastery: 0.45,
    allowedTiles: ['grass', 'dirt', 'sand'],
    requiresAdjacentWater: false,
    maxHealth: 300,
    decayRate: 0.015,
    buildTime: 70,
  },

  // Monument: civic landmark — lifts social need and preserves knowledge nearby
  monument: {
    id: 'monument',
    name: 'Monument',
    requiredKnowledge: 'architecture',
    minMastery: 0.45,
    allowedTiles: ['grass', 'dirt', 'sand'],
    requiresAdjacentWater: false,
    maxHealth: 500,
    decayRate: 0.008,
    buildTime: 90,
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
