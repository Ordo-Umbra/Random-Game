// An agent's personal knowledge set.
// Each known structure has a mastery level 0.0–1.0.
// Mastery decays when unused and caps at 1.0.

const DECAY_RATE = 0.0001;       // mastery lost per tick when not actively used
const FORGET_THRESHOLD = 0.02;   // mastery below this is removed entirely

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

  // Called once per world tick — apply forgetting
  tick() {
    for (const [id, entry] of this._knowledge) {
      entry.lastUsed++;
      // Decay only when unused for a while
      if (entry.lastUsed > 100) {
        entry.mastery -= DECAY_RATE * (entry.lastUsed / 100);
      }
      if (entry.mastery < FORGET_THRESHOLD) {
        this._knowledge.delete(id);
      }
    }
  }
}
