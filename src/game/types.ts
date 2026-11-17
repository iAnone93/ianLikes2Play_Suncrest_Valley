export const SAVE_VERSION = 1 as const;

export type GamePhase = 'TITLE' | 'PLAYING' | 'PAUSED' | 'SHOP' | 'SLEEP_CONFIRM' | 'DAY_SUMMARY';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type CropId = 'turnip' | 'potato' | 'strawberry';

export type SeedItemId = 'turnip_seed' | 'potato_seed' | 'strawberry_seed';

export type ToolItemId = 'hoe' | 'watering_can';

export type ItemId = ToolItemId | SeedItemId | CropId;

export interface InventorySlot {
  itemId: ItemId;
  count: number;
  waterLevel?: number;
}

export interface CropDefinition {
  id: CropId;
  name: string;
  seedId: SeedItemId;
  seedName: string;
  seedCost: number;
  growDays: number;
  sellPrice: number;
  description: string;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: 'tool' | 'seed' | 'crop';
  description: string;
  cropId?: CropId;
  sellPrice?: number;
}

export type TileKind =
  | 'grass'
  | 'dirt_path'
  | 'farm_plot'
  | 'water'
  | 'house'
  | 'bed_door'
  | 'bin'
  | 'well'
  | 'shop'
  | 'banner'
  | 'fence'
  | 'tree';

export interface CropInstance {
  id: CropId;
  daysGrown: number;
  wateredToday: boolean;
}

export interface FarmTileState {
  tilled: boolean;
  watered: boolean;
  crop: CropInstance | null;
}

export interface PlayerState {
  x: number; // Pixel world position (center of feet)
  y: number;
  facing: Direction;
  animTimer: number;
  isMoving: boolean;
  actionTimer: number;
  actionTool: ItemId | null;
}

export interface ShippedLineItem {
  cropId: CropId;
  name: string;
  count: number;
  unitPrice: number;
  subtotal: number;
}

export interface DaySummaryData {
  dayCompleted: number;
  passedOut: boolean;
  shippedItems: ShippedLineItem[];
  earningsToday: number;
  newGold: number;
  totalEarned: number;
  bannerJustRestored: boolean;
}

export interface Stage1SaveData {
  saveVersion: typeof SAVE_VERSION;
  day: number;
  timeMinutes: number;
  gold: number;
  totalEarned: number;
  stamina: number;
  maxStamina: number;
  bannerRestored: boolean;
  player: {
    x: number;
    y: number;
    facing: Direction;
  };
  quickBar: (InventorySlot | null)[];
  selectedSlot: number;
  farmTiles: Record<string, FarmTileState>;
  shippingBin: Partial<Record<CropId, number>>;
  lastSavedAt: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  day: number;
  timeMinutes: number;
  gold: number;
  totalEarned: number;
  bannerGoal: number;
  bannerRestored: boolean;
  stamina: number;
  maxStamina: number;
  quickBar: (InventorySlot | null)[];
  selectedSlot: number;
  shippingCount: number;
  shippingValue: number;
  targetPrompt: string | null;
  toastMessage: string | null;
  bannerCelebrationVisible: boolean;
  daySummary: DaySummaryData | null;
}
