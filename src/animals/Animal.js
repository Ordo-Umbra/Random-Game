let _nextId = 0;

export const AnimalType = Object.freeze({
  DEER:   'deer',
  RABBIT: 'rabbit',
  WOLF:   'wolf',
});

export const ANIMAL_DEF = {
  deer: {
    name: 'Deer',
    color: '#8B6340',
    highlightColor: '#A87850',
    preferredTiles: ['grass', 'forest'],
    fleeRange:  5,
    moveEvery:  5,
    health:     3,
    foodValue:  0.45,
    drawSize:   0.12,
  },
  rabbit: {
    name: 'Rabbit',
    color: '#C0B090',
    highlightColor: '#D4C8A8',
    preferredTiles: ['grass', 'sand', 'dirt'],
    fleeRange:  7,
    moveEvery:  3,
    health:     1,
    foodValue:  0.20,
    drawSize:   0.06,
  },
  wolf: {
    name: 'Wolf',
    color: '#5A5A6A',
    highlightColor: '#707080',
    preferredTiles: ['grass', 'forest', 'dirt'],
    huntRange:  10,
    moveEvery:  4,
    health:     5,
    attackDmg:  0.18,   // energy drained from an attacked agent
    drawSize:   0.11,
  },
};

export class Animal {
  constructor(type, x, y) {
    this.id   = _nextId++;
    this.type = type;
    this.x    = x;
    this.y    = y;

    const def       = ANIMAL_DEF[type];
    this.health     = def.health;
    this.maxHealth  = def.health;
    this.age        = 0;
    this.state      = 'wander';   // 'wander' | 'flee' | 'hunt'

    this._moveTimer = Math.floor(Math.random() * def.moveEvery);
    this._path      = [];
    this._targetId  = null;
  }

  get alive()      { return this.health > 0; }
  get isPrey()     { return this.type !== 'wolf'; }
  get isPredator() { return this.type === 'wolf'; }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  stepPath() {
    if (!this._path.length) return false;
    const n = this._path.shift();
    this.x = n.x; this.y = n.y;
    return true;
  }

  setPath(p) { this._path = p ?? []; }
  clearPath() { this._path = []; }
  get hasPath() { return this._path.length > 0; }
}
