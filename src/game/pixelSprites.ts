import type { CropId, Direction, ItemId } from './types';

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

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
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
  grass: HTMLCanvasElement[];
  dirtPath: HTMLCanvasElement;
  farmUntilled: HTMLCanvasElement;
  soilTilled: HTMLCanvasElement;
  soilWatered: HTMLCanvasElement;
  water: HTMLCanvasElement[];
  fence: HTMLCanvasElement;
  tree: HTMLCanvasElement;
  farmhouse: HTMLCanvasElement;
  bin: HTMLCanvasElement;
  well: HTMLCanvasElement;
  shop: HTMLCanvasElement;
  bannerUnrestored: HTMLCanvasElement;
  bannerRestored: HTMLCanvasElement;
  crops: Record<CropId, HTMLCanvasElement[]>;
  player: Record<Direction, HTMLCanvasElement[]>;
  itemIcons: Record<ItemId, string>;
}

function buildGrassTile(variant: number): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  px(ctx, 0, 0, '#629844', 16, 16);

  // Warm sunlit dither speckles
  const lightSpots: [number, number][] =
    variant === 0
      ? [[2, 3], [11, 5], [6, 12], [13, 13]]
      : variant === 1
        ? [[4, 2], [9, 7], [2, 11], [12, 10]]
        : [[3, 4], [12, 3], [7, 9], [10, 14]];

  for (const [x, y] of lightSpots) {
    px(ctx, x, y, '#75AD52');
    px(ctx, x + 1, y + 1, '#528338');
  }

  if (variant === 1) {
    // Little grass blades
    px(ctx, 5, 6, '#487631');
    px(ctx, 6, 5, '#7EBA59');
    px(ctx, 11, 12, '#487631');
    px(ctx, 12, 11, '#7EBA59');
  } else if (variant === 2) {
    // Tiny spring meadow daisy
    px(ctx, 7, 6, '#F9F2D9');
    px(ctx, 6, 7, '#F9F2D9');
    px(ctx, 8, 7, '#F9F2D9');
    px(ctx, 7, 8, '#F9F2D9');
    px(ctx, 7, 7, '#E59A28');
  }
  return c;
}

function buildDirtPathTile(): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  px(ctx, 0, 0, '#C59A67', 16, 16);
  const darkPebbles: [number, number][] = [[2, 3], [10, 2], [5, 8], [13, 6], [3, 13], [11, 12]];
  const lightPebbles: [number, number][] = [[3, 2], [7, 5], [12, 9], [8, 13]];
  for (const [x, y] of darkPebbles) px(ctx, x, y, '#A77C4D', 2, 1);
  for (const [x, y] of lightPebbles) px(ctx, x, y, '#D8B180', 1, 1);
  return c;
}

function buildFarmUntilledTile(): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  px(ctx, 0, 0, '#9E734B', 16, 16);
  px(ctx, 0, 0, '#885F3B', 16, 1);
  px(ctx, 0, 0, '#885F3B', 1, 16);
  px(ctx, 3, 4, '#B0845A', 2, 1);
  px(ctx, 10, 6, '#885F3B', 2, 1);
  px(ctx, 6, 11, '#B0845A', 2, 1);
  px(ctx, 12, 12, '#885F3B', 1, 1);
  return c;
}

function buildSoilTile(watered: boolean): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  const base = watered ? '#422718' : '#734A2D';
  const ridgeLight = watered ? '#553421' : '#8A5B3A';
  const furrowDark = watered ? '#2B180E' : '#57351D';

  px(ctx, 0, 0, base, 16, 16);
  // Crisp outer rim
  px(ctx, 0, 0, furrowDark, 16, 1);
  px(ctx, 0, 15, furrowDark, 16, 1);
  px(ctx, 0, 0, furrowDark, 1, 16);
  px(ctx, 15, 0, furrowDark, 1, 16);

  // Horizontal tilled furrows
  for (const ry of [3, 7, 11]) {
    px(ctx, 2, ry, ridgeLight, 12, 1);
    px(ctx, 2, ry + 1, furrowDark, 12, 1);
  }
  return c;
}

