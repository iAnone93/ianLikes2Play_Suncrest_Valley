import type { Direction } from './types';

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function getCtx(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D context for sprite atlas');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: string[],
  palette: Record<string, string>,
  offsetX = 0,
  offsetY = 0,
): void {
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
    }
  }
}

export interface SpriteAtlas {
  player: Record<Direction, HTMLCanvasElement[]>;
}

function buildFarmerFrames(): Record<Direction, HTMLCanvasElement[]> {
  const palette: Record<string, string> = {
    O: '#231710', // Dark outline
    H: '#E5B454', // Straw hat sunlit
    h: '#B8812D', // Straw hat band/shadow
    S: '#F4C7A1', // Skin
    E: '#231710', // Eyes
    R: '#C94A38', // Red shirt
    D: '#3B5E8C', // Blue overalls
    d: '#2A4468', // Overalls shadow
    B: '#593722', // Boots
  };

  const downIdle = [
    '....OOOOOO......',
    '...OHHHHHHO.....',
    '..OHHHHHHHHO....',
    '.OOhhhhhhhhOO...',
    '..OSSSSSSSSO....',
    '..OSEOSSESO.....',
    '..OSSSSSSSSO....',
    '...OORRRROO.....',
    '..ORODDDORO.....',
    '..ORODDDORO.....',
    '..OSODDDOSO.....',
    '...OODddDOO.....',
    '...OOD..DOO.....',
    '...OOB..BOO.....',
    '...OOO..OOO.....',
  ];

  const downStepA = [...downIdle];
  downStepA[12] = '...OOD..DOO.....';
  downStepA[13] = '..OOB...BOO.....';
  downStepA[14] = '..OOO....OO.....';

  const downStepB = [...downIdle];
  downStepB[13] = '...OOB...BOO....';
  downStepB[14] = '...OO....OOO....';

  const upIdle = [
    '....OOOOOO......',
    '...OHHHHHHO.....',
    '..OHHHHHHHHO....',
    '.OOhhhhhhhhOO...',
    '..OHHHHHHHHO....',
    '...OOhhhhOO.....',
    '...OORRRROO.....',
    '..ORRDDDDDRRO...',
    '..ORRDDDDDRRO...',
    '..OSRDDDDDRSO...',
    '...OODdddDOO....',
    '...OOD..DOO.....',
    '...OOB..BOO.....',
    '...OOO..OOO.....',
    '................',
  ];

  const upStepA = [...upIdle];
  upStepA[12] = '..OOB...BOO.....';

  const upStepB = [...upIdle];
  upStepB[12] = '...OOB...BOO....';

  const leftIdle = [
    '....OOOOOO......',
    '...OHHHHHHO.....',
    '..OHHHHHHHHO....',
    '.OOhhhhhhhhOO...',
    '...OSSSSSSO.....',
    '..OESSSSSO......',
    '...OSSSSSO......',
    '...OORRRRO......',
    '...ORRDDDO......',
    '...ORSDDDO......',
    '...OODddDO......',
    '....OD..DO......',
    '....OB..BO......',
    '....OO..OO......',
    '................',
  ];

  const leftStepA = [...leftIdle];
  leftStepA[12] = '...OOB..BOO.....';
  leftStepA[13] = '...OOO..OOO.....';

  const leftStepB = [...leftIdle];
  leftStepB[12] = '....OB...BO.....';
  leftStepB[13] = '....OO...OO.....';

  const makeFrom = (rows: string[], flipX = false): HTMLCanvasElement => {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    if (!flipX) {
      drawMatrix(ctx, rows, palette, 0, 1);
    } else {
      const mirrored = rows.map((r) => r.split('').reverse().join(''));
      drawMatrix(ctx, mirrored, palette, 0, 1);
    }
    return c;
  };

  return {
    down: [makeFrom(downIdle), makeFrom(downStepA), makeFrom(downStepB)],
    up: [makeFrom(upIdle), makeFrom(upStepA), makeFrom(upStepB)],
    left: [makeFrom(leftIdle), makeFrom(leftStepA), makeFrom(leftStepB)],
    right: [makeFrom(leftIdle, true), makeFrom(leftStepA, true), makeFrom(leftStepB, true)],
  };
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;
  cachedAtlas = {
    player: buildFarmerFrames(),
  };
  return cachedAtlas;
}
