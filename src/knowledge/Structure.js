// A "stable structure" is anything an agent can learn, use, teach, and forget.
// Examples: fire-making, basic shelter, crop farming, stone tools, etc.

export const StructureId = Object.freeze({
  FIRE_MAKING:    'fire_making',
  BASIC_SHELTER:  'basic_shelter',
  CROP_FARMING:   'crop_farming',
  STONE_TOOLS:    'stone_tools',
  FISHING:        'fishing',
  POTTERY:        'pottery',
  METAL_SMELTING: 'metal_smelting',
  NAVIGATION:     'navigation',
  WRITING:        'writing',
});

// Definition of each structure: prerequisites, discovery difficulty, usefulness
export const STRUCTURE_DEF = {
  [StructureId.FIRE_MAKING]: {
    id: StructureId.FIRE_MAKING,
    name: 'Fire Making',
    prereqs: [],
    discoverDifficulty: 0.15,   // probability per tick of solo discovery when near wood
    teachDifficulty: 0.05,       // extra mastery lost in transmission
    uses: ['warmth', 'cooking'],
    unlocks: [StructureId.POTTERY, StructureId.METAL_SMELTING],
  },
  [StructureId.BASIC_SHELTER]: {
    id: StructureId.BASIC_SHELTER,
    name: 'Basic Shelter',
    prereqs: [],
    discoverDifficulty: 0.10,
    teachDifficulty: 0.05,
    uses: ['rest'],
    unlocks: [],
  },
  [StructureId.STONE_TOOLS]: {
    id: StructureId.STONE_TOOLS,
    name: 'Stone Tools',
    prereqs: [],
    discoverDifficulty: 0.08,
    teachDifficulty: 0.06,
    uses: ['efficiency'],
    unlocks: [StructureId.CROP_FARMING, StructureId.NAVIGATION],
  },
  [StructureId.CROP_FARMING]: {
    id: StructureId.CROP_FARMING,
    name: 'Crop Farming',
    prereqs: [StructureId.STONE_TOOLS],
    discoverDifficulty: 0.03,
    teachDifficulty: 0.08,
    uses: ['food'],
    unlocks: [StructureId.POTTERY],
  },
  [StructureId.FISHING]: {
    id: StructureId.FISHING,
    name: 'Fishing',
    prereqs: [],
    discoverDifficulty: 0.12,
    teachDifficulty: 0.04,
    uses: ['food'],
    unlocks: [StructureId.NAVIGATION],
  },
  [StructureId.POTTERY]: {
    id: StructureId.POTTERY,
    name: 'Pottery',
    prereqs: [StructureId.FIRE_MAKING],
    discoverDifficulty: 0.02,
    teachDifficulty: 0.10,
    uses: ['storage'],
    unlocks: [StructureId.WRITING],
  },
  [StructureId.METAL_SMELTING]: {
    id: StructureId.METAL_SMELTING,
    name: 'Metal Smelting',
    prereqs: [StructureId.FIRE_MAKING, StructureId.STONE_TOOLS],
    discoverDifficulty: 0.005,
    teachDifficulty: 0.15,
    uses: ['efficiency', 'military'],
    unlocks: [],
  },
  [StructureId.NAVIGATION]: {
    id: StructureId.NAVIGATION,
    name: 'Navigation',
    prereqs: [StructureId.FISHING],
    discoverDifficulty: 0.008,
    teachDifficulty: 0.12,
    uses: ['exploration'],
    unlocks: [],
  },
  [StructureId.WRITING]: {
    id: StructureId.WRITING,
    name: 'Writing',
    prereqs: [StructureId.POTTERY],
    discoverDifficulty: 0.002,
    teachDifficulty: 0.05,   // writing makes teaching easier (irony intended)
    uses: ['culture'],
    unlocks: [],
  },
};
