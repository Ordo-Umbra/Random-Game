// A "stable structure" is anything an agent can learn, use, teach, and forget.
// Each structure carries a URP seed archetype (U1 / SU2 / SU3):
//   U1  — unity: binds many into one (fire, language, writing, navigation, shelter)
//   SU2 — paired transformer: bridges opposites (stone tools, cooking, bow hunting, fishing, medicine)
//   SU3 — triadic mediation: three-body stability (pottery, metal smelting, ritual, governance)

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
  // URP expansions
  COOKING:        'cooking',
  BOW_HUNTING:    'bow_hunting',
  LANGUAGE:       'language',
  RITUAL:         'ritual',
  MEDICINE:       'medicine',
  GOVERNANCE:     'governance',
  // Tech-tree expansion: subsistence → tools → structures
  FORAGING:          'foraging',
  IRRIGATION:        'irrigation',
  ANIMAL_HUSBANDRY:  'animal_husbandry',
  MASONRY:           'masonry',
  METAL_TOOLS:       'metal_tools',
  FOOD_PRESERVATION: 'food_preservation',
  ARCHITECTURE:      'architecture',
});

export const SeedType = Object.freeze({
  U1:   'U1',
  SU2:  'SU2',
  SU3:  'SU3',
  NONE: 'none',
});

