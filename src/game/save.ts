import { NATURE_OBJECT_SPECS } from './assets';
import {
  DAY_START_MINUTES,
  ITEMS,
  MAX_STAMINA,
  QUICK_BAR_SIZE,
  RESOURCE_TARGET_CONFIG,
  SEASON_LENGTH_DAYS,
  STARTING_GOLD,
  TILE_SIZE,
  WATERING_CAN_MAX,
} from './constants';
import {
  PLAYER_SPAWN_TILE,
  buildHomesteadStructures,
  buildHomesteadTerrain,
  createDirtInteriorVariantGrid,
  createGrassVariantGrid,
  createInitialBuildingObjects,
  createInitialWorldObjects,
} from './map';
import { normalizeFarmTiles } from './farming';
import { createInitialQuestStates, normalizeQuestStates } from './npcs';
import { SAVE_VERSION, type InventorySlot, type Stage1SaveData, type WorldObject } from './types';

const SAVE_STORAGE_KEY = 'suncrest_valley_autosave_v1';

export function createInitialQuickBar(): (InventorySlot | null)[] {
  const slots: (InventorySlot | null)[] = Array.from({ length: QUICK_BAR_SIZE }, () => null);
  slots[0] = { itemId: 'hoe', count: 1 };
  slots[1] = { itemId: 'watering_can', count: 1, waterLevel: WATERING_CAN_MAX };
  slots[2] = { itemId: 'axe', count: 1 };
  slots[3] = { itemId: 'pickaxe', count: 1 };
  return slots;
}

export function createNewGameState(): Stage1SaveData {
  const terrain = buildHomesteadTerrain();
  const structures = buildHomesteadStructures();
  const buildingObjects = createInitialBuildingObjects();
  return {
    saveVersion: SAVE_VERSION,
    tileSize: TILE_SIZE,
    season: 'Spring',
    seasonLengthDays: SEASON_LENGTH_DAYS,
    day: 1,
    timeMinutes: DAY_START_MINUTES,
    gold: STARTING_GOLD,
    totalEarned: 0,
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    bannerRestored: false,
    player: {
      x: (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE,
      y: (PLAYER_SPAWN_TILE.row + 0.65) * TILE_SIZE,
      facing: 'down',
    },
    quickBar: createInitialQuickBar(),
    selectedSlot: 0,
    farmTiles: {},
    shippingBin: {},
    grassVariants: createGrassVariantGrid(),
    dirtInteriorVariants: createDirtInteriorVariantGrid(),
    buildingObjects,
    worldObjects: createInitialWorldObjects(terrain, structures, buildingObjects),
    questStates: createInitialQuestStates(),
    lastSavedAt: new Date().toISOString(),
  };
}

function normalizeWorldObjects(
  rawObjects: unknown,
  scaleRatio: number,
  fromVersion: number,
): WorldObject[] | null {
  if (!Array.isArray(rawObjects)) return null;
  const result: WorldObject[] = [];
  for (const item of rawObjects) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<WorldObject>;
    if (!obj.id || !obj.type || !(obj.type in NATURE_OBJECT_SPECS)) continue;
    const spec = NATURE_OBJECT_SPECS[obj.type];
    const targetMax = RESOURCE_TARGET_CONFIG[obj.type]?.hitsRequired ?? spec.maxHealth;
    const prevMax =
      typeof obj.maxHealth === 'number' && obj.maxHealth > 0 ? Math.floor(obj.maxHealth) : targetMax;
    const prevHealth =
      typeof obj.health === 'number' && obj.health > 0 ? Math.floor(obj.health) : prevMax;

    let health = prevHealth;
    if (fromVersion < 3 && prevMax !== targetMax) {
      const hitsTaken = Math.max(0, prevMax - prevHealth);
      health = Math.max(1, targetMax - hitsTaken);
    } else {
      health = Math.max(1, Math.min(targetMax, prevHealth));
    }

    result.push({
      id: String(obj.id),
      type: obj.type,
      x: typeof obj.x === 'number' ? obj.x * scaleRatio : 0,
      y: typeof obj.y === 'number' ? obj.y * scaleRatio : 0,
      health,
      maxHealth: targetMax,
    });
  }
  return result;
}

