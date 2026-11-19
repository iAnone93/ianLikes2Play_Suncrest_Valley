export const SAVE_VERSION = 4 as const;

export type SeasonName = 'Spring';

export type GamePhase =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'SHOP'
  | 'COOKING'
  | 'SLEEP_CONFIRM'
  | 'DAY_SUMMARY'
  | 'SEASON_END'
  | 'DIALOGUE'
  | 'QUEST_LOG';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type NpcId = 'tobias' | 'lila' | 'marcus';

export type QuestStatus = 'not_started' | 'active' | 'ready' | 'completed';

export interface NpcState {
  id: NpcId;
  x: number;
  y: number;
  facing: Direction;
  animOffsetMs: number;
}

export interface DialogueLine {
  speaker: 'npc' | 'player';
  speakerName: string;
  text: string;
  expression?: string;
  portraitSheet: string | null;
  portraitManifestPath: string | null;
  portraitSize: number;
  portraitKey: NpcId | 'player' | null;
}

export interface ActiveDialogueSnapshot {
  npcId: NpcId;
  lines: DialogueLine[];
  lineIndex: number;
}

export interface QuestSummaryItem {
  npcId: NpcId;
  npcName: string;
  npcRole: string;
  title: string;
  description: string;
  requiredItemId: ItemId;
  requiredCount: number;
  currentCount: number;
  rewardGold?: number;
  rewardItem?: { itemId: ItemId; count: number };
  status: QuestStatus;
}

export type CropId = 'turnip' | 'potato' | 'strawberry';

export type SeedItemId = 'turnip_seed' | 'potato_seed' | 'strawberry_seed';

export type ToolItemId = 'hoe' | 'watering_can' | 'axe' | 'pickaxe';

export type ResourceItemId = 'wood' | 'stone';

export type DishItemId =
  | 'boiled_turnip'
  | 'roasted_potato'
  | 'strawberry_jam'
  | 'veggie_stew';

export type ShippableItemId = CropId | DishItemId;

export type ItemId = ToolItemId | SeedItemId | CropId | ResourceItemId | DishItemId;

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
  category: 'tool' | 'seed' | 'crop' | 'resource' | 'dish';
  description: string;
  cropId?: CropId;
  sellPrice?: number;
  staminaRestore?: number;
  maxStack?: number;
}

export type TerrainKind = 'grass' | 'dirt' | 'farm_plot' | 'water';

export type GrassVariantKey = 'grass_1' | 'grass_2' | 'grass_3' | 'grass_4';

export type DirtInteriorKey = '255' | 'dirt_2' | 'dirt_3';

export type StructureKind = 'banner';

export type NatureObjectType =
  | 'oak_tree'
  | 'pine_tree'
  | 'boulder'
  | 'bush'
  | 'stump'
  | 'rock'
  | 'flower_white'
  | 'flower_yellow'
  | 'flower_pink';

export type BuildingObjectType =
  | 'farmhouse'
  | 'seed_stall'
  | 'well'
  | 'shipping_bin'
  | 'shipping_bin_empty'
  | 'signpost'
  | 'banner_unrestored'
  | 'banner_restored'
  | 'gate_closed'
  | 'gate_open'
  | 'fence_h'
  | 'fence_end_left'
  | 'fence_end_right'
  | 'fence_v'
  | 'fence_post';

export interface WorldObject {
  id: string;
  type: NatureObjectType;
  /** Bottom-center anchor X in world pixels */
  x: number;
  /** Bottom-center anchor Y in world pixels */
  y: number;
  health: number;
  maxHealth: number;
}

export interface BuildingObject {
  id: string;
  type: BuildingObjectType;
  /** Bottom-center anchor X in world pixels */
  x: number;
  /** Bottom-center anchor Y in world pixels */
  y: number;
}

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
  x: number; // Pixel world position (bottom-center anchor)
  y: number;
  facing: Direction;
  animTimer: number;
  isMoving: boolean;
  actionTimer: number;
  actionTool: ItemId | null;
}

export interface ShippedLineItem {
  cropId: ShippableItemId;
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
  nextDayIsLastDayOfSeason: boolean;
}

export interface SeasonEndSummaryData {
  seasonCompleted: SeasonName;
  seasonEndMode: 'die' | 'stop';
  dayCompleted: number;
  passedOut: boolean;
  shippedItems: ShippedLineItem[];
  earningsToday: number;
  newGold: number;
  totalEarned: number;
  cropsRemovedCount: number;
  witheredMessage: string | null;
  bannerJustRestored: boolean;
}

export interface Stage1SaveData {
  saveVersion: typeof SAVE_VERSION;
  tileSize?: number;
  season?: SeasonName;
  seasonLengthDays?: number;
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
  shippingBin: Partial<Record<ShippableItemId, number>>;
  grassVariants?: GrassVariantKey[][];
  dirtInteriorVariants?: DirtInteriorKey[][];
  worldObjects?: WorldObject[];
  buildingObjects?: BuildingObject[];
  questStates?: Partial<Record<NpcId, QuestStatus>>;
  lastSavedAt: string;
}

export type CookingStationType = 'stove';

export interface CookingIngredientStatus {
  itemId: ItemId;
  name: string;
  have: number;
  need: number;
  missing: boolean;
}

export interface CookingRecipeSummary {
  id: DishItemId;
  name: string;
  staminaRestore: number;
  sellPrice: number;
  ingredients: CookingIngredientStatus[];
  canCraft: boolean;
}

export interface CookingStationSnapshot {
  id: string;
  type: CookingStationType;
  label: string;
  modalTitle: string;
  modalSubtitle: string;
  recipes: CookingRecipeSummary[];
  feedbackMessage: string | null;
}

export interface HudSnapshot {
  phase: GamePhase;
  season: SeasonName;
  seasonLengthDays: number;
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
  pickupMessage: string | null;
  warningMessage: string | null;
  bannerCelebrationVisible: boolean;
  daySummary: DaySummaryData | null;
  seasonSummary: SeasonEndSummaryData | null;
  dialogue: ActiveDialogueSnapshot | null;
  cookingStation: CookingStationSnapshot | null;
  quests: QuestSummaryItem[];
}
