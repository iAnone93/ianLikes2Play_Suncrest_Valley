import { BUILDING_OBJECT_SPECS, NATURE_OBJECT_SPECS } from './assets';
import { MAP_COLS, MAP_ROWS, PIXEL_SCALE, RESOURCE_TARGET_CONFIG, TILE_SIZE } from './constants';
import { NPC_DEFINITIONS, NPC_LIST } from './npcs';
import type {
  BuildingObject,
  BuildingObjectType,
  DirtInteriorKey,
  GrassVariantKey,
  NatureObjectType,
  NpcState,
  StructureKind,
  TerrainKind,
  WorldObject,
} from './types';

export const PLAYER_SPAWN_TILE = { col: 4, row: 5 };

export const FARM_PLOT_BOUNDS = {
  minCol: 7,
  maxCol: 12, // 6 columns -> x = 448 .. 832
  minRow: 8,
  maxRow: 11, // 4 rows -> y = 512 .. 768
};

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function buildHomesteadTerrain(): TerrainKind[][] {
  const grid: TerrainKind[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'grass' as TerrainKind),
  );

  // 1-tile doorstep path right under the Farmhouse door
  grid[4][4] = 'dirt';

  // 1-tile spur leading to the Homestead Banner
  grid[4][11] = 'dirt';

  // 2-tile-wide main path in front of Farmhouse, Shipping Bin, and Signpost
  for (let r = 5; r <= 6; r++) {
    for (let c = 4; c <= 11; c++) {
      grid[r][c] = 'dirt';
    }
  }

  // 1-tile-wide path continuing east to the Seed Shop Stall
  for (let c = 12; c <= 16; c++) {
    grid[5][c] = 'dirt';
  }

  // 2-tile-wide path leading south to the Farm Plot gate (cols 9..10)
  grid[7][9] = 'dirt';
  grid[7][10] = 'dirt';

  // 1-tile-wide path branching south to the Stone Water Well
  for (let r = 6; r <= 8; r++) {
    grid[r][15] = 'dirt';
  }

  // 6 x 4 = 24-tile Farm Plot
  for (let r = FARM_PLOT_BOUNDS.minRow; r <= FARM_PLOT_BOUNDS.maxRow; r++) {
    for (let c = FARM_PLOT_BOUNDS.minCol; c <= FARM_PLOT_BOUNDS.maxCol; c++) {
      grid[r][c] = 'farm_plot';
    }
  }

  // Natural pond in southeast corner (4 x 3)
  for (let r = 11; r <= 13; r++) {
    for (let c = 16; c <= 19; c++) {
      grid[r][c] = 'water';
    }
  }

  return grid;
}

export function buildHomesteadStructures(): (StructureKind | null)[][] {
  const grid: (StructureKind | null)[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => null),
  );

  // Homestead Banner post along the courtyard north edge
  grid[3][11] = 'banner';

  return grid;
}

export function isSolidStructure(kind: StructureKind | null): boolean {
  if (kind === 'banner') return false;
  return kind !== null;
}

export function createGrassVariantGrid(): GrassVariantKey[][] {
  const keys: GrassVariantKey[] = ['grass_1', 'grass_2', 'grass_3', 'grass_4'];
  return Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => keys[Math.floor(Math.random() * keys.length)]),
  );
}

export function createDirtInteriorVariantGrid(): DirtInteriorKey[][] {
  const choices: DirtInteriorKey[] = ['255', 'dirt_2', 'dirt_3'];
  return Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => choices[Math.floor(Math.random() * choices.length)]),
  );
}

/**
 * Computes the 8-neighbor autotile bitmask for terrain_v2.
 * Bits: N=1, E=2, S=4, W=8, NE=16, SE=32, SW=64, NW=128.
 * Neighbors outside map boundaries count as the SAME terrain.
 * Diagonal bits are cleared unless both adjacent cardinal bits are set.
 */
export function computeNeighborBitmask(
  col: number,
  row: number,
  isSameAt: (c: number, r: number) => boolean,
): number {
  const check = (c: number, r: number): boolean => {
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
    return isSameAt(c, r);
  };

  const n = check(col, row - 1);
  const e = check(col + 1, row);
  const s = check(col, row + 1);
  const w = check(col - 1, row);
  const ne = n && e && check(col + 1, row - 1);
  const se = s && e && check(col + 1, row + 1);
  const sw = s && w && check(col - 1, row + 1);
  const nw = n && w && check(col - 1, row - 1);

  return (
    (n ? 1 : 0) |
    (e ? 2 : 0) |
    (s ? 4 : 0) |
    (w ? 8 : 0) |
    (ne ? 16 : 0) |
    (se ? 32 : 0) |
    (sw ? 64 : 0) |
    (nw ? 128 : 0)
  );
}