export function loadAutoSave(): Stage1SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<Partial<Stage1SaveData>, 'saveVersion'> & {
      saveVersion?: number;
    };
    const parsedVersion = parsed?.saveVersion;
    if (
      !parsed ||
      (parsedVersion !== SAVE_VERSION &&
        parsedVersion !== 3 &&
        parsedVersion !== 2 &&
        parsedVersion !== 1)
    ) {
      return null;
    }
    if (
      typeof parsed.day !== 'number' ||
      typeof parsed.gold !== 'number' ||
      typeof parsed.totalEarned !== 'number' ||
      typeof parsed.stamina !== 'number' ||
      !parsed.player ||
      !Array.isArray(parsed.quickBar)
    ) {
      return null;
    }

    const quickBar: (InventorySlot | null)[] = Array.from({ length: QUICK_BAR_SIZE }, (_, idx) => {
      const slot = parsed.quickBar?.[idx];
      if (
        !slot ||
        typeof slot.itemId !== 'string' ||
        !(slot.itemId in ITEMS) ||
        typeof slot.count !== 'number'
      ) {
        return null;
      }
      return {
        itemId: slot.itemId,
        count: Math.max(1, slot.count),
        waterLevel: typeof slot.waterLevel === 'number' ? slot.waterLevel : undefined,
      };
    });

    if (parsedVersion < 3) {
      for (const toolId of ['axe', 'pickaxe'] as const) {
        if (!quickBar.some((s) => s?.itemId === toolId)) {
          const emptyIdx = quickBar.findIndex((s) => s === null);
          if (emptyIdx !== -1) {
            quickBar[emptyIdx] = { itemId: toolId, count: 1 };
          }
        }
      }
    }

    const prevTileSize = typeof parsed.tileSize === 'number' && parsed.tileSize > 0 ? parsed.tileSize : 48;
    const scaleRatio = TILE_SIZE / prevTileSize;

    const terrain = buildHomesteadTerrain();
    const structures = buildHomesteadStructures();
    const buildingObjects =
      Array.isArray(parsed.buildingObjects) && parsed.buildingObjects.length > 0
        ? parsed.buildingObjects
        : createInitialBuildingObjects();
    const normalizedWorldObjects = normalizeWorldObjects(
      parsed.worldObjects,
      parsedVersion === 1 && prevTileSize !== TILE_SIZE ? scaleRatio : 1,
      parsedVersion,
    );

    const clampedDay = Math.max(1, Math.min(SEASON_LENGTH_DAYS, Math.floor(parsed.day)));
    const season = parsed.season === 'Spring' ? 'Spring' : 'Spring';

    return {
      saveVersion: SAVE_VERSION,
      tileSize: TILE_SIZE,
      season,
      seasonLengthDays: SEASON_LENGTH_DAYS,
      day: clampedDay,
      timeMinutes:
        typeof parsed.timeMinutes === 'number' ? parsed.timeMinutes : DAY_START_MINUTES,
      gold: Math.max(0, Math.floor(parsed.gold)),
      totalEarned: Math.max(0, Math.floor(parsed.totalEarned)),
      stamina: Math.max(0, Math.min(MAX_STAMINA, Math.floor(parsed.stamina))),
      maxStamina: MAX_STAMINA,
      bannerRestored: Boolean(parsed.bannerRestored),
      player: {
        x:
          typeof parsed.player.x === 'number'
            ? parsed.player.x * scaleRatio
            : (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE,
        y:
          typeof parsed.player.y === 'number'
            ? parsed.player.y * scaleRatio
            : (PLAYER_SPAWN_TILE.row + 0.65) * TILE_SIZE,
        facing: parsed.player.facing ?? 'down',
      },
      quickBar,
      selectedSlot:
        typeof parsed.selectedSlot === 'number'
          ? Math.max(0, Math.min(QUICK_BAR_SIZE - 1, parsed.selectedSlot))
          : 0,
      farmTiles: normalizeFarmTiles(parsed.farmTiles),
      shippingBin: parsed.shippingBin && typeof parsed.shippingBin === 'object' ? parsed.shippingBin : {},
      grassVariants: Array.isArray(parsed.grassVariants)
        ? parsed.grassVariants
        : createGrassVariantGrid(),
      dirtInteriorVariants: Array.isArray(parsed.dirtInteriorVariants)
        ? parsed.dirtInteriorVariants
        : createDirtInteriorVariantGrid(),
      buildingObjects,
      worldObjects:
        normalizedWorldObjects ?? createInitialWorldObjects(terrain, structures, buildingObjects),
      questStates: normalizeQuestStates(parsed.questStates),
      lastSavedAt: typeof parsed.lastSavedAt === 'string' ? parsed.lastSavedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeAutoSave(data: Stage1SaveData): void {
  try {
    const payload: Stage1SaveData = {
      ...data,
      saveVersion: SAVE_VERSION,
      tileSize: TILE_SIZE,
      lastSavedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearAutoSave(): void {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
