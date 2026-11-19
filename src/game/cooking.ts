import {
  BUILDING_INTERACT_RADIUS,
  COOKING_RECIPE_LIST,
  COOKING_RECIPES,
  ITEMS,
  PIXEL_SCALE,
  computeRecipeSellPrice,
} from './constants';
import type {
  CookingIngredientStatus,
  CookingRecipeSummary,
  CookingStationSnapshot,
  CookingStationType,
  DishItemId,
  ItemId,
} from './types';

export interface CookingStationTypeDefinition {
  type: CookingStationType;
  label: string;
  modalTitle: string;
  modalSubtitle: string;
  sprite: string | null;
  manifest: string | null;
  w: number;
  h: number;
  anchor: [number, number];
  hitbox: [number, number];
  collision: [number, number];
  shadow: readonly [number, number] | null;
  interactRange: number;
  recipes: DishItemId[];
}

export interface CookingStationObject {
  id: string;
  objectType: 'cooking_station';
  type: CookingStationType;
  sprite: string | null;
  manifest: string | null;
  w: number;
  h: number;
  anchor: [number, number];
  hitbox: [number, number];
  collision: [number, number];
  shadow: readonly [number, number] | null;
  interactRange: number;
  /** Bottom-center anchor X in world pixels */
  x: number;
  /** Bottom-center anchor Y in world pixels */
  y: number;
}

export const COOKING_STATION_TYPES: Record<CookingStationType, CookingStationTypeDefinition> = {
  stove: {
    type: 'stove',
    label: 'Stove',
    modalTitle: 'Homestead Stove',
    modalSubtitle: 'Cook fresh crops into nourishing meals or high-value dishes.',
    sprite: '/assets/aistudio/stove_48x56_d47af965.png?v=2',
    manifest: '/assets/aistudio/stove_manifest_c8fff043.json?v=2',
    w: 48,
    h: 56,
    anchor: [24, 54],
    hitbox: [32, 46],
    collision: [28, 14],
    shadow: [32, 10],
    interactRange: BUILDING_INTERACT_RADIUS,
    recipes: COOKING_RECIPE_LIST.filter((r) => r.stationType === 'stove').map((r) => r.id),
  },
};

function createCookingStation(
  id: string,
  type: CookingStationType,
  x: number,
  y: number,
): CookingStationObject {
  const spec = COOKING_STATION_TYPES[type];
  return {
    id,
    objectType: 'cooking_station',
    type,
    sprite: spec.sprite,
    manifest: spec.manifest,
    w: spec.w,
    h: spec.h,
    anchor: [...spec.anchor] as [number, number],
    hitbox: [...spec.hitbox] as [number, number],
    collision: [...spec.collision] as [number, number],
    shadow: spec.shadow ? ([...spec.shadow] as const) : null,
    interactRange: spec.interactRange,
    x: Math.round(x),
    y: Math.round(y),
  };
}

/**
 * Placed beside the farmhouse east wall (x = 414, y = 282):
 * Farmhouse sprite right edge is 395 (collision right 384), door is at x = 288,
 * shipping bin sprite left edge is 433 (collision left 442), main path starts at y = 320.
 */
export const COOKING_STATIONS: CookingStationObject[] = [
  createCookingStation('homestead_stove', 'stove', 414, 282),
];

export function getCookingStationCollisionRect(station: CookingStationObject): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const collW = station.collision[0] * PIXEL_SCALE;
  const collH = station.collision[1] * PIXEL_SCALE;
  return {
    left: station.x - collW / 2,
    right: station.x + collW / 2,
    top: station.y - collH,
    bottom: station.y,
  };
}

export function buildCookingStationSnapshot(
  station: CookingStationObject,
  countItem: (itemId: ItemId) => number,
  feedbackMessage: string | null = null,
): CookingStationSnapshot {
  const spec = COOKING_STATION_TYPES[station.type];
  const recipes: CookingRecipeSummary[] = spec.recipes.map((dishId) => {
    const def = COOKING_RECIPES[dishId];
    const ingredients: CookingIngredientStatus[] = def.ingredients.map((ing) => {
      const have = countItem(ing.itemId);
      return {
        itemId: ing.itemId,
        name: ITEMS[ing.itemId].name,
        have,
        need: ing.count,
        missing: have < ing.count,
      };
    });
    return {
      id: def.id,
      name: def.name,
      staminaRestore: def.staminaRestore,
      sellPrice: computeRecipeSellPrice(def.ingredients),
      ingredients,
      canCraft: ingredients.every((ing) => !ing.missing),
    };
  });

  return {
    id: station.id,
    type: station.type,
    label: spec.label,
    modalTitle: spec.modalTitle,
    modalSubtitle: spec.modalSubtitle,
    recipes,
    feedbackMessage,
  };
}
