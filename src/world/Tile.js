export const TileType = Object.freeze({
  DEEP_WATER: 'deep_water',
  SHALLOW_WATER: 'shallow_water',
  SAND: 'sand',
  GRASS: 'grass',
  DIRT: 'dirt',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  SNOW: 'snow',
});

// Per-type rendering config and properties
export const TILE_DEF = {
  [TileType.DEEP_WATER]:    { color: '#1a4a7a', topColor: '#1e5a9a', passable: false, resource: null },
  [TileType.SHALLOW_WATER]: { color: '#2a6aaa', topColor: '#3080c0', passable: false, resource: 'fish' },
  [TileType.SAND]:          { color: '#b8a060', topColor: '#d4b870', passable: true,  resource: null },
  [TileType.GRASS]:         { color: '#2d6e2d', topColor: '#3a8a3a', passable: true,  resource: 'food' },
  [TileType.DIRT]:          { color: '#6b4a2a', topColor: '#8a5e38', passable: true,  resource: null },
  [TileType.FOREST]:        { color: '#1a4a1a', topColor: '#2a6a2a', passable: true,  resource: 'wood' },
  [TileType.MOUNTAIN]:      { color: '#5a5a6a', topColor: '#7a7a8a', passable: false, resource: 'stone' },
  [TileType.SNOW]:          { color: '#8a9aaa', topColor: '#c0d0e0', passable: true,  resource: 'stone' },
};

export class Tile {
  constructor(type, elevation = 0) {
    this.type = type;
    this.elevation = elevation;   // 0.0 – 1.0
    this.moisture = 0;
    this.fertility = 0;

    // What has been built on this tile by agents (null or a Structure id)
    this.structure = null;

    // How many ticks this tile has been disturbed (clear-cut forest, etc.)
    this.disturbance = 0;
  }

  get passable() {
    if (this.structure && this.structure.blocksMovement) return false;
    return TILE_DEF[this.type].passable;
  }

  get resource() {
    return TILE_DEF[this.type].resource;
  }

  get color() {
    return TILE_DEF[this.type].color;
  }

  get topColor() {
    return TILE_DEF[this.type].topColor;
  }
}
