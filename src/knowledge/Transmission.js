import { STRUCTURE_DEF } from './Structure.js';

const TEACH_RANGE = 1;          // tiles within which teaching can happen
const TEACH_TICK_INTERVAL = 20; // agent tries to teach every N ticks

// Attempt to teach one structure from teacher to learner.
// Returns true if the learner gained mastery.
export function attemptTeach(teacher, learner, structureId) {
  const teacherMastery = teacher.corpus.getMastery(structureId);
  if (teacherMastery < 0.2) return false; // too little to teach

  const def = STRUCTURE_DEF[structureId];
  if (!def) return false;

  // Check learner has prerequisites
  for (const prereq of def.prereqs) {
    if (learner.corpus.getMastery(prereq) < 0.4) return false;
  }

  // Transmission fidelity: teacher mastery minus noise and def difficulty
  const fidelity = Math.max(0, teacherMastery - def.teachDifficulty - Math.random() * 0.1);
  if (fidelity <= 0) return false;

  const current = learner.corpus.getMastery(structureId);
  const gain = (fidelity - current) * 0.3; // approach teacher's level gradually
  if (gain <= 0.01) return false;

  learner.corpus.addMastery(structureId, gain);
  return true;
}

// Agent tries to teach a random known structure to any nearby agent
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
  const learner = nearby[Math.floor(Math.random() * nearby.length)];
  attemptTeach(agent, learner, structureId);
}

// An agent near the right environment randomly discovers knowledge solo
export function attemptDiscovery(agent, world) {
  const tile = world.getTile(agent.x, agent.y);
  if (!tile) return;

  for (const [id, def] of Object.entries(STRUCTURE_DEF)) {
    if (agent.corpus.getMastery(id) > 0.8) continue; // already knows it well

    // Check prerequisites are met
    const prereqsMet = def.prereqs.every(p => agent.corpus.getMastery(p) >= 0.4);
    if (!prereqsMet) continue;

    // Environmental gating: certain structures only discoverable in the right place
    if (!environmentAllowsDiscovery(id, tile)) continue;

    if (Math.random() < def.discoverDifficulty * 0.01) {
      agent.corpus.addMastery(id, 0.05 + Math.random() * 0.1);
    }
  }
}

function environmentAllowsDiscovery(id, tile) {
  const { StructureId } = { StructureId: {
    FIRE_MAKING: 'fire_making', FISHING: 'fishing',
    STONE_TOOLS: 'stone_tools', METAL_SMELTING: 'metal_smelting',
  }};
  switch (id) {
    case 'fire_making':    return tile.resource === 'wood';
    case 'fishing':        return tile.resource === 'fish';
    case 'stone_tools':    return tile.resource === 'stone' || tile.resource === null;
    case 'metal_smelting': return tile.resource === 'stone';
    default:               return true;
  }
}
