import type { CropDefinition, CropId, ItemDefinition, ItemId, SeedItemId } from './types';

export const TILE_PIXEL_SIZE = 16;
export const PIXEL_SCALE = 3;
export const TILE_SIZE = TILE_PIXEL_SIZE * PIXEL_SCALE; // 48px on canvas

export const MAP_COLS = 22;
export const MAP_ROWS = 16;

export const STARTING_GOLD = 100;
export const BANNER_GOAL_GOLD = 500;
export const MAX_STAMINA = 100;
export const PASS_OUT_STAMINA_RATIO = 0.5;

export const HOE_STAMINA_COST = 2;
export const WATER_STAMINA_COST = 1;
export const WATERING_CAN_MAX = 20;

export const DAY_START_MINUTES = 6 * 60; // 06:00
export const DAY_PASS_OUT_MINUTES = 24 * 60; // 24:00
export const REAL_SECONDS_PER_GAME_MINUTE = 1;

export const QUICK_BAR_SIZE = 10;
export const PLAYER_SPEED_PX_PER_SEC = 156;
export const INTERACT_REACH_TILES = 1.65;

export const CROPS: Record<CropId, CropDefinition> = {
  turnip: {
    id: 'turnip',
    name: 'Turnip',
    seedId: 'turnip_seed',
    seedName: 'Turnip Seeds',
    seedCost: 20,
    growDays: 3,
    sellPrice: 45,
    description: 'Crisp purple-top root. Fast 3-day Spring harvest.',
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    seedId: 'potato_seed',
    seedName: 'Potato Seeds',
    seedCost: 40,
    growDays: 5,
    sellPrice: 90,
    description: 'Hearty golden tuber. Takes 5 watered days to mature.',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    seedId: 'strawberry_seed',
    seedName: 'Strawberry Seeds',
    seedCost: 60,
    growDays: 4,
    sellPrice: 130,
    description: 'Prized sweet ruby berry with the highest Spring value.',
  },
};

export const SEED_TO_CROP: Record<SeedItemId, CropId> = {
  turnip_seed: 'turnip',
  potato_seed: 'potato',
  strawberry_seed: 'strawberry',
};

export const ITEMS: Record<ItemId, ItemDefinition> = {
  hoe: {
    id: 'hoe',
    name: 'Rustic Hoe',
    category: 'tool',
    description: 'Tills farm plot soil. Costs 2 Stamina.',
  },
  watering_can: {
    id: 'watering_can',
    name: 'Watering Can',
    category: 'tool',
    description: 'Waters tilled soil (1 Stamina). Refill at the Well or Pond.',
  },
  turnip_seed: {
    id: 'turnip_seed',
    name: CROPS.turnip.seedName,
    category: 'seed',
    cropId: 'turnip',
    description: 'Plant in tilled soil. Matures in 3 watered days.',
  },
  potato_seed: {
    id: 'potato_seed',
    name: CROPS.potato.seedName,
    category: 'seed',
    cropId: 'potato',
    description: 'Plant in tilled soil. Matures in 5 watered days.',
  },
  strawberry_seed: {
    id: 'strawberry_seed',
    name: CROPS.strawberry.seedName,
    category: 'seed',
    cropId: 'strawberry',
    description: 'Plant in tilled soil. Matures in 4 watered days.',
  },
  turnip: {
    id: 'turnip',
    name: CROPS.turnip.name,
    category: 'crop',
    cropId: 'turnip',
    sellPrice: CROPS.turnip.sellPrice,
    description: 'Freshly harvested Turnip. Drop in Shipping Bin for 45G.',
  },
  potato: {
    id: 'potato',
    name: CROPS.potato.name,
    category: 'crop',
    cropId: 'potato',
    sellPrice: CROPS.potato.sellPrice,
    description: 'Earth-baked Potato. Drop in Shipping Bin for 90G.',
  },
  strawberry: {
    id: 'strawberry',
    name: CROPS.strawberry.name,
    category: 'crop',
    cropId: 'strawberry',
    sellPrice: CROPS.strawberry.sellPrice,
    description: 'Sweet Suncrest Strawberry. Drop in Shipping Bin for 130G.',
  },
};

export const SHOP_CATALOG: CropId[] = ['turnip', 'potato', 'strawberry'];

export function formatClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  const h24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const suffix = h24 >= 12 && h24 < 24 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${suffix}`;
}