function buildWaterTile(frame: number): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  px(ctx, 0, 0, '#3C87BC', 16, 16);
  px(ctx, 0, 0, '#2D6B99', 16, 2);
  const shift = frame * 3;
  px(ctx, (2 + shift) % 13, 5, '#72C0EA', 4, 1);
  px(ctx, (8 - shift + 13) % 13, 10, '#72C0EA', 3, 1);
  px(ctx, (4 + shift) % 12, 13, '#53A3D5', 3, 1);
  return c;
}

function buildFenceTile(): HTMLCanvasElement {
  const c = buildGrassTile(0);
  const ctx = getCtx(c);
  // Posts
  px(ctx, 1, 3, '#3B2314', 4, 11);
  px(ctx, 2, 4, '#7E5132', 2, 9);
  px(ctx, 2, 3, '#9E6B44', 2, 1);

  px(ctx, 11, 3, '#3B2314', 4, 11);
  px(ctx, 12, 4, '#7E5132', 2, 9);
  px(ctx, 12, 3, '#9E6B44', 2, 1);

  // Cross rails
  px(ctx, 0, 6, '#3B2314', 16, 3);
  px(ctx, 0, 7, '#8E5C39', 16, 1);
  px(ctx, 0, 10, '#3B2314', 16, 3);
  px(ctx, 0, 11, '#8E5C39', 16, 1);
  return c;
}

function buildTreeSprite(): HTMLCanvasElement {
  const c = createCanvas(20, 26);
  const ctx = getCtx(c);
  // Shadow
  px(ctx, 4, 22, 'rgba(20, 32, 14, 0.35)', 12, 3);
  // Trunk
  px(ctx, 7, 15, '#3B2314', 6, 9);
  px(ctx, 8, 16, '#74482B', 4, 7);
  px(ctx, 9, 16, '#8F5B38', 1, 7);
  // Layered leafy canopy
  px(ctx, 3, 4, '#244A1E', 14, 13);
  px(ctx, 2, 6, '#244A1E', 16, 9);
  px(ctx, 5, 2, '#244A1E', 10, 15);
  px(ctx, 4, 4, '#3D7830', 12, 11);
  px(ctx, 3, 6, '#3D7830', 14, 7);
  // Sunlit crown highlights
  px(ctx, 5, 3, '#5B9D41', 9, 7);
  px(ctx, 4, 5, '#5B9D41', 11, 5);
  px(ctx, 6, 4, '#78BA54', 6, 3);
  px(ctx, 12, 8, '#78BA54', 3, 2);
  return c;
}

function buildFarmhouseSprite(): HTMLCanvasElement {
  const c = createCanvas(48, 38);
  const ctx = getCtx(c);
  // Chimney
  px(ctx, 34, 1, '#4A3A36', 7, 10);
  px(ctx, 35, 2, '#826E68', 5, 8);
  px(ctx, 33, 0, '#5A4A46', 9, 2);
  // Roof
  px(ctx, 2, 6, '#4D231B', 44, 14);
  px(ctx, 4, 4, '#9B3F2E', 40, 14);
  px(ctx, 6, 2, '#B54E3A', 36, 4);
  // Roof shingle bands
  for (let ry = 5; ry < 18; ry += 3) {
    px(ctx, 4, ry, '#7D3022', 40, 1);
  }
  // Eave trim
  px(ctx, 2, 18, '#F4EAD5', 44, 2);
  // Cottage walls
  px(ctx, 5, 20, '#3B2314', 38, 17);
  px(ctx, 6, 20, '#EEDEC0', 36, 15);
  // Timber beams
  px(ctx, 6, 20, '#6E452A', 2, 15);
  px(ctx, 40, 20, '#6E452A', 2, 15);
  px(ctx, 6, 34, '#7C6E63', 36, 3);
  // Cozy warm window (left)
  px(ctx, 10, 23, '#3B2314', 7, 7);
  px(ctx, 11, 24, '#F7C95C', 5, 5);
  px(ctx, 13, 24, '#5E3B24', 1, 5);
  px(ctx, 11, 26, '#5E3B24', 5, 1);
  // Cozy warm window (right)
  px(ctx, 31, 23, '#3B2314', 7, 7);
  px(ctx, 32, 24, '#F7C95C', 5, 5);
  px(ctx, 34, 24, '#5E3B24', 1, 5);
  px(ctx, 32, 26, '#5E3B24', 5, 1);
  // Front door (center bottom aligns with col 4, row 3)
  px(ctx, 20, 22, '#3B2314', 8, 14);
  px(ctx, 21, 23, '#8F5733', 6, 13);
  px(ctx, 22, 24, '#A86940', 4, 4);
  px(ctx, 25, 29, '#E59A28', 1, 2);
  // Stone welcome step
  px(ctx, 19, 36, '#9B9287', 10, 2);
  return c;
}

