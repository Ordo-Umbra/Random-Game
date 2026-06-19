const DECAY_TICKS = 600;

export class Skeleton {
  constructor(sourceType, x, y, tick, info = {}) {
    this.sourceType     = sourceType;  // 'agent' | 'deer' | 'rabbit' | 'wolf'
    this.x              = x;
    this.y              = y;
    this.diedAt         = tick;
    this.decayAt        = tick + DECAY_TICKS;

    // Agent-only fields
    this.agentId        = info.agentId        ?? null;
    this.agentAge       = info.agentAge       ?? null;
    this.corpusSnapshot = info.corpusSnapshot ?? [];
  }

  isDecayed(tick)        { return tick >= this.decayAt; }
  decayFraction(tick)    { return Math.min(1, (tick - this.diedAt) / DECAY_TICKS); }
  get isAgent()          { return this.sourceType === 'agent'; }
}
