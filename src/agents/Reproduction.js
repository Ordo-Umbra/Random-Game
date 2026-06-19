// Handles agent reproduction: partner-finding, offspring creation, knowledge inheritance.

const PARTNER_RANGE      = 2;     // tiles to search for a mate
const INHERIT_FACTOR     = 0.45;  // fraction of parent mastery passed to child
const INHERIT_NOISE      = 0.1;   // ±random noise on each inherited mastery
const POST_BIRTH_COOLDOWN = 300;  // ticks before either parent can reproduce again
const POPULATION_CAP     = 120;   // soft cap — no new births above this

export function tickReproduction(agents, world, spawnAgent) {
  if (agents.length >= POPULATION_CAP) return;

  for (const agent of agents) {
    if (!agent.canReproduce) continue;

    const partner = findPartner(agent, agents);
    if (!partner) continue;

    const spawnPos = findSpawnTile(agent, world);
    if (!spawnPos) continue;

    const child = spawnAgent(spawnPos.x, spawnPos.y);
    inheritKnowledge(child, agent, partner);

    // Governance (SU3): coordinated society reduces reproductive overhead
    const govBonus = Math.max(
      agent.corpus.getMastery('governance'),
      partner.corpus.getMastery('governance')
    );
    const cooldown = Math.round(POST_BIRTH_COOLDOWN * (1 - govBonus * 0.35));
    agent.reproduceCooldown  = cooldown;
    partner.reproduceCooldown = cooldown;

    // Cost: reproduction takes energy and hunger from parents
    agent.hunger  = Math.max(0.1, agent.hunger  - 0.2);
    agent.energy  = Math.max(0.1, agent.energy  - 0.15);
    partner.hunger = Math.max(0.1, partner.hunger - 0.2);
    partner.energy = Math.max(0.1, partner.energy - 0.15);

    // Only one birth per tick per pass to avoid instant population explosions
    break;
  }
}

function findPartner(agent, agents) {
  for (const other of agents) {
    if (other === agent) continue;
    if (!other.canReproduce) continue;
    if (Math.abs(other.x - agent.x) + Math.abs(other.y - agent.y) > PARTNER_RANGE) continue;
    return other;
  }
  return null;
}

function findSpawnTile(agent, world) {
  // Try tiles adjacent to the parent first, then expand slightly
  const offsets = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [0, 2], [2, 0], [0, -2], [-2, 0],
  ];
  for (const [dx, dy] of offsets) {
    const nx = agent.x + dx, ny = agent.y + dy;
    const tile = world.getTile(nx, ny);
    if (tile && tile.passable) return { x: nx, y: ny };
  }
  return null;
}

function inheritKnowledge(child, parentA, parentB) {
  // Collect all structures known by either parent
  const structureIds = new Set([
    ...parentA.corpus.getKnownStructures(0.1),
    ...parentB.corpus.getKnownStructures(0.1),
  ]);

  for (const id of structureIds) {
    const masteryA = parentA.corpus.getMastery(id);
    const masteryB = parentB.corpus.getMastery(id);

    // Child inherits from the more knowledgeable parent, blended with the other.
    // Governance knowledge (SU3) strengthens the fidelity of cultural transmission.
    const govFactor = Math.max(
      parentA.corpus.getMastery('governance'),
      parentB.corpus.getMastery('governance')
    );
    const factor = INHERIT_FACTOR + govFactor * 0.25;
    const baseMastery = Math.max(masteryA, masteryB) * 0.7 + Math.min(masteryA, masteryB) * 0.3;
    const noise = (Math.random() * 2 - 1) * INHERIT_NOISE;
    const inherited = Math.max(0, Math.min(1, baseMastery * factor + noise));

    if (inherited > 0.02) {
      child.corpus.addMastery(id, inherited);
    }
  }
}