function buildShippingBinSprite(): HTMLCanvasElement {
  const c = createCanvas(16, 18);
  const ctx = getCtx(c);
  px(ctx, 1, 4, '#2B190E', 14, 13);
  px(ctx, 2, 5, '#8A5633', 12, 11);
  // Slatted lid
  px(ctx, 1, 3, '#2B190E', 14, 5);
  px(ctx, 2, 4, '#A86B3E', 12, 3);
  px(ctx, 2, 5, '#BD7D4B', 12, 1);
  // Iron corner straps
  px(ctx, 2, 4, '#4B5563', 2, 12);
  px(ctx, 12, 4, '#4B5563', 2, 12);
  px(ctx, 7, 6, '#E59A28', 2, 2); // Gold clasp
  return c;
}

function buildWellSprite(): HTMLCanvasElement {
  const c = createCanvas(16, 22);
  const ctx = getCtx(c);
  // Roof posts & little gable
  px(ctx, 2, 4, '#3B2314', 2, 11);
  px(ctx, 12, 4, '#3B2314', 2, 11);
  px(ctx, 1, 2, '#4D231B', 14, 4);
  px(ctx, 2, 1, '#A44230', 12, 4);
  px(ctx, 4, 0, '#BD523D', 8, 2);
  // Rope & bucket
  px(ctx, 7, 5, '#D8C39E', 1, 6);
  px(ctx, 6, 9, '#7E5132', 3, 3);
  // Cobblestone base
  px(ctx, 1, 12, '#3B3734', 14, 9);
  px(ctx, 2, 13, '#8D867E', 12, 7);
  px(ctx, 3, 13, '#3C87BC', 10, 2); // Water inside
  px(ctx, 4, 16, '#A8A096', 3, 2);
  px(ctx, 9, 17, '#A8A096', 3, 2);
  px(ctx, 6, 18, '#746D66', 3, 2);
  return c;
}

function buildShopStallSprite(): HTMLCanvasElement {
  const c = createCanvas(48, 36);
  const ctx = getCtx(c);
  // Back frame & posts
  px(ctx, 4, 8, '#3B2314', 40, 26);
  px(ctx, 6, 12, '#4F3422', 36, 14);
  // Seed sacks inside stall
  px(ctx, 10, 17, '#D4B684', 6, 7);
  px(ctx, 11, 18, '#B8955E', 4, 4);
  px(ctx, 18, 17, '#D4B684', 6, 7);
  px(ctx, 19, 19, '#5A8F49', 2, 2);
  px(ctx, 26, 16, '#C94A38', 6, 8);
  px(ctx, 34, 17, '#E59A28', 5, 7);
  // Market counter
  px(ctx, 3, 23, '#3B2314', 42, 12);
  px(ctx, 4, 24, '#A4693D', 40, 3);
  px(ctx, 4, 27, '#7D4E2B', 40, 7);
  // Signboard
  px(ctx, 18, 27, '#F4EAD5', 12, 6);
  px(ctx, 21, 29, '#4C8A38', 6, 2);
  // Striped red & cream awning
  px(ctx, 2, 3, '#3B2314', 44, 12);
  for (let x = 3; x < 45; x += 6) {
    px(ctx, x, 4, '#C94A38', 3, 9);
    px(ctx, x + 3, 4, '#F4EAD5', 3, 9);
  }
  px(ctx, 3, 13, '#8F3124', 42, 2);
  return c;
}

