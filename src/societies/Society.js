// Societies emerge from agents with significantly overlapping knowledge corpora.
// This tracker runs periodically (not every tick) to re-cluster agents.

const RECLUSTER_INTERVAL = 100;   // ticks between full recluster passes
const OVERLAP_THRESHOLD  = 0.3;   // minimum corpus overlap to be in same society
const MIN_SIZE           = 2;     // lone agents don't form a society

let _nextSocietyId = 0;

export class SocietyTracker {
  constructor() {
    this.societies = new Map();   // id -> Society
    this._ticksSinceCluster = 0;
  }

  update(agents, tick) {
    this._ticksSinceCluster++;
    if (this._ticksSinceCluster < RECLUSTER_INTERVAL) return;
    this._ticksSinceCluster = 0;
    this._recluster(agents);
  }

  _recluster(agents) {
    // Greedy single-link clustering by corpus overlap
    const assigned = new Map();   // agentId -> societyId
    const groups   = new Map();   // societyId -> Set of agents

    for (const agent of agents) {
      if (!agent.alive) continue;
      let bestGroup = null, bestOverlap = OVERLAP_THRESHOLD;

      for (const [sid, members] of groups) {
        // Compare to a random member of the group for speed
        const rep = [...members][0];
        const overlap = corpusOverlap(agent, rep);
        if (overlap > bestOverlap) { bestOverlap = overlap; bestGroup = sid; }
      }

      if (bestGroup !== null) {
        groups.get(bestGroup).add(agent);
        assigned.set(agent.id, bestGroup);
      } else {
        const sid = _nextSocietyId++;
        groups.set(sid, new Set([agent]));
        assigned.set(agent.id, sid);
      }
    }

    // Apply, discarding groups that are too small
    this.societies.clear();
    for (const [sid, members] of groups) {
      if (members.size < MIN_SIZE) {
        for (const a of members) { a.societyId = null; }
        continue;
      }
      this.societies.set(sid, {
        id: sid,
        members,
        sharedKnowledge: this._sharedKnowledge(members),
      });
      for (const a of members) a.societyId = sid;
    }
  }

  _sharedKnowledge(members) {
    // Structures known by >50% of members
    const counts = new Map();
    for (const a of members) {
      for (const { id } of a.corpus.snapshot()) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const threshold = members.size * 0.5;
    return [...counts.entries()]
      .filter(([, c]) => c >= threshold)
      .map(([id]) => id);
  }

  get count() { return this.societies.size; }
}

function corpusOverlap(a, b) {
  const aKnown = new Set(a.corpus.getKnownStructures(0.15));
  const bKnown = b.corpus.getKnownStructures(0.15);
  if (aKnown.size === 0 && bKnown.length === 0) return 0;
  const shared = bKnown.filter(id => aKnown.has(id)).length;
  const union  = new Set([...aKnown, ...bKnown]).size;
  return union === 0 ? 0 : shared / union;
}