export function getCollisionRectFromSpec(
  anchorX: number,
  anchorY: number,
  collision: [number, number] | null,
): { left: number; top: number; right: number; bottom: number } | null {
  if (!collision) return null;
  const collW = collision[0] * PIXEL_SCALE;
  const collH = collision[1] * PIXEL_SCALE;
  return {
    left: anchorX - collW / 2,
    right: anchorX + collW / 2,
    top: anchorY - collH,
    bottom: anchorY,
  };
}

export function getObjectCollisionRect(obj: WorldObject) {
  return getCollisionRectFromSpec(obj.x, obj.y, NATURE_OBJECT_SPECS[obj.type].collision);
}

export function getBuildingCollisionRect(obj: BuildingObject) {
  return getCollisionRectFromSpec(obj.x, obj.y, BUILDING_OBJECT_SPECS[obj.type].collision);
}

export function getNpcCollisionRect(npc: Pick<NpcState, 'id' | 'x' | 'y'>) {
  const def = NPC_DEFINITIONS[npc.id];
  return getCollisionRectFromSpec(npc.x, npc.y, [def.collision[0], def.collision[1]]);
}

export function getBannerAnchor(col: number, row: number): { x: number; y: number } {
  return {
    x: Math.round((col + 0.5) * TILE_SIZE),
    y: Math.round((row + 1) * TILE_SIZE),
  };
}

export function getBannerCollisionRect(col: number, row: number, restored = false) {
  const anchor = getBannerAnchor(col, row);
  const spec = BUILDING_OBJECT_SPECS[restored ? 'banner_restored' : 'banner_unrestored'];
  return getCollisionRectFromSpec(anchor.x, anchor.y, spec.collision);
}

export function createInitialBuildingObjects(): BuildingObject[] {
  const items: BuildingObject[] = [];
  let seq = 1;

  const add = (type: BuildingObjectType, x: number, y: number, idOverride?: string) => {
    items.push({
      id: idOverride ?? `bld_${seq++}`,
      type,
      x: Math.round(x),
      y: Math.round(y),
    });
  };

  add('farmhouse', 288, 278, 'farmhouse');
  add('shipping_bin', 476, 286, 'shipping_bin');
  add('signpost', 580, 290, 'signpost');
  add('seed_stall', 1024, 294, 'seed_stall');
  add('well', 992, 588, 'well');

  const addFenceRow = (startX: number, y: number, pieces: BuildingObjectType[]) => {
    let cursorX = startX;
    for (const type of pieces) {
      const halfW = (BUILDING_OBJECT_SPECS[type].w * PIXEL_SCALE) / 2;
      const anchorX = cursorX + halfW;
      const id = type === 'gate_closed' || type === 'gate_open' ? 'farm_gate' : undefined;
      add(type, anchorX, y, id);
      cursorX += halfW * 2;
    }
  };

  addFenceRow(442, 504, [
    'fence_end_left',
    'fence_h',
    'fence_h',
    'gate_closed',
    'fence_h',
    'fence_h',
    'fence_end_right',
  ]);

  addFenceRow(442, 786, [
    'fence_end_left',
    'fence_h',
    'fence_h',
    'fence_h',
    'fence_h',
    'fence_h',
    'fence_end_right',
  ]);

  for (const vy of [552, 602, 652, 702, 752]) {
    add('fence_v', 451, vy);
    add('fence_v', 829, vy);
  }

  return items;
}