function buildBannerSprite(restored: boolean): HTMLCanvasElement {
  const c = createCanvas(16, 26);
  const ctx = getCtx(c);
  // Base stone & post
  px(ctx, 4, 21, '#6C645E', 8, 4);
  px(ctx, 7, 3, '#3B2314', 3, 19);
  px(ctx, 8, 4, '#8A5834', 1, 17);
  px(ctx, 6, 2, '#E59A28', 5, 2); // Finial

  if (!restored) {
    // Weathered crooked board & frayed cloth scrap
    px(ctx, 3, 6, '#5A412F', 10, 4);
    px(ctx, 4, 7, '#7D5C43', 8, 2);
    px(ctx, 9, 10, '#A89B84', 4, 4);
    px(ctx, 10, 14, '#A89B84', 2, 2);
  } else {
    // Unfurled golden-and-crimson Suncrest Banner
    px(ctx, 2, 5, '#3B2314', 12, 2);
    px(ctx, 3, 7, '#9F2B20', 10, 11);
    px(ctx, 4, 7, '#C94A38', 8, 9);
    // Gold trim & sun emblem
    px(ctx, 4, 16, '#E59A28', 8, 1);
    px(ctx, 5, 17, '#E59A28', 6, 1);
    px(ctx, 7, 9, '#F7D259', 2, 4);
    px(ctx, 6, 10, '#F7D259', 4, 2);
  }
  return c;
}

