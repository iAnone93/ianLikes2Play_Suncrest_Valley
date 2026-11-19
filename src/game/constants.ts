import type {
  CookingStationType,
  CropDefinition,
  CropId,
  DishItemId,
  ItemDefinition,
  ItemId,
  NatureObjectType,
  ResourceItemId,
  SeedItemId,
} from './types';

export const TILE_PIXEL_SIZE = 32;
export const PIXEL_SCALE = 2; // Exact integer scaling for 32x32 tiles & 32x48 farmer & nature objects
export const TILE_SIZE = TILE_PIXEL_SIZE * PIXEL_SCALE; // 64px on canvas

export const MAP_COLS = 22;
export const MAP_ROWS = 16;

export const STARTING_GOLD = 100;
export const BANNER_GOAL_GOLD = 500;
export const MAX_STAMINA = 100;
export const PASS_OUT_STAMINA_RATIO = 0.5;

export const HOE_STAMINA_COST = 2;
export const WATER_STAMINA_COST = 1;
export const AXE_STAMINA_COST = 3;
export const PICKAXE_STAMINA_COST = 3;
export const WATERING_CAN_MAX = 20;
export const MAX_RESOURCE_STACK = 99;

export interface ResourceTargetRule {
  requiredTool: 'axe' | 'pickaxe';
  hitsRequired: number;
  dropItem: ResourceItemId;
  dropCount: number;
  becomesType?: NatureObjectType;
  wrongToolHint: string;
  shakeDurationSec: number;
}

export const RESOURCE_TARGET_CONFIG: Partial<Record<NatureObjectType, ResourceTargetRule>> = {
  oak_tree: {
    requiredTool: 'axe',
    hitsRequired: 5,
    dropItem: 'wood',
    dropCount: 6,
    becomesType: 'stump',
    wrongToolHint: 'Needs the axe',
    shakeDurationSec: 0.15,
  },
  pine_tree: {
    requiredTool: 'axe',
    hitsRequired: 5,
    dropItem: 'wood',
    dropCount: 6,
    becomesType: 'stump',
    wrongToolHint: 'Needs the axe',
    shakeDurationSec: 0.15,
  },
  stump: {
    requiredTool: 'axe',
    hitsRequired: 3,
    dropItem: 'wood',
    dropCount: 2,
    wrongToolHint: 'Needs the axe',
    shakeDurationSec: 0.15,
  },
  boulder: {
    requiredTool: 'pickaxe',
    hitsRequired: 6,
    dropItem: 'stone',
    dropCount: 8,
    wrongToolHint: 'Needs the pickaxe',
    shakeDurationSec: 0.15,
  },
  rock: {
    requiredTool: 'pickaxe',
    hitsRequired: 2,
    dropItem: 'stone',
    dropCount: 2,
    wrongToolHint: 'Needs the pickaxe',
    shakeDurationSec: 0.15,
  },
};

export const DAY_START_MINUTES = 6 * 60; // 06:00
export const DAY_PASS_OUT_MINUTES = 24 * 60; // 24:00
export const REAL_SECONDS_PER_GAME_MINUTE = 1;

export const SEASON_LENGTH_DAYS = 28;
export type SeasonEndCropsMode = 'die' | 'stop';
export const SEASON_END_CROPS: SeasonEndCropsMode = 'die';

export const QUICK_BAR_SIZE = 10;
export const PLAYER_SPEED_PX_PER_SEC = 196;
export const INTERACT_REACH_TILES = 1.65;
export const BUILDING_INTERACT_RADIUS = TILE_SIZE * 1.15;
export const DISH_SELL_MULTIPLIER = 1.6;
export const CROP_MAX_STACK: number | undefined = undefined;

export interface RecipeIngredient {
  itemId: ItemId;
  count: number;
}

export interface CookingRecipeDefinition {
  id: DishItemId;
  stationType: CookingStationType;
  name: string;
  ingredients: RecipeIngredient[];
  staminaRestore: number;
  description: string;
}

