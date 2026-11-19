import { CROPS, SEASON_LENGTH_DAYS, SEED_TO_CROP } from './constants';
import type { CropId, FarmTileState, SeedItemId } from './types';

export function canTillTile(tile: FarmTileState | undefined): boolean {
  return !tile?.tilled;
}

export function canWaterTile(tile: FarmTileState | undefined): boolean {
  return Boolean(tile?.tilled) && !tile?.watered;
}

export function canPlantOnTile(tile: FarmTileState | undefined): boolean {
  return Boolean(tile?.tilled) && !tile?.crop;
}

export function isPlantingTooLate(
  cropId: CropId,
  currentDay: number,
  seasonLengthDays = SEASON_LENGTH_DAYS,
): boolean {
  const daysLeft = seasonLengthDays - currentDay;
  return daysLeft < CROPS[cropId].growDays;
}

export function tillTile(): FarmTileState {
  return {
    tilled: true,
    watered: false,
    crop: null,
  };
}

export function waterTile(tile: FarmTileState): boolean {
  if (!canWaterTile(tile)) return false;
  tile.watered = true;
  if (tile.crop) {
    tile.crop.wateredToday = true;
  }
  return true;
}

export function plantSeedOnTile(tile: FarmTileState, seedId: SeedItemId): CropId | null {
  if (!canPlantOnTile(tile)) return null;
  const cropId = SEED_TO_CROP[seedId];
  tile.crop = {
    id: cropId,
    daysGrown: 0,
    wateredToday: tile.watered,
  };
  return cropId;
}

export function advanceDayFarmTiles(farmTiles: Record<string, FarmTileState>): void {
  for (const key of Object.keys(farmTiles)) {
    const tile = farmTiles[key];
    if (tile.crop) {
      if (tile.watered) {
        const maxDays = CROPS[tile.crop.id].growDays;
        tile.crop.daysGrown = Math.min(maxDays, tile.crop.daysGrown + 1);
      }
      tile.crop.wateredToday = false;
    }
    tile.watered = false;
  }
}

export function endSeasonDieFarmTiles(farmTiles: Record<string, FarmTileState>): number {
  let removedCount = 0;
  for (const key of Object.keys(farmTiles)) {
    const tile = farmTiles[key];
    if (tile.crop) {
      tile.crop = null;
      removedCount++;
    }
    tile.watered = false;
  }
  return removedCount;
}

export function endSeasonStopFarmTiles(farmTiles: Record<string, FarmTileState>): void {
  for (const key of Object.keys(farmTiles)) {
    const tile = farmTiles[key];
    if (tile.crop) {
      tile.crop.wateredToday = false;
    }
    tile.watered = false;
  }
}

export function normalizeFarmTiles(
  rawTiles: unknown,
): Record<string, FarmTileState> {
  const normalized: Record<string, FarmTileState> = {};
  if (!rawTiles || typeof rawTiles !== 'object') return normalized;

  for (const [key, value] of Object.entries(rawTiles as Record<string, Partial<FarmTileState>>)) {
    if (!value || typeof value !== 'object') continue;
    const tilled = Boolean(value.tilled);
    const watered = tilled && Boolean(value.watered);
    const crop =
      tilled && value.crop && typeof value.crop === 'object' && value.crop.id in CROPS
        ? {
            id: value.crop.id,
            daysGrown: Math.max(0, Math.floor(Number(value.crop.daysGrown) || 0)),
            wateredToday: watered || Boolean(value.crop.wateredToday),
          }
        : null;
    normalized[key] = { tilled, watered, crop };
  }
  return normalized;
}