export function createInitialWorldObjects(
  terrain: TerrainKind[][],
  structures: (StructureKind | null)[][],
  buildings: BuildingObject[] = createInitialBuildingObjects(),
): WorldObject[] {
  const objects: WorldObject[] = [];
  let seq = 1;

  const pushObj = (type: NatureObjectType, col: number, row: number, offsetX = 0, offsetY = 0) => {
    const spec = NATURE_OBJECT_SPECS[type];
    const maxHealth = RESOURCE_TARGET_CONFIG[type]?.hitsRequired ?? spec.maxHealth;
    objects.push({
      id: `obj_${seq++}`,
      type,
      x: Math.round((col + 0.5) * TILE_SIZE + offsetX),
      y: Math.round((row + 0.85) * TILE_SIZE + offsetY),
      health: maxHealth,
      maxHealth,
    });
  };

  const borderTrees: [NatureObjectType, number, number, number, number][] = [
    ['oak_tree', 0.8, 0.7, -8, 6],
    ['pine_tree', 2.2, 0.7, 4, 2],
    ['oak_tree', 6.5, 0.6, 0, 4],
    ['pine_tree', 9.2, 0.7, -6, 4],
    ['oak_tree', 12.6, 0.6, 6, 2],
    ['pine_tree', 18.8, 0.7, 0, 4],
    ['oak_tree', 20.5, 0.8, 6, 8],

    ['pine_tree', 0.7, 2.5, -4, 0],
    ['oak_tree', 0.8, 4.7, 2, -4],
    ['pine_tree', 0.6, 7.0, 4, 2],
    ['oak_tree', 0.9, 9.4, -4, 4],
    ['pine_tree', 0.7, 11.7, 2, 0],
    ['oak_tree', 0.9, 14.1, 4, 4],

    ['oak_tree', 20.6, 2.7, -4, 4],
    ['pine_tree', 20.5, 5.0, 2, -2],
    ['oak_tree', 20.7, 7.3, -2, 6],
    ['pine_tree', 20.5, 9.6, 4, 0],
    ['oak_tree', 20.7, 12.2, -4, 6],
    ['pine_tree', 20.5, 14.3, 2, 4],

    ['oak_tree', 2.8, 14.4, 0, 6],
    ['pine_tree', 5.2, 14.5, -6, 4],
    ['oak_tree', 8.0, 14.4, 8, 6],
    ['pine_tree', 11.2, 14.5, -4, 4],
    ['oak_tree', 14.1, 14.4, 4, 6],
    ['pine_tree', 17.2, 14.6, -6, 2],
  ];

  for (const [type, col, row, ox, oy] of borderTrees) {
    pushObj(type, col, row, ox, oy);
  }

  pushObj('stump', 2, 7, 10, -4);
  pushObj('stump', 18, 2, -6, 6);
  pushObj('boulder', 2, 12, -4, 4);
  pushObj('boulder', 19, 8, 6, -6);
  pushObj('rock', 3, 13, 12, -2);
  pushObj('rock', 14, 12, 8, 4);
  pushObj('rock', 13, 2, -6, 6);
  pushObj('bush', 2, 3, -6, 6);
  pushObj('bush', 18, 6, 8, 4);
  pushObj('bush', 14, 13, -8, 6);
  pushObj('bush', 5, 12, 10, 4);

  const isFlowerType = (type: NatureObjectType): boolean =>
    type === 'flower_white' || type === 'flower_yellow' || type === 'flower_pink';

  const canPlaceFlowerAt = (fx: number, fy: number, ignoreId?: string): boolean => {
    if (isPointInBannerClearance(fx, fy, structures)) return false;

    const hitsNature = objects.some((o) => {
      if (o.id === ignoreId) return false;
      const rect = getObjectCollisionRect(o);
      if (!rect) return Math.hypot(o.x - fx, o.y - fy) < 36;
      return (
        fx >= rect.left - 18 &&
        fx <= rect.right + 18 &&
        fy >= rect.top - 16 &&
        fy <= rect.bottom + 14
      );
    });
    if (hitsNature) return false;

    const hitsNpc = NPC_LIST.some((npc) => Math.hypot(npc.homeX - fx, npc.homeY - fy) < 48);
    if (hitsNpc) return false;

    const hitsBuilding = buildings.some((b) => {
      const rect = getBuildingCollisionRect(b);
      if (!rect) return false;
      return (
        fx >= rect.left - 22 &&
        fx <= rect.right + 22 &&
        fy >= rect.top - 20 &&
        fy <= rect.bottom + 18
      );
    });
    return !hitsBuilding;
  };

  const flowerTypes: NatureObjectType[] = ['flower_white', 'flower_yellow', 'flower_pink'];
  const candidateTiles: { col: number; row: number }[] = [];
  for (let r = 2; r <= MAP_ROWS - 3; r++) {
    for (let c = 2; c <= MAP_COLS - 3; c++) {
      if (terrain[r][c] !== 'grass') continue;
      if (structures[r][c] !== null) continue;
      if (isTileInBannerClearance(c, r, structures)) continue;
      if (c === PLAYER_SPAWN_TILE.col && r === PLAYER_SPAWN_TILE.row) continue;
      candidateTiles.push({ col: c, row: r });
    }
  }

  for (let i = candidateTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidateTiles[i], candidateTiles[j]] = [candidateTiles[j], candidateTiles[i]];
  }

  let placedFlowers = 0;
  for (const tile of candidateTiles) {
    if (placedFlowers >= 20) break;
    const fx = Math.round((tile.col + 0.25 + Math.random() * 0.5) * TILE_SIZE);
    const fy = Math.round((tile.row + 0.4 + Math.random() * 0.45) * TILE_SIZE);
    if (!canPlaceFlowerAt(fx, fy)) continue;

    const flowerType = flowerTypes[placedFlowers % flowerTypes.length];
    const spec = NATURE_OBJECT_SPECS[flowerType];
    objects.push({
      id: `obj_${seq++}`,
      type: flowerType,
      x: fx,
      y: fy,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
    });
    placedFlowers++;
  }

  // Ensure no flower somehow overlaps banner clearance
  return objects.filter((o) => !isFlowerType(o.type) || !isPointInBannerClearance(o.x, o.y, structures));
}