export const COOKING_RECIPES: Record<DishItemId, CookingRecipeDefinition> = {
  boiled_turnip: {
    id: 'boiled_turnip',
    stationType: 'stove',
    name: 'Boiled Turnip',
    ingredients: [{ itemId: 'turnip', count: 1 }],
    staminaRestore: 15,
    description: 'Steaming buttered turnip. Restores 15 Stamina.',
  },
  roasted_potato: {
    id: 'roasted_potato',
    stationType: 'stove',
    name: 'Roasted Potato',
    ingredients: [{ itemId: 'potato', count: 1 }],
    staminaRestore: 20,
    description: 'Crisp hearth-roasted potato. Restores 20 Stamina.',
  },
  strawberry_jam: {
    id: 'strawberry_jam',
    stationType: 'stove',
    name: 'Strawberry Jam',
    ingredients: [{ itemId: 'strawberry', count: 2 }],
    staminaRestore: 25,
    description: 'Sweet ruby berry preserve. Restores 25 Stamina.',
  },
  veggie_stew: {
    id: 'veggie_stew',
    stationType: 'stove',
    name: 'Veggie Stew',
    ingredients: [
      { itemId: 'turnip', count: 1 },
      { itemId: 'potato', count: 1 },
    ],
    staminaRestore: 40,
    description: 'Hearty root vegetable stew. Restores 40 Stamina.',
  },
};

export const COOKING_RECIPE_LIST: CookingRecipeDefinition[] = [
  COOKING_RECIPES.boiled_turnip,
  COOKING_RECIPES.roasted_potato,
  COOKING_RECIPES.strawberry_jam,
  COOKING_RECIPES.veggie_stew,
];

export function computeRecipeSellPrice(ingredients: readonly RecipeIngredient[]): number {
  const ingredientSum = ingredients.reduce((sum, ing) => {
    const unitPrice = ITEMS[ing.itemId]?.sellPrice ?? 0;
    return sum + unitPrice * ing.count;
  }, 0);
  return Math.round(DISH_SELL_MULTIPLIER * ingredientSum);
}

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
  axe: {
    id: 'axe',
    name: 'Woodcutter Axe',
    category: 'tool',
    description: 'Chops trees and stumps for Wood. Costs 3 Stamina.',
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Miner Pickaxe',
    category: 'tool',
    description: 'Breaks boulders and rocks for Stone. Costs 3 Stamina.',
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
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return CROPS.turnip.sellPrice;
    },
    description: 'Freshly harvested Turnip. Drop in Shipping Bin for 45G.',
  },
  potato: {
    id: 'potato',
    name: CROPS.potato.name,
    category: 'crop',
    cropId: 'potato',
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return CROPS.potato.sellPrice;
    },
    description: 'Earth-baked Potato. Drop in Shipping Bin for 90G.',
  },
  strawberry: {
    id: 'strawberry',
    name: CROPS.strawberry.name,
    category: 'crop',
    cropId: 'strawberry',
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return CROPS.strawberry.sellPrice;
    },
    description: 'Sweet Suncrest Strawberry. Drop in Shipping Bin for 130G.',
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    category: 'resource',
    maxStack: MAX_RESOURCE_STACK,
    description: 'Sturdy homestead timber for crafting and building.',
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    category: 'resource',
    maxStack: MAX_RESOURCE_STACK,
    description: 'Rough quarry stone for crafting and building.',
  },
  boiled_turnip: {
    id: 'boiled_turnip',
    name: 'Boiled Turnip',
    category: 'dish',
    staminaRestore: 15,
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return computeRecipeSellPrice(COOKING_RECIPES.boiled_turnip.ingredients);
    },
    description: 'Eat for +15 Stamina, or ship in the Shipping Bin.',
  },
  roasted_potato: {
    id: 'roasted_potato',
    name: 'Roasted Potato',
    category: 'dish',
    staminaRestore: 20,
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return computeRecipeSellPrice(COOKING_RECIPES.roasted_potato.ingredients);
    },
    description: 'Eat for +20 Stamina, or ship in the Shipping Bin.',
  },
  strawberry_jam: {
    id: 'strawberry_jam',
    name: 'Strawberry Jam',
    category: 'dish',
    staminaRestore: 25,
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return computeRecipeSellPrice(COOKING_RECIPES.strawberry_jam.ingredients);
    },
    description: 'Eat for +25 Stamina, or ship in the Shipping Bin.',
  },
  veggie_stew: {
    id: 'veggie_stew',
    name: 'Veggie Stew',
    category: 'dish',
    staminaRestore: 40,
    maxStack: CROP_MAX_STACK,
    get sellPrice() {
      return computeRecipeSellPrice(COOKING_RECIPES.veggie_stew.ingredients);
    },
    description: 'Eat for +40 Stamina, or ship in the Shipping Bin.',
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
