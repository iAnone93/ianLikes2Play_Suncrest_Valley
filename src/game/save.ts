import {
  DAY_START_MINUTES,
  MAX_STAMINA,
  QUICK_BAR_SIZE,
  STARTING_GOLD,
  TILE_SIZE,
  WATERING_CAN_MAX,
} from './constants';
import { PLAYER_SPAWN_TILE } from './map';
import { SAVE_VERSION, type InventorySlot, type Stage1SaveData } from './types';

const SAVE_STORAGE_KEY = 'suncrest_valley_autosave_v1';

export function createInitialQuickBar(): (InventorySlot | null)[] {
  const slots: (InventorySlot | null)[] = Array.from({ length: QUICK_BAR_SIZE }, () => null);
  slots[0] = { itemId: 'hoe', count: 1 };
  slots[1] = { itemId: 'watering_can', count: 1, waterLevel: WATERING_CAN_MAX };
  return slots;
}

export function createNewGameState(): Stage1SaveData {
  return {
    saveVersion: SAVE_VERSION,
    day: 1,
    timeMinutes: DAY_START_MINUTES,
    gold: STARTING_GOLD,
    totalEarned: 0,
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    bannerRestored: false,
    player: {
      x: (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE,
      y: (PLAYER_SPAWN_TILE.row + 0.5) * TILE_SIZE,
      facing: 'down',
    },
    quickBar: createInitialQuickBar(),
    selectedSlot: 0,
    farmTiles: {},
    shippingBin: {},
    lastSavedAt: new Date().toISOString(),
  };
}

export function loadAutoSave(): Stage1SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stage1SaveData>;
    if (!parsed || parsed.saveVersion !== SAVE_VERSION) {
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
      if (!slot || typeof slot.itemId !== 'string' || typeof slot.count !== 'number') {
        return null;
      }
      return {
        itemId: slot.itemId,
        count: Math.max(1, slot.count),
        waterLevel: typeof slot.waterLevel === 'number' ? slot.waterLevel : undefined,
      };
    });

    return {
      saveVersion: SAVE_VERSION,
      day: Math.max(1, Math.floor(parsed.day)),
      timeMinutes:
        typeof parsed.timeMinutes === 'number' ? parsed.timeMinutes : DAY_START_MINUTES,
      gold: Math.max(0, Math.floor(parsed.gold)),
      totalEarned: Math.max(0, Math.floor(parsed.totalEarned)),
      stamina: Math.max(0, Math.min(MAX_STAMINA, Math.floor(parsed.stamina))),
      maxStamina: MAX_STAMINA,
      bannerRestored: Boolean(parsed.bannerRestored),
      player: {
        x: typeof parsed.player.x === 'number' ? parsed.player.x : (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE,
        y: typeof parsed.player.y === 'number' ? parsed.player.y : (PLAYER_SPAWN_TILE.row + 0.5) * TILE_SIZE,
        facing: parsed.player.facing ?? 'down',
      },
      quickBar,
      selectedSlot:
        typeof parsed.selectedSlot === 'number'
          ? Math.max(0, Math.min(QUICK_BAR_SIZE - 1, parsed.selectedSlot))
          : 0,
      farmTiles: parsed.farmTiles && typeof parsed.farmTiles === 'object' ? parsed.farmTiles : {},
      shippingBin: parsed.shippingBin && typeof parsed.shippingBin === 'object' ? parsed.shippingBin : {},
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
