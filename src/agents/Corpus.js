// An agent's personal knowledge set.
// Each known structure has a mastery level 0.0–1.0.
// Mastery decays when unused; ritual knowledge slows forgetting.

import { STRUCTURE_DEF } from '../knowledge/Structure.js';

const BASE_DECAY_RATE    = 0.0001;
const FORGET_THRESHOLD   = 0.02;

export class Corpus {
  constructor() {
    // Map<structureId, { mastery: number, lastUsed: number }>
    this._knowledge = new Map();
  }

  getMastery(id) {
    return this._knowledge.get(id)?.mastery ?? 0;
  }

  addMastery(id, amount) {
    const entry = this._knowledge.get(id);
    if (entry) {
      entry.mastery = Math.min(1, entry.mastery + amount);
      entry.lastUsed = 0;
    } else {
      this._knowledge.set(id, { mastery: Math.min(1, amount), lastUsed: 0 });
    }
  }

  use(id) {
    const entry = this._knowledge.get(id);
    if (entry) entry.lastUsed = 0;
  }

  // Returns all structureIds with mastery >= minMastery
  getKnownStructures(minMastery = 0.1) {
    const result = [];
    for (const [id, entry] of this._knowledge) {
      if (entry.mastery >= minMastery) result.push(id);
    }
    return result;
  }

  // Returns a snapshot array of { id, mastery } sorted by mastery desc
  snapshot() {
    return [...this._knowledge.entries()]
      .map(([id, e]) => ({ id, mastery: e.mastery }))
      .sort((a, b) => b.mastery - a.mastery);
  }

  // URP S-functional: S = ΔC + κ·ΔI
  //   ΔC = structural breadth (known / total)
  //   ΔI = coherence (structures whose full prerequisite chain is satisfied)
  //   κ  = capacity field passed in from agent (hunger * 0.5 + energy * 0.5)
  computeS(kappa) {
    const allIds = Object.keys(STRUCTURE_DEF);
    const total  = allIds.length;
    const known  = this.getKnownStructures(0.1);
    const sC     = total > 0 ? known.length / total : 0;

    let coherent = 0;
    for (const id of known) {
      const def = STRUCTURE_DEF[id];
      if (!def) continue;
      if (def.prereqs.every(p => this.getMastery(p) >= 0.4)) coherent++;
    }
    const sI = known.length > 0 ? coherent / known.length : 0;

    return { sC, sI, kappa, S: sC + kappa * sI, knownCount: known.length, total };
  }

  // Called once per world tick — apply forgetting
  // ritualMastery reduces decay (SU3 triad stabilises knowledge in community context)
  tick(ritualMastery = 0) {
    const decayRate = BASE_DECAY_RATE * (1 - ritualMastery * 0.6);
    for (const [id, entry] of this._knowledge) {
      entry.lastUsed++;
      if (entry.lastUsed > 100) {
        entry.mastery -= decayRate * (entry.lastUsed / 100);
      }
      if (entry.mastery < FORGET_THRESHOLD) {
        this._knowledge.delete(id);
      }
    }
  }
}
