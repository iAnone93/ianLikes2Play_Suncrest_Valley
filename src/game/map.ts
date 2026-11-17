import { MAP_COLS, MAP_ROWS } from './constants';
import type { TileKind } from './types';

export const PLAYER_SPAWN_TILE = { col: 4, row: 5 };

export const FARM_PLOT_BOUNDS = {
  minCol: 7,
  maxCol: 12, // 6 columns
  minRow: 8,
  maxRow: 11, // 4 rows -> 24 tiles total
};

export const HOUSE_BOUNDS = {
  minCol: 3,
  maxCol: 5,
  minRow: 2,
  maxRow: 3,
};

export const SHOP_BOUNDS = {
  minCol: 15,
  maxCol: 17,
  minRow: 3,
  maxRow: 4,
};

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function buildHomesteadMap(): TileKind[][] {
  const grid: TileKind[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'grass' as TileKind),
  );

  // Perimeter trees
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        grid[r][c] = 'tree';
      }
    }
  }

  // Decorative corner trees for warm clearing silhouette
  const extraTrees: [number, number][] = [
    [1, 1],
    [2, 1],
    [19, 1],
    [20, 1],
    [1, 13],
    [1, 14],
    [20, 14],
    [10, 1],
    [11, 1],
  ];
  for (const [c, r] of extraTrees) {
    grid[r][c] = 'tree';
  }

  // Split-rail fences framing the upper homestead edge and path
  for (let c = 2; c <= 19; c++) {
    if (c >= 3 && c <= 5) continue;
    if (c === 10 || c === 11) continue;
    if (c >= 15 && c <= 17) continue;
    grid[1][c] = 'fence';
  }
  grid[7][6] = 'fence';
  grid[7][13] = 'fence';
  grid[12][6] = 'fence';
  grid[12][13] = 'fence';

  // Dirt paths connecting Farmhouse -> Banner/Bin -> Farm Plot -> Well & Seed Stall
  for (let c = 4; c <= 16; c++) {
    grid[5][c] = 'dirt_path';
  }
  grid[4][4] = 'dirt_path'; // Porch steps
  for (let r = 5; r <= 7; r++) {
    grid[r][9] = 'dirt_path';
    grid[r][10] = 'dirt_path';
  }
  for (let r = 5; r <= 9; r++) {
    grid[r][14] = 'dirt_path';
  }

  // Farmhouse (3x2 footprint; center bottom tile is interactive bed_door)
  for (let r = HOUSE_BOUNDS.minRow; r <= HOUSE_BOUNDS.maxRow; r++) {
    for (let c = HOUSE_BOUNDS.minCol; c <= HOUSE_BOUNDS.maxCol; c++) {
      grid[r][c] = 'house';
    }
  }
  grid[3][4] = 'bed_door';

  // Homestead Banner post prominently beside path & farmhouse
  grid[3][7] = 'banner';

  // Shipping Bin along the main path
  grid[4][7] = 'bin';

  // Seed Shop Stall on the east side
  for (let r = SHOP_BOUNDS.minRow; r <= SHOP_BOUNDS.maxRow; r++) {
    for (let c = SHOP_BOUNDS.minCol; c <= SHOP_BOUNDS.maxCol; c++) {
      grid[r][c] = 'shop';
    }
  }

  // 6 x 4 = 24-tile Farm Plot
  for (let r = FARM_PLOT_BOUNDS.minRow; r <= FARM_PLOT_BOUNDS.maxRow; r++) {
    for (let c = FARM_PLOT_BOUNDS.minCol; c <= FARM_PLOT_BOUNDS.maxCol; c++) {
      grid[r][c] = 'farm_plot';
    }
  }

  // Stone Water Well right east of the farm plot
  grid[9][15] = 'well';

  // Tranquil pond in southeast corner (also refills Watering Can)
  for (let r = 11; r <= 13; r++) {
    for (let c = 16; c <= 19; c++) {
      grid[r][c] = 'water';
    }
  }

  return grid;
}

export function isSolidTile(kind: TileKind): boolean {
  return (
    kind === 'water' ||
    kind === 'house' ||
    kind === 'bed_door' ||
    kind === 'bin' ||
    kind === 'well' ||
    kind === 'shop' ||
    kind === 'banner' ||
    kind === 'fence' ||
    kind === 'tree'
  );
}