function buildCropSprites(): Record<CropId, HTMLCanvasElement[]> {
  const buildStage = (drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const c = createCanvas(16, 16);
    drawFn(getCtx(c));
    return c;
  };

  // Stage 0: Seeds scattered in soil
  const seeds = buildStage((ctx) => {
    px(ctx, 4, 10, '#DFC48C', 2, 2);
    px(ctx, 9, 8, '#C9A86A', 2, 2);
    px(ctx, 7, 12, '#DFC48C', 2, 1);
    px(ctx, 11, 11, '#C9A86A', 1, 2);
  });

  // Stage 1: Tiny green sprout
  const sprout = buildStage((ctx) => {
    px(ctx, 7, 10, '#3C752D', 2, 4);
    px(ctx, 5, 8, '#65AD45', 3, 2);
    px(ctx, 8, 9, '#7EC857', 3, 2);
  });

  // Stage 2: Leafy mid-growth
  const growing = (accent: string) =>
    buildStage((ctx) => {
      px(ctx, 6, 8, '#2D5C22', 4, 6);
      px(ctx, 4, 6, '#4E9438', 8, 5);
      px(ctx, 5, 5, '#72B94D', 6, 3);
      px(ctx, 7, 7, accent, 2, 2);
    });

  const turnipRipe = buildStage((ctx) => {
    // Lush leaves
    px(ctx, 4, 2, '#346D28', 8, 6);
    px(ctx, 5, 3, '#67B346', 6, 4);
    px(ctx, 3, 4, '#509436', 3, 3);
    px(ctx, 10, 4, '#509436', 3, 3);
    // Purple-top white turnip bulb
    px(ctx, 4, 8, '#3B2314', 8, 7);
    px(ctx, 5, 8, '#9D53A8', 6, 3);
    px(ctx, 5, 11, '#F7F1E1', 6, 3);
    px(ctx, 6, 14, '#E0D6C0', 4, 1);
  });

  const potatoRipe = buildStage((ctx) => {
    // Bushy green foliage + small white blossoms
    px(ctx, 3, 3, '#2F6623', 10, 7);
    px(ctx, 4, 4, '#579E3C', 8, 5);
    px(ctx, 5, 3, '#76BE51', 3, 2);
    px(ctx, 10, 4, '#FFF8DF', 2, 2);
    // Golden russet potatoes poking from earth
    px(ctx, 3, 10, '#4A2C16', 5, 5);
    px(ctx, 4, 11, '#CE9446', 3, 3);
    px(ctx, 8, 9, '#4A2C16', 5, 5);
    px(ctx, 9, 10, '#DDA655', 3, 3);
  });

  const strawberryRipe = buildStage((ctx) => {
    // Berry bush
    px(ctx, 2, 3, '#2A5C20', 12, 10);
    px(ctx, 3, 4, '#4B8E35', 10, 8);
    px(ctx, 5, 3, '#69B048', 6, 4);
    // Bright ruby strawberries
    px(ctx, 4, 8, '#D93232', 3, 4);
    px(ctx, 5, 9, '#F7B4A8', 1, 1);
    px(ctx, 9, 7, '#D93232', 3, 4);
    px(ctx, 10, 8, '#F7B4A8', 1, 1);
    px(ctx, 7, 11, '#C42525', 3, 3);
    px(ctx, 7, 5, '#FFF8DF', 2, 2); // Blossom
  });

  return {
    turnip: [seeds, sprout, growing('#7EC857'), turnipRipe],
    potato: [seeds, sprout, growing('#A6C455'), potatoRipe],
    strawberry: [seeds, sprout, growing('#F5EAE0'), strawberryRipe],
  };
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

function buildItemIcons(crops: Record<CropId, HTMLCanvasElement[]>): Record<ItemId, string> {
  const palette: Record<string, string> = {
    O: '#231710',
    W: '#9B653B',
    w: '#6D4325',
    M: '#9CA3AF',
    m: '#D1D5DB',
    C: '#5B9BD5',
    c: '#2E6DA4',
    P: '#D9B98A',
    p: '#B38E5B',
    G: '#5AA443',
    R: '#D93232',
    U: '#9D53A8',
    Y: '#DDA655',
  };

  const hoeArt = [
    '................',
    '.........OOOOO..',
    '........OMmmmMO.',
    '........OMmOOwO.',
    '.......OO..OwO..',
    '......OwO..OwO..',
    '.....OwO...OO...',
    '....OwO.........',
    '...OwO..........',
    '..OwO...........',
    '.OwO............',
    '.OO.............',
    '................',
    '................',
    '................',
    '................',
  ];

  const canArt = [
    '................',
    '................',
    '.....OOOOOO.....',
    '....OCCCCCCCO...',
    '..OOOCcOOOOcO...',
    '.OCcOCcO..OcO...',
    'OCCcOCCCCCCCO...',
    'OCCcOCCCCCCCcO..',
    '.OO.OCCCCCCcO...',
    '....OCccccCcO...',
    '....OCCCCCCcO...',
    '....OcccccccO...',
    '.....OOOOOOO....',
    '................',
    '................',
    '................',
  ];

  const makeSeedPacket = (emblemColor: string): string => {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    px(ctx, 3, 2, '#231710', 10, 12);
    px(ctx, 4, 3, '#DFC08E', 8, 10);
    px(ctx, 4, 3, '#C7A26B', 8, 2);
    px(ctx, 6, 7, emblemColor, 4, 4);
    px(ctx, 7, 6, '#4E9438', 2, 1);
    return c.toDataURL();
  };

  const toUrl = (rows: string[]): string => {
    const c = createCanvas(16, 16);
    drawMatrix(getCtx(c), rows, palette, 0, 0);
    return c.toDataURL();
  };

  return {
    hoe: toUrl(hoeArt),
    watering_can: toUrl(canArt),
    turnip_seed: makeSeedPacket('#9D53A8'),
    potato_seed: makeSeedPacket('#CE9446'),
    strawberry_seed: makeSeedPacket('#D93232'),
    turnip: crops.turnip[3].toDataURL(),
    potato: crops.potato[3].toDataURL(),
    strawberry: crops.strawberry[3].toDataURL(),
  };
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;
  const crops = buildCropSprites();
  cachedAtlas = {
    grass: [buildGrassTile(0), buildGrassTile(1), buildGrassTile(2)],
    dirtPath: buildDirtPathTile(),
    farmUntilled: buildFarmUntilledTile(),
    soilTilled: buildSoilTile(false),
    soilWatered: buildSoilTile(true),
    water: [buildWaterTile(0), buildWaterTile(1)],
    fence: buildFenceTile(),
    tree: buildTreeSprite(),
    farmhouse: buildFarmhouseSprite(),
    bin: buildShippingBinSprite(),
    well: buildWellSprite(),
    shop: buildShopStallSprite(),
    bannerUnrestored: buildBannerSprite(false),
    bannerRestored: buildBannerSprite(true),
    crops,
    player: buildFarmerFrames(),
    itemIcons: buildItemIcons(crops),
  };
  return cachedAtlas;
}