export const STRUCTURE_DEF = {
  [StructureId.FIRE_MAKING]: {
    id: StructureId.FIRE_MAKING,
    name: 'Fire Making',
    seedType: SeedType.U1,
    prereqs: [],
    discoverDifficulty: 0.15,
    teachDifficulty: 0.05,
    uses: ['warmth', 'cooking'],
    unlocks: [StructureId.POTTERY, StructureId.METAL_SMELTING, StructureId.COOKING, StructureId.MEDICINE],
  },
  [StructureId.BASIC_SHELTER]: {
    id: StructureId.BASIC_SHELTER,
    name: 'Basic Shelter',
    seedType: SeedType.U1,
    prereqs: [],
    discoverDifficulty: 0.10,
    teachDifficulty: 0.05,
    uses: ['rest'],
    unlocks: [],
  },
  [StructureId.STONE_TOOLS]: {
    id: StructureId.STONE_TOOLS,
    name: 'Stone Tools',
    seedType: SeedType.SU2,
    prereqs: [],
    discoverDifficulty: 0.08,
    teachDifficulty: 0.06,
    uses: ['efficiency'],
    unlocks: [StructureId.CROP_FARMING, StructureId.NAVIGATION, StructureId.BOW_HUNTING, StructureId.MASONRY],
  },
  [StructureId.CROP_FARMING]: {
    id: StructureId.CROP_FARMING,
    name: 'Crop Farming',
    seedType: SeedType.SU2,
    prereqs: [StructureId.STONE_TOOLS],
    discoverDifficulty: 0.03,
    teachDifficulty: 0.08,
    uses: ['food'],
    unlocks: [StructureId.POTTERY, StructureId.IRRIGATION],
  },
  [StructureId.FISHING]: {
    id: StructureId.FISHING,
    name: 'Fishing',
    seedType: SeedType.SU2,
    prereqs: [],
    discoverDifficulty: 0.12,
    teachDifficulty: 0.04,
    uses: ['food'],
    unlocks: [StructureId.NAVIGATION],
  },
  [StructureId.POTTERY]: {
    id: StructureId.POTTERY,
    name: 'Pottery',
    seedType: SeedType.SU3,
    prereqs: [StructureId.FIRE_MAKING],
    discoverDifficulty: 0.02,
    teachDifficulty: 0.10,
    uses: ['storage'],
    unlocks: [StructureId.WRITING, StructureId.FOOD_PRESERVATION],
  },
  [StructureId.METAL_SMELTING]: {
    id: StructureId.METAL_SMELTING,
    name: 'Metal Smelting',
    seedType: SeedType.SU3,
    prereqs: [StructureId.FIRE_MAKING, StructureId.STONE_TOOLS],
    discoverDifficulty: 0.005,
    teachDifficulty: 0.15,
    uses: ['efficiency', 'military'],
    unlocks: [StructureId.METAL_TOOLS],
  },
  [StructureId.NAVIGATION]: {
    id: StructureId.NAVIGATION,
    name: 'Navigation',
    seedType: SeedType.U1,
    prereqs: [StructureId.FISHING],
    discoverDifficulty: 0.008,
    teachDifficulty: 0.12,
    uses: ['exploration'],
    unlocks: [],
  },
  [StructureId.WRITING]: {
    id: StructureId.WRITING,
    name: 'Writing',
    seedType: SeedType.U1,
    prereqs: [StructureId.POTTERY],
    discoverDifficulty: 0.002,
    teachDifficulty: 0.05,
    uses: ['culture'],
    unlocks: [StructureId.ARCHITECTURE],
  },

  // ── URP Seed Structures ────────────────────────────────────────────────────

  [StructureId.COOKING]: {
    id: StructureId.COOKING,
    name: 'Cooking',
    seedType: SeedType.SU2,           // raw ↔ nourishing: a paired transformation
    prereqs: [StructureId.FIRE_MAKING],
    discoverDifficulty: 0.10,
    teachDifficulty: 0.04,
    uses: ['food', 'efficiency'],
    unlocks: [],
  },
  [StructureId.BOW_HUNTING]: {
    id: StructureId.BOW_HUNTING,
    name: 'Bow Hunting',
    seedType: SeedType.SU2,           // hunter ↔ prey: distance predation duality
    prereqs: [StructureId.STONE_TOOLS],
    discoverDifficulty: 0.06,
    teachDifficulty: 0.07,
    uses: ['food', 'efficiency'],
    unlocks: [StructureId.ANIMAL_HUSBANDRY],
  },
  [StructureId.LANGUAGE]: {
    id: StructureId.LANGUAGE,
    name: 'Language',
    seedType: SeedType.U1,            // unifies meaning across minds
    prereqs: [],
    discoverDifficulty: 0.05,         // social discovery: requires nearby agents
    teachDifficulty: 0.03,
    uses: ['culture', 'teaching'],
    unlocks: [StructureId.RITUAL, StructureId.GOVERNANCE],
  },
  [StructureId.RITUAL]: {
    id: StructureId.RITUAL,
    name: 'Ritual',
    seedType: SeedType.SU3,           // body × mind × community triad
    prereqs: [StructureId.LANGUAGE, StructureId.FIRE_MAKING],
    discoverDifficulty: 0.04,
    teachDifficulty: 0.08,
    uses: ['culture', 'cohesion'],
    unlocks: [StructureId.GOVERNANCE],
  },
  [StructureId.MEDICINE]: {
    id: StructureId.MEDICINE,
    name: 'Medicine',
    seedType: SeedType.SU2,           // life ↔ death: mediates the boundary
    prereqs: [StructureId.FIRE_MAKING],
    discoverDifficulty: 0.05,         // discovered near death (skeletons)
    teachDifficulty: 0.09,
    uses: ['healing'],
    unlocks: [],
  },
  [StructureId.GOVERNANCE]: {
    id: StructureId.GOVERNANCE,
    name: 'Governance',
    seedType: SeedType.SU3,           // leaders × rules × followers triad
    prereqs: [StructureId.RITUAL, StructureId.LANGUAGE],
    discoverDifficulty: 0.02,         // emerges only within societies
    teachDifficulty: 0.12,
    uses: ['culture', 'cohesion', 'efficiency'],
    unlocks: [],
  },

  // ── Subsistence → Tools → Structures tech tree ──────────────────────────────

  [StructureId.FORAGING]: {
    id: StructureId.FORAGING,
    name: 'Foraging',
    seedType: SeedType.U1,            // gathering unifies the land's scattered offerings
    prereqs: [],
    discoverDifficulty: 0.20,         // the easiest, earliest food skill
    teachDifficulty: 0.03,
    uses: ['food'],
    unlocks: [StructureId.CROP_FARMING],
  },
  [StructureId.IRRIGATION]: {
    id: StructureId.IRRIGATION,
    name: 'Irrigation',
    seedType: SeedType.SU2,           // water ↔ soil: a managed exchange
    prereqs: [StructureId.CROP_FARMING],
    discoverDifficulty: 0.04,
    teachDifficulty: 0.08,
    uses: ['food', 'efficiency'],
    unlocks: [],
  },
  [StructureId.ANIMAL_HUSBANDRY]: {
    id: StructureId.ANIMAL_HUSBANDRY,
    name: 'Animal Husbandry',
    seedType: SeedType.SU3,           // human × animal × land triad
    prereqs: [StructureId.BOW_HUNTING],
    discoverDifficulty: 0.03,
    teachDifficulty: 0.10,
    uses: ['food'],
    unlocks: [],                       // enables the Pasture building
  },
  [StructureId.MASONRY]: {
    id: StructureId.MASONRY,
    name: 'Masonry',
    seedType: SeedType.SU3,           // stone × form × load: a balanced triad
    prereqs: [StructureId.STONE_TOOLS],
    discoverDifficulty: 0.04,
    teachDifficulty: 0.10,
    uses: ['construction'],
    unlocks: [StructureId.ARCHITECTURE], // enables the Stone House building
  },
  [StructureId.METAL_TOOLS]: {
    id: StructureId.METAL_TOOLS,
    name: 'Metal Tools',
    seedType: SeedType.SU2,           // ore ↔ edge: refinement of the duality
    prereqs: [StructureId.METAL_SMELTING],
    discoverDifficulty: 0.02,
    teachDifficulty: 0.12,
    uses: ['efficiency', 'construction', 'military'],
    unlocks: [],
  },
  [StructureId.FOOD_PRESERVATION]: {
    id: StructureId.FOOD_PRESERVATION,
    name: 'Food Preservation',
    seedType: SeedType.SU2,           // fresh ↔ stored: time-binding of nourishment
    prereqs: [StructureId.POTTERY],
    discoverDifficulty: 0.03,
    teachDifficulty: 0.09,
    uses: ['food', 'storage'],
    unlocks: [],                       // enables the Granary building
  },
  [StructureId.ARCHITECTURE]: {
    id: StructureId.ARCHITECTURE,
    name: 'Architecture',
    seedType: SeedType.U1,            // unifies many built forms into one civic plan
    prereqs: [StructureId.MASONRY, StructureId.WRITING],
    discoverDifficulty: 0.015,
    teachDifficulty: 0.10,
    uses: ['culture', 'construction'],
    unlocks: [],                       // enables the Monument building
  },
};
