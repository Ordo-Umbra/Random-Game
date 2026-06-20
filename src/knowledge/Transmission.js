import { STRUCTURE_DEF } from './Structure.js';

const TEACH_RANGE = 1;          // tiles within which teaching can happen
const TEACH_TICK_INTERVAL = 20; // agent tries to teach every N ticks

// Attempt to teach one structure from teacher to learner.
// Language mastery (U1) amplifies transmission fidelity.
export function attemptTeach(teacher, learner, structureId) {
  const teacherMastery = teacher.corpus.getMastery(structureId);
  if (teacherMastery < 0.2) return false;

  const def = STRUCTURE_DEF[structureId];
  if (!def) return false;

  for (const prereq of def.prereqs) {
    if (learner.corpus.getMastery(prereq) < 0.4) return false;
  }

  // Language (U1) reduces noise and amplifies fidelity — the unifying medium
  const langBoost = 1 + teacher.corpus.getMastery('language') * 0.5;
  const fidelity  = Math.max(0, (teacherMastery - def.teachDifficulty - Math.random() * 0.1) * langBoost);
  if (fidelity <= 0) return false;

  const current = learner.corpus.getMastery(structureId);
  const gain    = (fidelity - current) * 0.3;
  if (gain <= 0.01) return false;

  learner.corpus.addMastery(structureId, gain);
  teacher.corpus.use('language');
  return true;
}

// Agent tries to teach a random known structure to any nearby agent.
export function broadcastKnowledge(agent, allAgents, worldTick) {
  if (worldTick % TEACH_TICK_INTERVAL !== 0) return;

  const known = agent.corpus.getKnownStructures(0.2);
  if (known.length === 0) return;

  const nearby = allAgents.filter(a =>
    a !== agent &&
    Math.abs(a.x - agent.x) <= TEACH_RANGE &&
    Math.abs(a.y - agent.y) <= TEACH_RANGE
  );
  if (nearby.length === 0) return;

  const structureId = known[Math.floor(Math.random() * known.length)];
  const learner     = nearby[Math.floor(Math.random() * nearby.length)];
  attemptTeach(agent, learner, structureId);
}

// An agent near the right environment randomly discovers knowledge solo or socially.
// allAgents is used for social-context discoveries (language, ritual, governance).
export function attemptDiscovery(agent, world, allAgents = []) {
  const tile = world.getTile(agent.x, agent.y);
  if (!tile) return;

  const nearbyCount = allAgents.filter(a =>
    a !== agent && Math.abs(a.x - agent.x) + Math.abs(a.y - agent.y) <= 2
  ).length;

  for (const [id, def] of Object.entries(STRUCTURE_DEF)) {
    if (agent.corpus.getMastery(id) > 0.8) continue;

    const prereqsMet = def.prereqs.every(p => agent.corpus.getMastery(p) >= 0.4);
    if (!prereqsMet) continue;

    if (!environmentAllowsDiscovery(id, tile, agent, world, nearbyCount)) continue;

    if (Math.random() < def.discoverDifficulty * 0.01) {
      agent.corpus.addMastery(id, 0.05 + Math.random() * 0.1);
    }
  }
}

function environmentAllowsDiscovery(id, tile, agent, world, nearbyCount) {
  switch (id) {
    case 'fire_making':
      return tile.resource === 'wood';
    case 'fishing':
      return tile.resource === 'fish';
    case 'stone_tools':
      return tile.resource === 'stone' || tile.resource === null;
    case 'metal_smelting':
      return tile.resource === 'stone';

    // SU2: discovered in forest — hunter watches prey movement patterns
    case 'bow_hunting':
      return tile.type === 'forest' || tile.resource === 'wood';

    // SU2: discovered near a campfire while on a food tile or farm
    case 'cooking': {
      const hasFire = hasNearbyStructure(agent.x, agent.y, 'campfire', world, 2);
      return hasFire && (tile.resource === 'food' || tile.resource === 'fish');
    }

    // U1: social-only discovery — language emerges from contact with others
    case 'language':
      return nearbyCount >= 2;

    // SU3: ritual emerges around fire in community context
    case 'ritual': {
      const hasFire = hasNearbyStructure(agent.x, agent.y, 'campfire', world, 3);
      return hasFire && nearbyCount >= 1;
    }

    // SU2: medicine is discovered near death — proximity to skeletons
    case 'medicine': {
      const skeletons = world.skeletons ?? [];
      return skeletons.some(s =>
        Math.abs(s.x - agent.x) + Math.abs(s.y - agent.y) <= 3
      );
    }

    // SU3: governance only crystallises within an established social group
    case 'governance':
      return nearbyCount >= 3 || agent.social > 0.75;

    // U1: foraging is learned while gathering on living land
    case 'foraging':
      return tile.type === 'grass' || tile.type === 'forest' ||
             tile.resource === 'food' || tile.resource === 'fish';

    // SU2: irrigation needs water at hand to channel onto crops
    case 'irrigation':
      return world.hasAdjacentWater(agent.x, agent.y);

    // SU3: domestication is learned on open grazing land
    case 'animal_husbandry':
      return tile.type === 'grass' || tile.type === 'dirt';

    // SU3 / SU2: working stone requires stone
    case 'masonry':
    case 'metal_tools':
      return tile.resource === 'stone';

    // SU2: preserving food is figured out near a fire (smoking/drying)
    case 'food_preservation':
      return hasNearbyStructure(agent.x, agent.y, 'campfire', world, 3);

    // U1: architecture is a civic art — it emerges among others
    case 'architecture':
      return nearbyCount >= 2;

    default:
      return true;
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