export function isTileInBannerClearance(
  col: number,
  row: number,
  structures: (StructureKind | null)[][],
): boolean {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (structures[r][c] !== 'banner') continue;
      if (Math.abs(col - c) <= 1 && Math.abs(row - r) <= 1) {
        return true;
      }
    }
  }
  return false;
}

export function isPointInBannerClearance(
  x: number,
  y: number,
  structures: (StructureKind | null)[][],
): boolean {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  return isTileInBannerClearance(col, row, structures);
}

export function relocateBannerClearanceFlowers(
  objects: WorldObject[],
  terrain: TerrainKind[][],
  structures: (StructureKind | null)[][],
  buildings: BuildingObject[],
): WorldObject[] {
  const isFlower = (type: NatureObjectType): boolean =>
    type === 'flower_white' || type === 'flower_yellow' || type === 'flower_pink';

  const result = objects.map((o) => ({ ...o }));
  const needsMove = result.filter(
    (o) => isFlower(o.type) && isPointInBannerClearance(o.x, o.y, structures),
  );
  if (needsMove.length === 0) return result;

  const isValidSpot = (fx: number, fy: number, movingId: string): boolean => {
    if (isPointInBannerClearance(fx, fy, structures)) return false;
    const hitsNature = result.some((o) => {
      if (o.id === movingId) return false;
      const rect = getObjectCollisionRect(o);
      if (!rect) return Math.hypot(o.x - fx, o.y - fy) < 36;
      return (
        fx >= rect.left - 18 &&
        fx <= rect.right + 18 &&
        fy >= rect.top - 16 &&
        fy <= rect.bottom + 14
      );
    });
    if (hitsNature) return false;

    const hitsNpc = NPC_LIST.some((npc) => Math.hypot(npc.homeX - fx, npc.homeY - fy) < 48);
    if (hitsNpc) return false;

    const hitsBuilding = buildings.some((b) => {
      const rect = getBuildingCollisionRect(b);
      if (!rect) return false;
      return (
        fx >= rect.left - 22 &&
        fx <= rect.right + 22 &&
        fy >= rect.top - 20 &&
        fy <= rect.bottom + 18
      );
    });
    return !hitsBuilding;
  };

  const openTiles: { col: number; row: number }[] = [];
  for (let r = 2; r <= MAP_ROWS - 3; r++) {
    for (let c = 2; c <= MAP_COLS - 3; c++) {
      if (terrain[r][c] !== 'grass') continue;
      if (structures[r][c] !== null) continue;
      if (isTileInBannerClearance(c, r, structures)) continue;
      if (c === PLAYER_SPAWN_TILE.col && r === PLAYER_SPAWN_TILE.row) continue;
      openTiles.push({ col: c, row: r });
    }
  }

  for (const flower of needsMove) {
    openTiles.sort((a, b) => {
      const da = Math.hypot((a.col + 0.5) * TILE_SIZE - flower.x, (a.row + 0.6) * TILE_SIZE - flower.y);
      const db = Math.hypot((b.col + 0.5) * TILE_SIZE - flower.x, (b.row + 0.6) * TILE_SIZE - flower.y);
      return da - db;
    });

    for (const tile of openTiles) {
      const fx = Math.round((tile.col + 0.5) * TILE_SIZE);
      const fy = Math.round((tile.row + 0.62) * TILE_SIZE);
      if (isValidSpot(fx, fy, flower.id)) {
        flower.x = fx;
        flower.y = fy;
        break;
      }
    }
  }

  return result;
}
