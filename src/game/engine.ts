import {
  BUILDING_OBJECT_SPECS,
  FARMER_DIRECTION_ROW,
  FARMER_FRAME_H,
  FARMER_FRAME_W,
  NATURE_OBJECT_SPECS,
  SPRITE_SHADOW_SPECS,
  getLoadedSpriteSheets,
  type FarmerActionManifest,
  type FarmerIdleManifest,
  type LoadedSpriteSheets,
} from './assets';
import {
  BUILDING_INTERACT_RADIUS,
  AXE_STAMINA_COST,
  BANNER_GOAL_GOLD,
  COOKING_RECIPES,
  CROPS,
  DAY_PASS_OUT_MINUTES,
  DAY_START_MINUTES,
  HOE_STAMINA_COST,
  INTERACT_REACH_TILES,
  ITEMS,
  MAP_COLS,
  MAP_ROWS,
  MAX_STAMINA,
  PASS_OUT_STAMINA_RATIO,
  PICKAXE_STAMINA_COST,
  PIXEL_SCALE,
  PLAYER_SPEED_PX_PER_SEC,
  QUICK_BAR_SIZE,
  REAL_SECONDS_PER_GAME_MINUTE,
  RESOURCE_TARGET_CONFIG,
  SEASON_END_CROPS,
  SEASON_LENGTH_DAYS,
  SEED_TO_CROP,
  TILE_SIZE,
  WATER_STAMINA_COST,
  WATERING_CAN_MAX,
  formatClock,
  type RecipeIngredient,
  type SeasonEndCropsMode,
} from './constants';
import {
  COOKING_STATIONS,
  COOKING_STATION_TYPES,
  buildCookingStationSnapshot,
  getCookingStationCollisionRect,
  type CookingStationObject,
} from './cooking';
import {
  advanceDayFarmTiles,
  canPlantOnTile,
  canTillTile,
  canWaterTile,
  endSeasonDieFarmTiles,
  endSeasonStopFarmTiles,
  isPlantingTooLate,
  normalizeFarmTiles,
  plantSeedOnTile,
  tillTile,
  waterTile,
} from './farming';
import {
  FARM_PLOT_BOUNDS,
  PLAYER_SPAWN_TILE,
  buildHomesteadStructures,
  buildHomesteadTerrain,
  computeNeighborBitmask,
  createDirtInteriorVariantGrid,
  createGrassVariantGrid,
  createInitialBuildingObjects,
  createInitialWorldObjects,
  getBannerAnchor,
  getBannerCollisionRect,
  getBuildingCollisionRect,
  getNpcCollisionRect,
  getObjectCollisionRect,
  isSolidStructure,
  relocateBannerClearanceFlowers,
  tileKey,
} from './map';
import {
  NPC_DEFINITIONS,
  NPC_LIST,
  buildDialogueLinesForNpc,
  createInitialNpcs,
  createInitialQuestStates,
  normalizeQuestStates,
  type NpcDialogueScene,
} from './npcs';
import { getSpriteAtlas, type SpriteAtlas } from './pixelSprites';
import { createNewGameState, loadAutoSave, writeAutoSave } from './save';
import {
  SAVE_VERSION,
  type ActiveDialogueSnapshot,
  type BuildingObject,
  type BuildingObjectType,
  type CropId,
  type DaySummaryData,
  type Direction,
  type DirtInteriorKey,
  type DishItemId,
  type FarmTileState,
  type GamePhase,
  type GrassVariantKey,
  type HudSnapshot,
  type InventorySlot,
  type ItemId,
  type NatureObjectType,
  type NpcId,
  type NpcState,
  type PlayerState,
  type QuestStatus,
  type QuestSummaryItem,
  type SeasonEndSummaryData,
  type SeasonName,
  type SeedItemId,
  type ShippableItemId,
  type ShippedLineItem,
  type Stage1SaveData,
  type StructureKind,
  type TerrainKind,
  type WorldObject,
} from './types';

type HudListener = (snapshot: HudSnapshot) => void;

const NPC_INTERACT_RADIUS = TILE_SIZE * 1.25;
const PLAYER_HALF_W = 14;
const PLAYER_HALF_H = 10;
const MIN_SWING_CLEARANCE_PX = 4;
const ACTION_LOCK_TIMEOUT_BUFFER_MS = 50;

interface CollisionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  label?: string;
}

type FarmerActionKind = 'hoe' | 'water' | 'harvest' | 'axe' | 'pickaxe';

interface PendingPlayerAction {
  kind: FarmerActionKind;
  col: number;
  row: number;
  targetObjectId?: string;
  targetInitialType?: NatureObjectType;
  elapsedMs: number;
  frameDurationsMs: number[];
  lockTimeoutMs: number;
  lockDeadlineMs: number;
  fallbackTimeoutId: ReturnType<typeof setTimeout> | null;
  effectFrame: number;
  effectApplied: boolean;
}

export class SuncrestEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private atlas: SpriteAtlas | null = null;
  private sheets: LoadedSpriteSheets | null = null;
  private rafId: number | null = null;
  private lastFrameMs = 0;

  private terrain: TerrainKind[][] = buildHomesteadTerrain();
  private structures: (StructureKind | null)[][] = buildHomesteadStructures();
  private grassVariants: GrassVariantKey[][] = createGrassVariantGrid();
  private dirtInteriorVariants: DirtInteriorKey[][] = createDirtInteriorVariantGrid();
  private dirtMasks: number[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 255),
  );
  private soilMasks: number[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 255),
  );
  private waterMasks: number[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 255),
  );

  private buildingObjects: BuildingObject[] = [];
  private worldObjects: WorldObject[] = [];
  private npcs: NpcState[] = createInitialNpcs();
  private questStates: Record<NpcId, QuestStatus> = createInitialQuestStates();
  private activeDialogue: ActiveDialogueSnapshot | null = null;
  private activeCookingStationId: string | null = null;
  private cookingFeedback: string | null = null;
  private phase: GamePhase = 'TITLE';

  private season: SeasonName = 'Spring';
  private seasonEndCropsMode: SeasonEndCropsMode = SEASON_END_CROPS;
  private day = 1;
  private timeMinutes = DAY_START_MINUTES;
  private timeAccumulator = 0;
  private gold = 100;
  private totalEarned = 0;
  private stamina = MAX_STAMINA;
  private bannerRestored = false;
  private bannerCelebrationVisible = false;

  private player: PlayerState = {
    x: (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE,
    y: (PLAYER_SPAWN_TILE.row + 0.65) * TILE_SIZE,
    facing: 'down',
    animTimer: 0,
    isMoving: false,
    actionTimer: 0,
    actionTool: null,
  };
  private activeAction: PendingPlayerAction | null = null;
  private idleElapsedMs = 0;

  private quickBar: (InventorySlot | null)[] = Array.from({ length: QUICK_BAR_SIZE }, () => null);
  private selectedSlot = 0;
  private farmTiles: Record<string, FarmTileState> = {};
  private shippingBin: Partial<Record<ShippableItemId, number>> = {};
  private daySummary: DaySummaryData | null = null;
  private seasonSummary: SeasonEndSummaryData | null = null;

  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private hoverTile: { col: number; row: number } | null = null;
  private mouseScreen: { x: number; y: number } | null = null;
  private camera = { x: 0, y: 0 };
  private animClock = 0;

  private toastMessage: string | null = null;
  private toastTimer = 0;
  private pickupMessage: string | null = null;
  private pickupTimer = 0;
  private warningMessage: string | null = null;
  private warningTimer = 0;
  private objectShakeTimers: Record<string, number> = {};
  private debugOverlay = false;
  private lastPrompt: string | null = null;
  private lastMinuteSnapshot = Math.floor(DAY_START_MINUTES);

  private listeners = new Set<HudListener>();

  // Bound event listeners
  private onKeyDownBound = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUpBound = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onBlurBound = () => this.clearInputs();
  private onBeforeUnloadBound = () => {
    if (this.phase === 'PLAYING' || this.phase === 'PAUSED') {
      writeAutoSave(this.exportSaveData());
    }
  };
  private onMouseMoveBound = (e: MouseEvent) => this.handleMouseMove(e);
  private onMouseLeaveBound = () => {
    this.mouseScreen = null;
    this.hoverTile = null;
  };
  private onMouseDownBound = (e: MouseEvent) => this.handleMouseDown(e);
  private onWheelBound = (e: WheelEvent) => this.handleWheel(e);

  constructor() {
    this.applyState(createNewGameState(), 'TITLE');
  }

  public subscribe(listener: HudListener): () => void {
    this.listeners.add(listener);
    listener(this.getHudSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitHud(): void {
    const snap = this.getHudSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  public getHudSnapshot(): HudSnapshot {
    let shippingCount = 0;
    let shippingValue = 0;
    for (const [id, qty] of Object.entries(this.shippingBin)) {
      if (!qty || qty <= 0) continue;
      const price = ITEMS[id as ItemId]?.sellPrice ?? 0;
      if (price <= 0) continue;
      shippingCount += qty;
      shippingValue += qty * price;
    }

    const activeStation =
      this.phase === 'COOKING' && this.activeCookingStationId
        ? COOKING_STATIONS.find((s) => s.id === this.activeCookingStationId) ?? null
        : null;

    return {
      phase: this.phase,
      season: this.season,
      seasonLengthDays: SEASON_LENGTH_DAYS,
      day: this.day,
      timeMinutes: Math.floor(this.timeMinutes),
      gold: this.gold,
      totalEarned: this.totalEarned,
      bannerGoal: BANNER_GOAL_GOLD,
      bannerRestored: this.bannerRestored,
      stamina: this.stamina,
      maxStamina: MAX_STAMINA,
      quickBar: this.quickBar.map((s) => (s ? { ...s } : null)),
      selectedSlot: this.selectedSlot,
      shippingCount,
      shippingValue,
      targetPrompt: this.computeTargetPrompt(),
      toastMessage: this.toastMessage,
      pickupMessage: this.pickupMessage,
      warningMessage: this.warningMessage,
      bannerCelebrationVisible: this.bannerCelebrationVisible,
      daySummary: this.daySummary,
      seasonSummary: this.seasonSummary,
      dialogue: this.activeDialogue
        ? {
            npcId: this.activeDialogue.npcId,
            lineIndex: this.activeDialogue.lineIndex,
            lines: this.activeDialogue.lines,
          }
        : null,
      cookingStation: activeStation
        ? buildCookingStationSnapshot(
            activeStation,
            (itemId) => this.countItemInQuickBar(itemId),
            this.cookingFeedback,
          )
        : null,
      quests: this.buildQuestSummaryList(),
    };
  }

  private buildQuestSummaryList(): QuestSummaryItem[] {
    return NPC_LIST.map((def) => ({
      npcId: def.id,
      npcName: def.name,
      npcRole: def.role,
      title: def.quest.title,
      description: def.quest.description,
      requiredItemId: def.quest.requiredItemId,
      requiredCount: def.quest.requiredCount,
      currentCount: this.countItemInQuickBar(def.quest.requiredItemId),
      rewardGold: def.quest.rewardGold,
      rewardItem: def.quest.rewardItem ? { ...def.quest.rewardItem } : undefined,
      status: this.questStates[def.id],
    }));
  }

  private syncQuestReadyStates(): void {
    for (const def of NPC_LIST) {
      const status = this.questStates[def.id];
      if (status !== 'active' && status !== 'ready') continue;
      const count = this.countItemInQuickBar(def.quest.requiredItemId);
      this.questStates[def.id] = count >= def.quest.requiredCount ? 'ready' : 'active';
    }
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = getSpriteAtlas();
    this.sheets = getLoadedSpriteSheets(() => this.emitHud());

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('beforeunload', this.onBeforeUnloadBound);
    canvas.addEventListener('mousemove', this.onMouseMoveBound);
    canvas.addEventListener('mouseleave', this.onMouseLeaveBound);
    canvas.addEventListener('mousedown', this.onMouseDownBound);
    canvas.addEventListener('wheel', this.onWheelBound, { passive: true });

    this.resizeCanvas();
    this.lastFrameMs = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastFrameMs) / 1000;
      this.lastFrameMs = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public detachCanvas(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('beforeunload', this.onBeforeUnloadBound);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
      this.canvas.removeEventListener('mouseleave', this.onMouseLeaveBound);
      this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
      this.canvas.removeEventListener('wheel', this.onWheelBound);
    }
    this.canvas = null;
    this.ctx = null;
    this.clearActiveAction();
    this.clearInputs();
  }

  public saveGame(): void {
    writeAutoSave(this.exportSaveData());
  }

  public resizeCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  // Lifecycle Actions
  public startNewGame(): void {
    const fresh = createNewGameState();
    writeAutoSave(fresh);
    this.applyState(fresh, 'PLAYING');
    this.showToast('Welcome to Suncrest Valley! Earn 500G to restore the Homestead Banner.');
    this.emitHud();
  }

  public continueSavedGame(): boolean {
    const saved = loadAutoSave();
    if (!saved) return false;
    this.applyState(saved, 'PLAYING');
    this.showToast(`Loaded Day ${saved.day} · ${formatClock(saved.timeMinutes)}`);
    this.emitHud();
    return true;
  }

  public returnToTitle(): void {
    if (this.phase === 'PLAYING' || this.phase === 'PAUSED') {
      writeAutoSave(this.exportSaveData());
    }
    this.activeCookingStationId = null;
    this.cookingFeedback = null;
    this.clearInputs();
    this.phase = 'TITLE';
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'PLAYING') {
      this.clearInputs();
      this.phase = 'PAUSED';
      this.emitHud();
    } else if (this.phase === 'PAUSED') {
      this.phase = 'PLAYING';
      this.emitHud();
    } else if (
      this.phase === 'SHOP' ||
      this.phase === 'COOKING' ||
      this.phase === 'SLEEP_CONFIRM' ||
      this.phase === 'QUEST_LOG'
    ) {
      this.activeCookingStationId = null;
      this.cookingFeedback = null;
      this.phase = 'PLAYING';
      this.emitHud();
    } else if (this.phase === 'DIALOGUE') {
      this.closeDialogue();
    }
  }

  public toggleQuestLog(): void {
    if (this.phase === 'PLAYING') {
      this.clearInputs();
      this.phase = 'QUEST_LOG';
      this.emitHud();
    } else if (this.phase === 'QUEST_LOG') {
      this.phase = 'PLAYING';
      this.emitHud();
    }
  }

  public closeModal(): void {
    if (
      this.phase === 'SHOP' ||
      this.phase === 'COOKING' ||
      this.phase === 'SLEEP_CONFIRM' ||
      this.phase === 'PAUSED' ||
      this.phase === 'QUEST_LOG'
    ) {
      this.activeCookingStationId = null;
      this.cookingFeedback = null;
      this.phase = 'PLAYING';
      this.emitHud();
    }
  }

  public advanceDialogue(): boolean {
    if (this.phase !== 'DIALOGUE' || !this.activeDialogue) return false;
    if (this.activeDialogue.lineIndex + 1 < this.activeDialogue.lines.length) {
      this.activeDialogue = {
        ...this.activeDialogue,
        lineIndex: this.activeDialogue.lineIndex + 1,
      };
      this.emitHud();
      return true;
    }
    this.closeDialogue();
    return false;
  }

  public closeDialogue(): void {
    if (this.activeDialogue) {
      const npc = this.npcs.find((n) => n.id === this.activeDialogue?.npcId);
      if (npc) {
        npc.facing = NPC_DEFINITIONS[npc.id].defaultFacing;
      }
      this.activeDialogue = null;
    }
    this.syncQuestReadyStates();
    if (this.phase === 'DIALOGUE') {
      this.phase = 'PLAYING';
    }
    this.clearInputs();
    this.emitHud();
  }

  public confirmSleep(): void {
    if (this.phase !== 'SLEEP_CONFIRM') return;
    this.endDay(false);
  }

  public advanceFromDaySummary(): void {
    if (this.phase !== 'DAY_SUMMARY') return;
    const justRestored = this.daySummary?.bannerJustRestored ?? false;
    this.daySummary = null;
    this.phase = 'PLAYING';
    if (justRestored) {
      this.bannerCelebrationVisible = true;
      this.showToast('Banner restored!');
    } else if (this.day === SEASON_LENGTH_DAYS) {
      this.showToast(`Day ${this.day} begins — final day of ${this.season}!`);
    } else {
      this.showToast(`Good morning! Day ${this.day} begins.`);
    }
    this.emitHud();
  }

  public advanceFromSeasonEnd(): void {
    if (this.phase !== 'SEASON_END') return;
    const justRestored = this.seasonSummary?.bannerJustRestored ?? false;
    this.seasonSummary = null;
    this.season = 'Spring';
    this.day = 1;
    this.timeMinutes = DAY_START_MINUTES;
    this.timeAccumulator = 0;
    this.phase = 'PLAYING';
    writeAutoSave(this.exportSaveData());
    if (justRestored) {
      this.bannerCelebrationVisible = true;
      this.showToast('Banner restored!');
    } else {
      this.showToast('Spring Day 1 begins!');
    }
    this.emitHud();
  }

  public dismissBannerCelebration(): void {
    this.bannerCelebrationVisible = false;
    this.emitHud();
  }

  public selectQuickSlot(index: number): void {
    if (index < 0 || index >= QUICK_BAR_SIZE) return;
    this.selectedSlot = index;
    this.emitHud();
  }

  public buySeed(cropId: CropId, quantity = 1): { ok: boolean; message: string } {
    const crop = CROPS[cropId];
    const totalCost = crop.seedCost * quantity;
    if (this.gold < totalCost) {
      const msg = `Need ${totalCost}G for ${quantity}× ${crop.seedName}.`;
      this.showToast(msg);
      return { ok: false, message: msg };
    }

    if (!this.canAddItem(crop.seedId, quantity)) {
      const msg = 'Quick bar is full! Ship or clear a slot first.';
      this.showToast(msg);
      return { ok: false, message: msg };
    }

    this.gold -= totalCost;
    this.addItemToQuickBar(crop.seedId, quantity);
    const msg = `Bought ${quantity}× ${crop.seedName} (-${totalCost}G)`;
    this.showToast(msg);
    this.emitHud();
    return { ok: true, message: msg };
  }

  public openCookingStation(station: CookingStationObject): void {
    this.clearActiveAction();
    this.clearInputs();
    this.player.isMoving = false;
    this.activeCookingStationId = station.id;
    this.cookingFeedback = null;
    this.phase = 'COOKING';
    this.emitHud();
  }

  public cookRecipe(dishId: DishItemId): { ok: boolean; message: string } {
    const station = this.activeCookingStationId
      ? COOKING_STATIONS.find((s) => s.id === this.activeCookingStationId)
      : COOKING_STATIONS[0];
    if (!station) {
      return { ok: false, message: 'No cooking station active.' };
    }

    const stationType = COOKING_STATION_TYPES[station.type];
    if (!stationType.recipes.includes(dishId)) {
      const msg = 'Recipe not available here.';
      this.cookingFeedback = msg;
      this.showToast(msg);
      this.emitHud();
      return { ok: false, message: msg };
    }

    const recipe = COOKING_RECIPES[dishId];
    for (const ing of recipe.ingredients) {
      if (this.countItemInQuickBar(ing.itemId) < ing.count) {
        const msg = `Need ${ing.count}× ${ITEMS[ing.itemId].name}.`;
        this.cookingFeedback = msg;
        this.showToast(msg);
        this.emitHud();
        return { ok: false, message: msg };
      }
    }

    if (!this.canAddItemAfterConsuming(dishId, 1, recipe.ingredients)) {
      const msg = 'Inventory full';
      this.cookingFeedback = msg;
      this.showToast(msg);
      this.emitHud();
      return { ok: false, message: msg };
    }

    for (const ing of recipe.ingredients) {
      this.consumeItemFromQuickBar(ing.itemId, ing.count);
    }
    this.addItemToQuickBar(dishId, 1);

    const msg = `Cooked ${recipe.name}!`;
    this.cookingFeedback = msg;
    this.showPickup(`+1 ${recipe.name}`);
    this.showToast(msg);
    this.emitHud();
    return { ok: true, message: msg };
  }

  public eatSelectedDish(): { ok: boolean; message: string } {
    const slot = this.quickBar[this.selectedSlot];
    if (!slot || ITEMS[slot.itemId].category !== 'dish') {
      return { ok: false, message: 'No dish selected.' };
    }

    if (this.stamina >= MAX_STAMINA) {
      const msg = 'Stamina is full';
      this.showToast(msg);
      return { ok: false, message: msg };
    }

    const def = ITEMS[slot.itemId];
    const restore = def.staminaRestore ?? 0;
    this.stamina = Math.min(MAX_STAMINA, this.stamina + restore);
    this.consumeSlot(this.selectedSlot, 1);

    const msg = `+${restore} Stamina`;
    this.showPickup(msg);
    this.showToast(`Ate ${def.name} (+${restore} Stamina)`);
    this.emitHud();
    return { ok: true, message: msg };
  }

  private recomputeBitmasksAt(col: number, row: number): void {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return;

    this.dirtMasks[row][col] = computeNeighborBitmask(
      col,
      row,
      (c, r) => this.terrain[r][c] === 'dirt',
    );

    this.soilMasks[row][col] = computeNeighborBitmask(col, row, (c, r) =>
      Boolean(this.farmTiles[tileKey(c, r)]?.tilled),
    );

    this.waterMasks[row][col] = computeNeighborBitmask(
      col,
      row,
      (c, r) => this.terrain[r][c] === 'water',
    );
  }

  private recomputeCellAndNeighbors(col: number, row: number): void {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        this.recomputeBitmasksAt(col + dc, row + dr);
      }
    }
  }

  private recomputeAllBitmasks(): void {
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        this.recomputeBitmasksAt(c, r);
      }
    }
  }

  private applyState(data: Stage1SaveData, nextPhase: GamePhase): void {
    this.season = data.season ?? 'Spring';
    this.day = Math.max(1, Math.min(SEASON_LENGTH_DAYS, Math.floor(data.day)));
    this.timeMinutes = data.timeMinutes;
    this.timeAccumulator = 0;
    this.gold = data.gold;
    this.totalEarned = data.totalEarned;
    this.stamina = data.stamina;
    this.bannerRestored = data.bannerRestored;
    this.bannerCelebrationVisible = false;
    this.grassVariants = data.grassVariants ?? createGrassVariantGrid();
    this.dirtInteriorVariants = data.dirtInteriorVariants ?? createDirtInteriorVariantGrid();
    this.buildingObjects =
      data.buildingObjects && data.buildingObjects.length > 0
        ? data.buildingObjects.map((b) => ({ ...b }))
        : createInitialBuildingObjects();
    const rawWorldObjects = Array.isArray(data.worldObjects)
      ? data.worldObjects.map((o) => ({ ...o }))
      : createInitialWorldObjects(this.terrain, this.structures, this.buildingObjects);
    this.worldObjects = relocateBannerClearanceFlowers(
      rawWorldObjects,
      this.terrain,
      this.structures,
      this.buildingObjects,
    );
    this.npcs = createInitialNpcs();
    this.questStates = normalizeQuestStates(data.questStates);
    this.activeDialogue = null;
    this.activeCookingStationId = null;
    this.cookingFeedback = null;

    this.clearActiveAction();

    this.player = {
      x: data.player.x,
      y: data.player.y,
      facing: data.player.facing,
      animTimer: 0,
      isMoving: false,
      actionTimer: 0,
      actionTool: null,
    };
    this.unstickPlayer();
    if (this.collidesAt(this.player.x, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H)) {
      this.player.x = (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE;
      this.player.y = (PLAYER_SPAWN_TILE.row + 0.65) * TILE_SIZE;
    }

    this.quickBar = data.quickBar.map((s) => (s ? { ...s } : null));
    this.selectedSlot = data.selectedSlot;
    this.syncQuestReadyStates();
    this.farmTiles = normalizeFarmTiles(data.farmTiles);
    this.shippingBin = { ...data.shippingBin };
    this.daySummary = null;
    this.seasonSummary = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.pickupMessage = null;
    this.pickupTimer = 0;
    this.warningMessage = null;
    this.warningTimer = 0;
    this.objectShakeTimers = {};
    this.lastMinuteSnapshot = Math.floor(this.timeMinutes);
    this.phase = nextPhase;
    this.idleElapsedMs = 0;
    this.recomputeAllBitmasks();
    this.clearInputs();
  }

  private exportSaveData(): Stage1SaveData {
    return {
      saveVersion: SAVE_VERSION,
      tileSize: TILE_SIZE,
      season: this.season,
      seasonLengthDays: SEASON_LENGTH_DAYS,
      day: this.day,
      timeMinutes: Math.floor(this.timeMinutes),
      gold: this.gold,
      totalEarned: this.totalEarned,
      stamina: this.stamina,
      maxStamina: MAX_STAMINA,
      bannerRestored: this.bannerRestored,
      player: {
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing,
      },
      quickBar: this.quickBar.map((s) => (s ? { ...s } : null)),
      selectedSlot: this.selectedSlot,
      farmTiles: this.farmTiles,
      shippingBin: this.shippingBin,
      grassVariants: this.grassVariants,
      dirtInteriorVariants: this.dirtInteriorVariants,
      buildingObjects: this.buildingObjects,
      worldObjects: this.worldObjects,
      questStates: { ...this.questStates },
      lastSavedAt: new Date().toISOString(),
    };
  }

  private clearInputs(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;

    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    if (!e.repeat) {
      this.justPressedKeys.add(code);
    }
    this.heldKeys.add(code);

    if (code === 'F3') {
      e.preventDefault();
      if (!e.repeat) {
        this.debugOverlay = !this.debugOverlay;
      }
      return;
    }

    if (code === 'Escape') {
      if (
        this.phase === 'PLAYING' ||
        this.phase === 'PAUSED' ||
        this.phase === 'SHOP' ||
        this.phase === 'COOKING' ||
        this.phase === 'SLEEP_CONFIRM' ||
        this.phase === 'QUEST_LOG' ||
        this.phase === 'DIALOGUE'
      ) {
        this.togglePause();
      }
      return;
    }

    if (code === 'KeyQ' && !e.repeat) {
      if (this.phase === 'PLAYING' && !this.activeAction) {
        this.toggleQuestLog();
        return;
      }
      if (this.phase === 'QUEST_LOG') {
        this.toggleQuestLog();
        return;
      }
    }

    if (this.phase === 'PLAYING') {
      if (this.activeAction) return;
      if (code >= 'Digit1' && code <= 'Digit9') {
        this.selectQuickSlot(Number(code.replace('Digit', '')) - 1);
      } else if (code === 'Digit0') {
        this.selectQuickSlot(9);
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  private handleWheel(e: WheelEvent): void {
    if (this.phase !== 'PLAYING' || this.activeAction) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = (this.selectedSlot + dir + QUICK_BAR_SIZE) % QUICK_BAR_SIZE;
    this.selectQuickSlot(next);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.updateHoverTile();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || this.phase !== 'PLAYING' || !this.canvas || this.activeAction) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.updateHoverTile();

    const worldX = this.mouseScreen.x + this.camera.x;
    const worldY = this.mouseScreen.y + this.camera.y;

    const clickedNpc = this.findNpcAtWorldPoint(worldX, worldY);
    if (clickedNpc) {
      const dist = Math.hypot(this.player.x - clickedNpc.x, this.player.y - clickedNpc.y);
      if (dist <= NPC_INTERACT_RADIUS + 20) {
        this.startNpcDialogue(clickedNpc);
        return;
      }
    }

    const clickedBuilding = this.findBuildingAtWorldPoint(worldX, worldY);
    if (clickedBuilding) {
      const dist = Math.hypot(this.player.x - clickedBuilding.x, this.player.y - clickedBuilding.y);
      if (dist <= BUILDING_INTERACT_RADIUS + 20) {
        this.interactWithBuilding(clickedBuilding);
        return;
      }
    }

    const clickedStation = this.findCookingStationAtWorldPoint(worldX, worldY);
    if (clickedStation) {
      const dist = Math.hypot(this.player.x - clickedStation.x, this.player.y - clickedStation.y);
      if (dist <= clickedStation.interactRange) {
        this.openCookingStation(clickedStation);
      } else {
        this.showToast('Move closer to the Stove to cook.');
      }
      return;
    }

    const clickedBanner = this.findBannerTileAtWorldPoint(worldX, worldY);
    if (clickedBanner) {
      const target = this.resolveClickTarget(clickedBanner.col, clickedBanner.row);
      if (target) {
        this.faceTowardTile(target.col, target.row);
        this.interactWithTile(target.col, target.row);
        return;
      }
    }

    const clickedResource = this.findResourceObjectAtWorldPoint(worldX, worldY);
    if (clickedResource && this.isResourceObjectInClickReach(clickedResource)) {
      this.faceTowardWorldPoint(clickedResource.x, clickedResource.y);
      this.interactWithResourceObject(clickedResource);
      return;
    }

    if (this.hoverTile) {
      const target = this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row);
      if (target) {
        this.faceTowardTile(target.col, target.row);
        this.interactWithTile(target.col, target.row);
      } else {
        const front = this.getActionFacingTile();
        this.interactWithTile(front.col, front.row);
      }
    }
  }

  private findBannerTileAtWorldPoint(
    worldX: number,
    worldY: number,
  ): { col: number; row: number } | null {
    const spec =
      BUILDING_OBJECT_SPECS[this.bannerRestored ? 'banner_restored' : 'banner_unrestored'];
    const drawW = spec.w * PIXEL_SCALE;
    const drawH = spec.h * PIXEL_SCALE;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (this.structures[r][c] !== 'banner') continue;
        const anchor = getBannerAnchor(c, r);
        const left = anchor.x - drawW / 2;
        const right = anchor.x + drawW / 2;
        const top = anchor.y - drawH;
        const bottom = anchor.y;
        if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
          return { col: c, row: r };
        }
      }
    }
    return null;
  }

  private getActionFacingTile(): { col: number; row: number } {
    const facing = this.getFacingTile();
    if (
      facing.row >= 0 &&
      facing.row < MAP_ROWS &&
      facing.col >= 0 &&
      facing.col < MAP_COLS &&
      this.structures[facing.row][facing.col] === 'banner'
    ) {
      return facing;
    }

    const dirVec =
      this.player.facing === 'up'
        ? { dx: 0, dy: -1 }
        : this.player.facing === 'down'
          ? { dx: 0, dy: 1 }
          : this.player.facing === 'left'
            ? { dx: -1, dy: 0 }
            : { dx: 1, dy: 0 };
    const probeCol = Math.floor((this.player.x + dirVec.dx * 28) / TILE_SIZE);
    const probeRow = Math.floor((this.player.y + dirVec.dy * 24) / TILE_SIZE);
    if (
      probeRow >= 0 &&
      probeRow < MAP_ROWS &&
      probeCol >= 0 &&
      probeCol < MAP_COLS &&
      this.structures[probeRow][probeCol] === 'banner'
    ) {
      return { col: probeCol, row: probeRow };
    }

    return facing;
  }

  private hasShippedItemsInBin(): boolean {
    for (const qty of Object.values(this.shippingBin)) {
      if (qty && qty > 0) return true;
    }
    return false;
  }

  private getBuildingRenderKey(type: BuildingObjectType): BuildingObjectType {
    if (type === 'shipping_bin' && !this.hasShippedItemsInBin()) {
      return 'shipping_bin_empty';
    }
    return type;
  }

  private findBuildingAtWorldPoint(worldX: number, worldY: number): BuildingObject | null {
    for (let i = this.buildingObjects.length - 1; i >= 0; i--) {
      const b = this.buildingObjects[i];
      const spec = BUILDING_OBJECT_SPECS[this.getBuildingRenderKey(b.type)];
      if (!spec.interactive) continue;
      const drawW = spec.w * PIXEL_SCALE;
      const drawH = spec.h * PIXEL_SCALE;
      const left = b.x - drawW / 2;
      const right = b.x + drawW / 2;
      const top = b.y - drawH;
      const bottom = b.y;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return b;
      }
    }
    return null;
  }

  private findNearbyInteractiveBuilding(): BuildingObject | null {
    let best: BuildingObject | null = null;
    let bestDist = Infinity;

    for (const b of this.buildingObjects) {
      const spec = BUILDING_OBJECT_SPECS[b.type];
      if (!spec.interactive) continue;
      const dist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
      if (dist <= BUILDING_INTERACT_RADIUS && dist < bestDist) {
        best = b;
        bestDist = dist;
      }
    }
    return best;
  }

  private findNpcAtWorldPoint(worldX: number, worldY: number): NpcState | null {
    const sorted = [...this.npcs].sort((a, b) => b.y - a.y);
    for (const npc of sorted) {
      const manifest = this.sheets?.npcIdleManifests[npc.id];
      const frameW = manifest?.frameWidth ?? FARMER_FRAME_W;
      const frameH = manifest?.frameHeight ?? FARMER_FRAME_H;
      const drawW = frameW * PIXEL_SCALE;
      const drawH = frameH * PIXEL_SCALE;
      const left = npc.x - (frameW / 2) * PIXEL_SCALE;
      const top = npc.y - (frameH - 2) * PIXEL_SCALE;
      if (worldX >= left && worldX <= left + drawW && worldY >= top && worldY <= top + drawH) {
        return npc;
      }
    }
    return null;
  }

  private findNearbyNpc(): NpcState | null {
    let best: NpcState | null = null;
    let bestDist = Infinity;
    for (const npc of this.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist <= NPC_INTERACT_RADIUS && dist < bestDist) {
        best = npc;
        bestDist = dist;
      }
    }
    return best;
  }

  private findCookingStationAtWorldPoint(
    worldX: number,
    worldY: number,
  ): CookingStationObject | null {
    for (let i = COOKING_STATIONS.length - 1; i >= 0; i--) {
      const station = COOKING_STATIONS[i];
      const hitW = station.hitbox[0] * PIXEL_SCALE;
      const hitH = station.hitbox[1] * PIXEL_SCALE;
      const left = station.x - hitW / 2;
      const right = station.x + hitW / 2;
      const top = station.y - hitH;
      const bottom = station.y;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return station;
      }
    }
    return null;
  }

  private findNearbyCookingStation(): CookingStationObject | null {
    let best: CookingStationObject | null = null;
    let bestDist = Infinity;

    for (const station of COOKING_STATIONS) {
      const dist = Math.hypot(this.player.x - station.x, this.player.y - station.y);
      if (dist <= station.interactRange && dist < bestDist) {
        best = station;
        bestDist = dist;
      }
    }
    return best;
  }

  private findClosestInteractiveTarget():
    | { kind: 'npc'; npc: NpcState; dist: number }
    | { kind: 'building'; building: BuildingObject; dist: number }
    | { kind: 'cooking_station'; station: CookingStationObject; dist: number }
    | null {
    const npc = this.findNearbyNpc();
    const building = this.findNearbyInteractiveBuilding();
    const station = this.findNearbyCookingStation();
    const npcDist = npc ? Math.hypot(this.player.x - npc.x, this.player.y - npc.y) : Infinity;
    const bldDist = building
      ? Math.hypot(this.player.x - building.x, this.player.y - building.y)
      : Infinity;
    const stationDist = station
      ? Math.hypot(this.player.x - station.x, this.player.y - station.y)
      : Infinity;

    if (!npc && !building && !station) return null;
    if (npc && npcDist <= bldDist && npcDist <= stationDist) {
      return { kind: 'npc', npc, dist: npcDist };
    }
    if (station && stationDist <= bldDist) {
      return { kind: 'cooking_station', station, dist: stationDist };
    }
    if (building) {
      return { kind: 'building', building, dist: bldDist };
    }
    return null;
  }

  public startNpcDialogue(npc: NpcState): void {
    const def = NPC_DEFINITIONS[npc.id];
    this.faceTowardWorldPoint(npc.x, npc.y);

    const status = this.questStates[npc.id];
    let scene: NpcDialogueScene;
    if (status === 'not_started') {
      this.questStates[npc.id] = 'active';
      scene = 'offer';
    } else if (status === 'active' || status === 'ready') {
      const heldCount = this.countItemInQuickBar(def.quest.requiredItemId);
      if (heldCount >= def.quest.requiredCount) {
        const rewardItem = def.quest.rewardItem;
        if (rewardItem && !this.canAddItem(rewardItem.itemId, rewardItem.count)) {
          this.showToast('Inventory full');
          this.emitHud();
          return;
        }

        this.consumeItemFromQuickBar(def.quest.requiredItemId, def.quest.requiredCount);

        let rewardPopup = '';
        if (rewardItem) {
          this.addItemToQuickBar(rewardItem.itemId, rewardItem.count);
          rewardPopup = `Received: ${rewardItem.count} ${ITEMS[rewardItem.itemId].name}`;
        } else if (def.quest.rewardGold && def.quest.rewardGold > 0) {
          this.gold += def.quest.rewardGold;
          this.totalEarned += def.quest.rewardGold;
          rewardPopup = `+${def.quest.rewardGold}G`;
        }

        this.questStates[npc.id] = 'completed';
        scene = 'complete';
        if (rewardPopup) {
          this.showPickup(rewardPopup);
          this.showToast(rewardPopup);
        }
      } else {
        this.questStates[npc.id] = 'active';
        scene = 'inProgress';
      }
    } else {
      scene = 'idleChatter';
    }

    const dx = this.player.x - npc.x;
    const dy = this.player.y - npc.y;
    npc.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx >= 0
          ? 'right'
          : 'left'
        : dy >= 0
          ? 'down'
          : 'up';

    const lines = buildDialogueLinesForNpc(def, scene);
    this.activeDialogue = {
      npcId: npc.id,
      lines,
      lineIndex: 0,
    };
    this.clearActiveAction();
    this.clearInputs();
    this.player.isMoving = false;
    this.phase = 'DIALOGUE';
    this.emitHud();
  }

  private updateHoverTile(): void {
    if (!this.mouseScreen) {
      this.hoverTile = null;
      return;
    }
    const worldX = this.mouseScreen.x + this.camera.x;
    const worldY = this.mouseScreen.y + this.camera.y;
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
      this.hoverTile = { col, row };
    } else {
      this.hoverTile = null;
    }
  }

  private resolveClickTarget(col: number, row: number): { col: number; row: number } | null {
    const pCol = this.player.x / TILE_SIZE;
    const pRow = this.player.y / TILE_SIZE;
    const dist = Math.hypot(col + 0.5 - pCol, row + 0.5 - pRow);
    if (dist <= INTERACT_REACH_TILES + 0.45) {
      return { col, row };
    }
    return null;
  }

  private faceTowardWorldPoint(worldX: number, worldY: number): void {
    const dx = worldX - this.player.x;
    const dy = worldY - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.facing = dx >= 0 ? 'right' : 'left';
    } else {
      this.player.facing = dy >= 0 ? 'down' : 'up';
    }
  }

  private faceTowardTile(col: number, row: number): void {
    this.faceTowardWorldPoint((col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE);
  }

  private isResourceObjectInClickReach(obj: WorldObject): boolean {
    const rect = getObjectCollisionRect(obj);
    const maxDist = (INTERACT_REACH_TILES + 0.65) * TILE_SIZE;
    if (!rect) {
      return Math.hypot(obj.x - this.player.x, obj.y - this.player.y) <= maxDist;
    }
    const clampedX = Math.max(rect.left, Math.min(rect.right, this.player.x));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, this.player.y));
    return Math.hypot(clampedX - this.player.x, clampedY - this.player.y) <= maxDist;
  }

  private findResourceObjectAtWorldPoint(worldX: number, worldY: number): WorldObject | null {
    const sorted = [...this.worldObjects].sort((a, b) => b.y - a.y);
    for (const obj of sorted) {
      if (!RESOURCE_TARGET_CONFIG[obj.type]) continue;
      const spec = NATURE_OBJECT_SPECS[obj.type];
      const drawW = spec.w * PIXEL_SCALE;
      const drawH = spec.h * PIXEL_SCALE;
      const left = obj.x - drawW / 2;
      const right = obj.x + drawW / 2;
      const top = obj.y - drawH;
      const bottom = obj.y;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return obj;
      }
    }
    return null;
  }

  private findFacingResourceTarget(): WorldObject | null {
    const dir =
      this.player.facing === 'up'
        ? { x: 0, y: -1 }
        : this.player.facing === 'down'
          ? { x: 0, y: 1 }
          : this.player.facing === 'left'
            ? { x: -1, y: 0 }
            : { x: 1, y: 0 };

    const reach = 48;
    const halfSpread = 24;
    const boxLeft = dir.x === 0 ? this.player.x - halfSpread : Math.min(this.player.x, this.player.x + dir.x * reach);
    const boxRight = dir.x === 0 ? this.player.x + halfSpread : Math.max(this.player.x, this.player.x + dir.x * reach);
    const boxTop = dir.y === 0 ? this.player.y - halfSpread : Math.min(this.player.y, this.player.y + dir.y * reach);
    const boxBottom = dir.y === 0 ? this.player.y + halfSpread : Math.max(this.player.y, this.player.y + dir.y * reach);

    const probeX = this.player.x + dir.x * 28;
    const probeY = this.player.y + dir.y * 28;

    let best: WorldObject | null = null;
    let bestDist = Infinity;

    for (const obj of this.worldObjects) {
      if (!RESOURCE_TARGET_CONFIG[obj.type]) continue;
      const rect = getObjectCollisionRect(obj);
      if (!rect) continue;
      if (
        boxRight >= rect.left &&
        boxLeft <= rect.right &&
        boxBottom >= rect.top &&
        boxTop <= rect.bottom
      ) {
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        const dist = Math.hypot(cx - probeX, cy - probeY);
        if (dist < bestDist) {
          best = obj;
          bestDist = dist;
        }
      }
    }
    return best;
  }

  private getFacingTile(): { col: number; row: number } {
    const pCol = Math.floor(this.player.x / TILE_SIZE);
    const pRow = Math.floor(this.player.y / TILE_SIZE);
    switch (this.player.facing) {
      case 'up':
        return { col: pCol, row: pRow - 1 };
      case 'down':
        return { col: pCol, row: pRow + 1 };
      case 'left':
        return { col: pCol - 1, row: pRow };
      case 'right':
        return { col: pCol + 1, row: pRow };
    }
  }

  private update(dt: number): void {
    this.animClock += dt;

    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer === 0) {
        this.toastMessage = null;
        this.emitHud();
      }
    }

    if (this.pickupTimer > 0) {
      this.pickupTimer = Math.max(0, this.pickupTimer - dt);
      if (this.pickupTimer === 0) {
        this.pickupMessage = null;
        this.emitHud();
      }
    }

    if (this.warningTimer > 0) {
      this.warningTimer = Math.max(0, this.warningTimer - dt);
      if (this.warningTimer === 0) {
        this.warningMessage = null;
        this.emitHud();
      }
    }

    for (const id of Object.keys(this.objectShakeTimers)) {
      const remaining = this.objectShakeTimers[id] - dt;
      if (remaining <= 0) {
        delete this.objectShakeTimers[id];
      } else {
        this.objectShakeTimers[id] = remaining;
      }
    }

    if (this.phase !== 'PLAYING') {
      this.justPressedKeys.clear();
      return;
    }

    this.unstickPlayer();

    if (this.player.actionTimer > 0) {
      this.player.actionTimer = Math.max(0, this.player.actionTimer - dt);
      if (this.player.actionTimer === 0) {
        this.player.actionTool = null;
      }
    }

    if (this.activeAction) {
      this.player.isMoving = false;
      this.player.animTimer = 0;
      this.idleElapsedMs = 0;

      if (this.activeAction.targetObjectId && !this.activeAction.effectApplied) {
        const targetObj = this.worldObjects.find(
          (item) => item.id === this.activeAction?.targetObjectId,
        );
        if (!targetObj || targetObj.type !== this.activeAction.targetInitialType) {
          this.clearActiveAction();
        }
      }

      if (this.activeAction) {
        this.activeAction.elapsedMs += dt * 1000;
        const frameIdx = this.getActiveActionFrame(this.activeAction);
        if (!this.activeAction.effectApplied && frameIdx >= this.activeAction.effectFrame) {
          this.activeAction.effectApplied = true;
          try {
            this.applyActionEffect(this.activeAction);
          } catch {
            this.clearActiveAction();
          }
        }

        if (this.activeAction) {
          const totalMs = this.activeAction.frameDurationsMs.reduce((sum, ms) => sum + ms, 0);
          if (
            this.activeAction.elapsedMs >= totalMs ||
            this.activeAction.elapsedMs >= this.activeAction.lockTimeoutMs ||
            Date.now() >= this.activeAction.lockDeadlineMs
          ) {
            this.clearActiveAction();
          }
        }
      }
    } else {
      let mx = 0;
      let my = 0;
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) my -= 1;
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) my += 1;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) mx -= 1;
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) mx += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        mx /= len;
        my /= len;

        if (Math.abs(mx) > Math.abs(my)) {
          this.player.facing = mx < 0 ? 'left' : 'right';
        } else {
          this.player.facing = my < 0 ? 'up' : 'down';
        }

        this.movePlayer(mx * PLAYER_SPEED_PX_PER_SEC * dt, my * PLAYER_SPEED_PX_PER_SEC * dt);
        this.player.isMoving = true;
        this.player.animTimer += dt * 7;
        this.idleElapsedMs = 0;
      } else {
        if (this.player.isMoving) {
          this.idleElapsedMs = 0;
        }
        this.player.isMoving = false;
        this.player.animTimer = 0;
      }

      const pressedE = this.justPressedKeys.has('KeyE');
      const pressedSpace = this.justPressedKeys.has('Space');

      if (pressedE) {
        const nearby = this.findClosestInteractiveTarget();
        if (nearby?.kind === 'npc') {
          this.startNpcDialogue(nearby.npc);
        } else if (nearby?.kind === 'cooking_station') {
          this.openCookingStation(nearby.station);
        } else if (nearby?.kind === 'building') {
          this.interactWithBuilding(nearby.building);
        } else {
          const heldSlot = this.quickBar[this.selectedSlot];
          if (heldSlot && ITEMS[heldSlot.itemId].category === 'dish') {
            this.eatSelectedDish();
          } else {
            const target = this.getActionFacingTile();
            this.interactWithTile(target.col, target.row);
          }
        }
      } else if (pressedSpace) {
        const target = this.getActionFacingTile();
        const facingFarm =
          target.row >= 0 &&
          target.row < MAP_ROWS &&
          target.col >= 0 &&
          target.col < MAP_COLS &&
          this.terrain[target.row][target.col] === 'farm_plot';

        const nearby = this.findClosestInteractiveTarget();
        if (nearby?.kind === 'npc' && !facingFarm) {
          this.startNpcDialogue(nearby.npc);
        } else if (nearby?.kind === 'cooking_station' && !facingFarm) {
          this.openCookingStation(nearby.station);
        } else if (nearby?.kind === 'building') {
          const bld = nearby.building;
          if (!facingFarm || bld.type === 'gate_closed') {
            this.interactWithBuilding(bld);
          } else {
            this.interactWithTile(target.col, target.row);
          }
        } else {
          this.interactWithTile(target.col, target.row);
        }
      }

      if (!this.activeAction && !this.player.isMoving) {
        this.idleElapsedMs += dt * 1000;
      } else {
        this.idleElapsedMs = 0;
      }
    }

    this.timeAccumulator += dt;
    if (this.timeAccumulator >= REAL_SECONDS_PER_GAME_MINUTE) {
      const minsPassed = Math.floor(this.timeAccumulator / REAL_SECONDS_PER_GAME_MINUTE);
      this.timeAccumulator -= minsPassed * REAL_SECONDS_PER_GAME_MINUTE;
      this.timeMinutes += minsPassed;

      if (this.timeMinutes >= DAY_PASS_OUT_MINUTES) {
        this.endDay(true);
        this.justPressedKeys.clear();
        return;
      }
    }

    const currentMin = Math.floor(this.timeMinutes);
    const prompt = this.computeTargetPrompt();
    if (currentMin !== this.lastMinuteSnapshot || prompt !== this.lastPrompt) {
      this.lastMinuteSnapshot = currentMin;
      this.lastPrompt = prompt;
      this.emitHud();
    }

    this.justPressedKeys.clear();
  }

  private movePlayer(dx: number, dy: number): void {
    if (dx !== 0) {
      if (!this.collidesAt(this.player.x + dx, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H)) {
        this.player.x += dx;
      } else {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 4; i++) {
          const mid = (lo + hi) / 2;
          if (!this.collidesAt(this.player.x + dx * mid, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H)) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        if (lo > 0) {
          this.player.x += dx * lo;
        }
      }
    }

    if (dy !== 0) {
      if (!this.collidesAt(this.player.x, this.player.y + dy, PLAYER_HALF_W, PLAYER_HALF_H)) {
        this.player.y += dy;
      } else {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 4; i++) {
          const mid = (lo + hi) / 2;
          if (!this.collidesAt(this.player.x, this.player.y + dy * mid, PLAYER_HALF_W, PLAYER_HALF_H)) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        if (lo > 0) {
          this.player.y += dy * lo;
        }
      }
    }
  }

  private collectCollidingRects(
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): CollisionRect[] {
    const hits: CollisionRect[] = [];
    const colLeft = Math.floor(left / TILE_SIZE);
    const colRight = Math.floor(right / TILE_SIZE);
    const rowTop = Math.floor(top / TILE_SIZE);
    const rowBottom = Math.floor(bottom / TILE_SIZE);

    for (let r = rowTop; r <= rowBottom; r++) {
      for (let c = colLeft; c <= colRight; c++) {
        if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
          hits.push({
            left: c * TILE_SIZE,
            top: r * TILE_SIZE,
            right: (c + 1) * TILE_SIZE,
            bottom: (r + 1) * TILE_SIZE,
            label: 'bounds',
          });
          continue;
        }
        if (this.terrain[r][c] === 'water' || isSolidStructure(this.structures[r][c])) {
          hits.push({
            left: c * TILE_SIZE,
            top: r * TILE_SIZE,
            right: (c + 1) * TILE_SIZE,
            bottom: (r + 1) * TILE_SIZE,
            label: this.terrain[r][c],
          });
        } else if (this.structures[r][c] === 'banner') {
          const rect = getBannerCollisionRect(c, r, this.bannerRestored);
          if (rect && right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
            hits.push({ ...rect, label: 'banner' });
          }
        }
      }
    }

    for (const obj of this.worldObjects) {
      const rect = getObjectCollisionRect(obj);
      if (rect && right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        hits.push({ ...rect, label: obj.type });
      }
    }

    for (const bld of this.buildingObjects) {
      const rect = getBuildingCollisionRect(bld);
      if (rect && right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        hits.push({ ...rect, label: bld.type });
      }
    }

    for (const station of COOKING_STATIONS) {
      const rect = getCookingStationCollisionRect(station);
      if (right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        hits.push({ ...rect, label: station.type });
      }
    }

    for (const npc of this.npcs) {
      const rect = getNpcCollisionRect(npc);
      if (rect && right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        hits.push({ ...rect, label: `npc:${npc.id}` });
      }
    }

    return hits;
  }

  private unstickPlayer(): boolean {
    if (!this.collidesAt(this.player.x, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H)) {
      return true;
    }

    const px = this.player.x;
    const py = this.player.y;
    const overlapping = this.collectCollidingRects(
      px - PLAYER_HALF_W,
      py - PLAYER_HALF_H,
      px + PLAYER_HALF_W,
      py + PLAYER_HALF_H,
    );

    const candidates: { x: number; y: number; distSq: number }[] = [];
    for (const rect of overlapping) {
      for (const pad of [1, 2, 4]) {
        const pushLeft = rect.left - PLAYER_HALF_W - pad;
        const pushRight = rect.right + PLAYER_HALF_W + pad;
        const pushUp = rect.top - PLAYER_HALF_H - pad;
        const pushDown = rect.bottom + PLAYER_HALF_H + pad;
        candidates.push(
          { x: pushLeft, y: py, distSq: (pushLeft - px) ** 2 },
          { x: pushRight, y: py, distSq: (pushRight - px) ** 2 },
          { x: px, y: pushUp, distSq: (pushUp - py) ** 2 },
          { x: px, y: pushDown, distSq: (pushDown - py) ** 2 },
        );
      }
    }
    candidates.sort((a, b) => a.distSq - b.distSq);

    for (const cand of candidates) {
      if (!this.collidesAt(cand.x, cand.y, PLAYER_HALF_W, PLAYER_HALF_H)) {
        this.player.x = cand.x;
        this.player.y = cand.y;
        return true;
      }
    }

    // Fallback expanding radial search for the nearest non-colliding spot
    const radialOffsets: { dx: number; dy: number; distSq: number }[] = [];
    for (let dy = -48; dy <= 48; dy += 2) {
      for (let dx = -48; dx <= 48; dx += 2) {
        if (dx === 0 && dy === 0) continue;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 48 * 48) {
          radialOffsets.push({ dx, dy, distSq });
        }
      }
    }
    radialOffsets.sort((a, b) => a.distSq - b.distSq);
    for (const off of radialOffsets) {
      const cx = px + off.dx;
      const cy = py + off.dy;
      if (!this.collidesAt(cx, cy, PLAYER_HALF_W, PLAYER_HALF_H)) {
        this.player.x = cx;
        this.player.y = cy;
        return true;
      }
    }

    return false;
  }

  private snapClearOfRect(
    rect: { left: number; top: number; right: number; bottom: number },
    clearancePx: number,
  ): boolean {
    const px = this.player.x;
    const py = this.player.y;
    const gapX = Math.max(rect.left - (px + PLAYER_HALF_W), px - PLAYER_HALF_W - rect.right);
    const gapY = Math.max(rect.top - (py + PLAYER_HALF_H), py - PLAYER_HALF_H - rect.bottom);
    const currentClearance = Math.max(gapX, gapY);
    if (currentClearance >= clearancePx) {
      return true;
    }

    const candidates: { x: number; y: number; distSq: number }[] = [
      { x: px, y: rect.top - PLAYER_HALF_H - clearancePx, distSq: (rect.top - PLAYER_HALF_H - clearancePx - py) ** 2 },
      { x: px, y: rect.bottom + PLAYER_HALF_H + clearancePx, distSq: (rect.bottom + PLAYER_HALF_H + clearancePx - py) ** 2 },
      { x: rect.left - PLAYER_HALF_W - clearancePx, y: py, distSq: (rect.left - PLAYER_HALF_W - clearancePx - px) ** 2 },
      { x: rect.right + PLAYER_HALF_W + clearancePx, y: py, distSq: (rect.right + PLAYER_HALF_W + clearancePx - px) ** 2 },
    ];
    candidates.sort((a, b) => a.distSq - b.distSq);

    for (const cand of candidates) {
      if (
        cand.distSq <= 32 * 32 &&
        !this.collidesAt(cand.x, cand.y, PLAYER_HALF_W, PLAYER_HALF_H)
      ) {
        this.player.x = cand.x;
        this.player.y = cand.y;
        return true;
      }
    }

    // If tight against another obstacle, ensure at least non-overlapping (clearance >= 0)
    this.unstickPlayer();
    const afterGapX = Math.max(
      rect.left - (this.player.x + PLAYER_HALF_W),
      this.player.x - PLAYER_HALF_W - rect.right,
    );
    const afterGapY = Math.max(
      rect.top - (this.player.y + PLAYER_HALF_H),
      this.player.y - PLAYER_HALF_H - rect.bottom,
    );
    return Math.max(afterGapX, afterGapY) >= 0;
  }

  private collidesAt(cx: number, cy: number, halfW: number, halfH: number): boolean {
    const left = cx - halfW;
    const right = cx + halfW;
    const top = cy - halfH;
    const bottom = cy + halfH;

    const colLeft = Math.floor(left / TILE_SIZE);
    const colRight = Math.floor(right / TILE_SIZE);
    const rowTop = Math.floor(top / TILE_SIZE);
    const rowBottom = Math.floor(bottom / TILE_SIZE);

    for (let r = rowTop; r <= rowBottom; r++) {
      for (let c = colLeft; c <= colRight; c++) {
        if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
        if (this.terrain[r][c] === 'water') return true;
        if (isSolidStructure(this.structures[r][c])) return true;
        if (this.structures[r][c] === 'banner') {
          const rect = getBannerCollisionRect(c, r, this.bannerRestored);
          if (
            rect &&
            right > rect.left &&
            left < rect.right &&
            bottom > rect.top &&
            top < rect.bottom
          ) {
            return true;
          }
        }
      }
    }

    for (const obj of this.worldObjects) {
      const rect = getObjectCollisionRect(obj);
      if (!rect) continue;
      if (right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        return true;
      }
    }

    for (const bld of this.buildingObjects) {
      const rect = getBuildingCollisionRect(bld);
      if (!rect) continue;
      if (right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        return true;
      }
    }

    for (const station of COOKING_STATIONS) {
      const rect = getCookingStationCollisionRect(station);
      if (right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        return true;
      }
    }

    for (const npc of this.npcs) {
      const rect = getNpcCollisionRect(npc);
      if (!rect) continue;
      if (right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom) {
        return true;
      }
    }

    return false;
  }

  private findInteractiveObjectNearTile(col: number, row: number): WorldObject | null {
    const tx = (col + 0.5) * TILE_SIZE;
    const ty = (row + 0.5) * TILE_SIZE;
    for (const obj of this.worldObjects) {
      const rect = getObjectCollisionRect(obj);
      if (!rect) continue;
      if (
        tx >= rect.left - 24 &&
        tx <= rect.right + 24 &&
        ty >= rect.top - 24 &&
        ty <= rect.bottom + 24
      ) {
        return obj;
      }
    }
    return null;
  }

  private interactWithBuilding(bld: BuildingObject): void {
    const slot = this.quickBar[this.selectedSlot];

    if (bld.type === 'farmhouse') {
      this.clearInputs();
      this.phase = 'SLEEP_CONFIRM';
      this.emitHud();
      return;
    }

    if (bld.type === 'seed_stall') {
      this.clearInputs();
      this.phase = 'SHOP';
      this.emitHud();
      return;
    }

    if (bld.type === 'well') {
      if (slot && slot.itemId === 'watering_can') {
        slot.waterLevel = WATERING_CAN_MAX;
        this.triggerActionAnim('watering_can');
        this.showToast(`Watering Can refilled (${WATERING_CAN_MAX}/${WATERING_CAN_MAX})`);
        this.emitHud();
      } else {
        this.showToast('Equip your Watering Can [2] to refill at the Well.');
      }
      return;
    }

    if (bld.type === 'shipping_bin') {
      if (slot && (ITEMS[slot.itemId].category === 'crop' || ITEMS[slot.itemId].category === 'dish')) {
        const shipId = slot.itemId as ShippableItemId;
        const def = ITEMS[shipId];
        const price = def.sellPrice ?? 0;
        this.shippingBin[shipId] = (this.shippingBin[shipId] ?? 0) + 1;
        this.consumeSlot(this.selectedSlot, 1);
        this.showToast(`Shipped ${def.name} (+${price}G at midnight)`);
        this.emitHud();
      } else {
        const snap = this.getHudSnapshot();
        if (snap.shippingCount > 0) {
          this.showToast(
            `Shipping Bin: ${snap.shippingCount} item(s) worth ${snap.shippingValue}G tonight`,
          );
        } else {
          this.showToast('Hold a harvested crop or dish and press [E] here to ship it.');
        }
      }
      return;
    }

    if (bld.type === 'signpost') {
      if (this.bannerRestored) {
        this.showToast('Suncrest Homestead — Banner Restored! Free play continues.');
      } else {
        this.showToast(
          `Suncrest Homestead: Earn ${BANNER_GOAL_GOLD}G total (${this.totalEarned}/${BANNER_GOAL_GOLD}G)`,
        );
      }
      return;
    }

    if (bld.type === 'gate_closed') {
      bld.type = 'gate_open';
      bld.x = 608 + BUILDING_OBJECT_SPECS.gate_open.w;
      this.emitHud();
      return;
    }

    if (bld.type === 'gate_open') {
      const closedCenter = 640;
      const closedRect = {
        left: closedCenter - BUILDING_OBJECT_SPECS.gate_closed.collision![0],
        right: closedCenter + BUILDING_OBJECT_SPECS.gate_closed.collision![0],
        top: bld.y - BUILDING_OBJECT_SPECS.gate_closed.collision![1] * PIXEL_SCALE,
        bottom: bld.y,
      };
      const pLeft = this.player.x - 14;
      const pRight = this.player.x + 14;
      const pTop = this.player.y - 10;
      const pBottom = this.player.y + 10;
      if (
        pRight > closedRect.left &&
        pLeft < closedRect.right &&
        pBottom > closedRect.top &&
        pTop < closedRect.bottom
      ) {
        this.showToast('Step clear of the gate to close it.');
        return;
      }
      bld.type = 'gate_closed';
      bld.x = closedCenter;
      this.emitHud();
    }
  }

  private interactWithTile(col: number, row: number): void {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    const structure = this.structures[row][col];
    const terrain = this.terrain[row][col];
    const slot = this.quickBar[this.selectedSlot];

    if (structure === 'banner') {
      if (this.bannerRestored) {
        this.showToast('Suncrest Homestead Banner — Restored!');
      } else {
        this.showToast(
          `Homestead Banner: ${this.totalEarned}G / ${BANNER_GOAL_GOLD}G total earned`,
        );
      }
      return;
    }

    if (terrain === 'water') {
      if (slot && slot.itemId === 'watering_can') {
        slot.waterLevel = WATERING_CAN_MAX;
        this.triggerActionAnim('watering_can');
        this.showToast(`Watering Can refilled (${WATERING_CAN_MAX}/${WATERING_CAN_MAX})`);
        this.emitHud();
      } else {
        this.showToast('Equip your Watering Can [2] to refill here.');
      }
      return;
    }

    if (terrain === 'farm_plot') {
      const key = tileKey(col, row);
      const tileState = this.farmTiles[key];

      if (tileState?.crop) {
        const def = CROPS[tileState.crop.id];
        if (tileState.crop.daysGrown >= def.growDays) {
          if (this.activeAction) return;
          if (!this.canAddItem(def.id, 1)) {
            this.showToast('Quick bar is full! Ship crops at the Bin first.');
            return;
          }
          this.startPlayerAction('harvest', col, row);
          return;
        }
      }

      if (!slot) {
        if (tileState?.crop) {
          const def = CROPS[tileState.crop.id];
          const remaining = Math.max(0, def.growDays - tileState.crop.daysGrown);
          this.showToast(
            `${def.name}: ${remaining} watered day(s) left${tileState.watered ? ' · Watered' : ' · Needs water'}`,
          );
        }
        return;
      }

      if (slot.itemId === 'hoe') {
        if (this.activeAction) return;
        if (!canTillTile(tileState)) {
          this.showToast('Soil is already tilled.');
          return;
        }
        if (this.stamina < HOE_STAMINA_COST) {
          this.showToast('Too tired');
          return;
        }
        this.startPlayerAction('hoe', col, row);
        return;
      }

      if (slot.itemId === 'watering_can') {
        if (this.activeAction) return;
        if (!tileState?.tilled) {
          this.showToast('Till the soil with your Hoe [1] first.');
          return;
        }
        if (!canWaterTile(tileState)) {
          this.showToast('Already watered today.');
          return;
        }
        const water = slot.waterLevel ?? 0;
        if (water <= 0) {
          this.showToast('Watering Can empty — refill at the Well!');
          return;
        }
        if (this.stamina < WATER_STAMINA_COST) {
          this.showToast('Too tired');
          return;
        }
        this.startPlayerAction('water', col, row);
        return;
      }

      if (ITEMS[slot.itemId].category === 'seed') {
        if (!tileState?.tilled) {
          this.showToast('Till soil with your Hoe [1] before planting.');
          return;
        }
        if (!canPlantOnTile(tileState)) {
          this.showToast('A crop is already growing here.');
          return;
        }
        const seedId = slot.itemId as SeedItemId;
        const cropId = plantSeedOnTile(tileState, seedId);
        if (!cropId) return;
        this.consumeSlot(this.selectedSlot, 1);
        this.showToast(`Planted ${CROPS[cropId].name} seeds`);
        if (isPlantingTooLate(cropId, this.day)) {
          this.showWarning("This crop won't ripen before the season ends.");
        }
        this.emitHud();
        return;
      }
    }

    if (slot && ITEMS[slot.itemId].category === 'dish') {
      this.eatSelectedDish();
      return;
    }

    const facingResource = this.findFacingResourceTarget();
    const obj = facingResource ?? this.findInteractiveObjectNearTile(col, row);
    if (obj && RESOURCE_TARGET_CONFIG[obj.type]) {
      this.interactWithResourceObject(obj);
      return;
    }

    if (slot && (slot.itemId === 'axe' || slot.itemId === 'pickaxe')) {
      const cost = slot.itemId === 'axe' ? AXE_STAMINA_COST : PICKAXE_STAMINA_COST;
      if (this.stamina < cost) {
        this.showToast('Too tired');
      }
      return;
    }

    if (obj) {
      const hint = NATURE_OBJECT_SPECS[obj.type].toolHint;
      if (hint) {
        this.showToast(hint);
      }
    }
  }

  private interactWithResourceObject(obj: WorldObject): void {
    if (this.activeAction) return;
    const rule = RESOURCE_TARGET_CONFIG[obj.type];
    if (!rule) return;

    const slot = this.quickBar[this.selectedSlot];
    if (!slot || slot.itemId !== rule.requiredTool) {
      this.showToast(rule.wrongToolHint);
      return;
    }

    const staminaCost = slot.itemId === 'axe' ? AXE_STAMINA_COST : PICKAXE_STAMINA_COST;
    if (this.stamina < staminaCost) {
      this.showToast('Too tired');
      return;
    }

    const rect = getObjectCollisionRect(obj);
    if (rect && !this.snapClearOfRect(rect, MIN_SWING_CLEARANCE_PX)) {
      return;
    }

    this.startPlayerAction(
      slot.itemId,
      Math.floor(obj.x / TILE_SIZE),
      Math.floor(obj.y / TILE_SIZE),
      obj.id,
    );
  }

  private triggerActionAnim(tool: ItemId): void {
    this.player.actionTimer = 0.22;
    this.player.actionTool = tool;
  }

  private getActionAssets(kind: FarmerActionKind): {
    image: HTMLImageElement | null | undefined;
    manifest: FarmerActionManifest | null | undefined;
  } {
    if (kind === 'hoe') {
      return { image: this.sheets?.farmerHoe, manifest: this.sheets?.farmerHoeManifest };
    }
    if (kind === 'water') {
      return { image: this.sheets?.farmerWater, manifest: this.sheets?.farmerWaterManifest };
    }
    if (kind === 'axe') {
      return { image: this.sheets?.farmerAxe, manifest: this.sheets?.farmerAxeManifest };
    }
    if (kind === 'pickaxe') {
      return { image: this.sheets?.farmerPickaxe, manifest: this.sheets?.farmerPickaxeManifest };
    }
    return { image: this.sheets?.farmerHarvest, manifest: this.sheets?.farmerHarvestManifest };
  }

  private clearActiveAction(): void {
    if (this.activeAction?.fallbackTimeoutId) {
      clearTimeout(this.activeAction.fallbackTimeoutId);
    }
    this.activeAction = null;
    this.idleElapsedMs = 0;
  }

  private startPlayerAction(
    kind: FarmerActionKind,
    col: number,
    row: number,
    targetObjectId?: string,
  ): void {
    this.clearActiveAction();
    const { manifest } = this.getActionAssets(kind);
    const defaultDurations =
      kind === 'harvest' ? [150, 200] : kind === 'water' ? [150, 150, 150] : [100, 100, 100];
    const frameCount = manifest?.frames ?? defaultDurations.length;
    const frameDurationsMs =
      manifest && manifest.frameDurationMs.length >= frameCount
        ? manifest.frameDurationMs.slice(0, frameCount)
        : defaultDurations;

    let effectFrame = frameDurationsMs.length - 1;
    if (manifest?.hitFrame !== undefined) {
      effectFrame = Math.max(
        0,
        Math.min(
          frameDurationsMs.length - 1,
          manifest.hitFrame >= frameDurationsMs.length ? manifest.hitFrame - 1 : manifest.hitFrame,
        ),
      );
    } else if (manifest?.effectOnFrame !== undefined) {
      effectFrame = Math.max(0, Math.min(frameDurationsMs.length - 1, manifest.effectOnFrame - 1));
    }

    const totalMs = frameDurationsMs.reduce((sum, ms) => sum + ms, 0);
    const lockTimeoutMs = totalMs + ACTION_LOCK_TIMEOUT_BUFFER_MS;
    const targetInitialType = targetObjectId
      ? this.worldObjects.find((item) => item.id === targetObjectId)?.type
      : undefined;

    this.player.isMoving = false;
    this.player.animTimer = 0;
    this.idleElapsedMs = 0;

    const action: PendingPlayerAction = {
      kind,
      col,
      row,
      targetObjectId,
      targetInitialType,
      elapsedMs: 0,
      frameDurationsMs,
      lockTimeoutMs,
      lockDeadlineMs: Date.now() + lockTimeoutMs,
      fallbackTimeoutId: null,
      effectFrame,
      effectApplied: false,
    };

    action.fallbackTimeoutId = setTimeout(() => {
      if (this.activeAction === action) {
        this.clearActiveAction();
      }
    }, lockTimeoutMs);

    this.activeAction = action;
  }

  private getIdleFrameFromManifest(
    manifest: FarmerIdleManifest | null | undefined,
    elapsedMs: number,
  ): number {
    const count = manifest?.frames ?? 2;
    const durations =
      manifest && manifest.frameDurationMs.length >= count
        ? manifest.frameDurationMs.slice(0, count)
        : [500, 500];
    const totalMs = durations.reduce((sum, ms) => sum + ms, 0);
    if (totalMs <= 0) return 0;
    const t =
      manifest?.loop === false
        ? Math.min(elapsedMs, totalMs - 1)
        : elapsedMs % totalMs;
    let acc = 0;
    for (let i = 0; i < durations.length; i++) {
      acc += durations[i];
      if (t < acc) return i;
    }
    return durations.length - 1;
  }

  private drawCharacterIdleSprite(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    manifest: FarmerIdleManifest,
    feetX: number,
    feetY: number,
    facing: Direction,
    elapsedMs: number,
  ): void {
    const dirIdx = manifest.directions.indexOf(facing);
    const dirRow = dirIdx >= 0 ? dirIdx : FARMER_DIRECTION_ROW[facing];
    const frameCol = this.getIdleFrameFromManifest(manifest, elapsedMs);
    const frameW = manifest.frameWidth;
    const frameH = manifest.frameHeight;
    const drawW = frameW * PIXEL_SCALE;
    const drawH = frameH * PIXEL_SCALE;
    const drawX = Math.round(feetX - (frameW / 2) * PIXEL_SCALE);
    const drawY = Math.round(feetY - (frameH - 2) * PIXEL_SCALE);

    ctx.drawImage(
      img,
      frameCol * frameW,
      dirRow * frameH,
      frameW,
      frameH,
      drawX,
      drawY,
      drawW,
      drawH,
    );
  }

  private getActiveActionFrame(action: PendingPlayerAction): number {
    let acc = 0;
    for (let i = 0; i < action.frameDurationsMs.length; i++) {
      acc += action.frameDurationsMs[i];
      if (action.elapsedMs < acc) {
        return i;
      }
    }
    return action.frameDurationsMs.length - 1;
  }

  private applyActionEffect(action: PendingPlayerAction): void {
    if (action.kind === 'hoe') {
      this.applyHoeEffect(action.col, action.row);
    } else if (action.kind === 'water') {
      this.applyWaterEffect(action.col, action.row);
    } else if (action.kind === 'harvest') {
      this.applyHarvestEffect(action.col, action.row);
    } else {
      this.applyResourceHitEffect(action.kind, action.targetObjectId);
    }
  }

  private applyHoeEffect(col: number, row: number): void {
    const key = tileKey(col, row);
    if (!canTillTile(this.farmTiles[key])) return;
    if (this.stamina < HOE_STAMINA_COST) {
      this.showToast('Too tired');
      return;
    }
    this.stamina -= HOE_STAMINA_COST;
    this.farmTiles[key] = tillTile();
    this.recomputeCellAndNeighbors(col, row);
    this.emitHud();
  }

  private applyWaterEffect(col: number, row: number): void {
    const key = tileKey(col, row);
    const tileState = this.farmTiles[key];
    const slot = this.quickBar[this.selectedSlot];
    if (!canWaterTile(tileState)) return;
    if (!slot || slot.itemId !== 'watering_can') return;
    const water = slot.waterLevel ?? 0;
    if (water <= 0) {
      this.showToast('Watering Can empty — refill at the Well!');
      return;
    }
    if (this.stamina < WATER_STAMINA_COST) {
      this.showToast('Too tired');
      return;
    }
    if (!waterTile(tileState)) return;
    this.stamina -= WATER_STAMINA_COST;
    slot.waterLevel = water - 1;
    this.recomputeCellAndNeighbors(col, row);
    this.emitHud();
  }

  private applyHarvestEffect(col: number, row: number): void {
    const key = tileKey(col, row);
    const tileState = this.farmTiles[key];
    if (!tileState?.crop) return;
    const def = CROPS[tileState.crop.id];
    if (tileState.crop.daysGrown < def.growDays) return;
    if (!this.canAddItem(def.id, 1)) {
      this.showToast('Quick bar is full! Ship crops at the Bin first.');
      return;
    }
    this.addItemToQuickBar(def.id, 1);
    tileState.crop = null;
    this.showToast(`Harvested ${def.name}!`);
    this.emitHud();
  }

  private applyResourceHitEffect(tool: 'axe' | 'pickaxe', targetObjectId?: string): void {
    if (!targetObjectId) return;
    const obj = this.worldObjects.find((item) => item.id === targetObjectId);
    if (!obj) return;
    const rule = RESOURCE_TARGET_CONFIG[obj.type];
    if (!rule || rule.requiredTool !== tool) return;

    const staminaCost = tool === 'axe' ? AXE_STAMINA_COST : PICKAXE_STAMINA_COST;
    if (this.stamina < staminaCost) {
      this.showToast('Too tired');
      return;
    }

    this.stamina -= staminaCost;
    obj.health -= 1;
    this.objectShakeTimers[obj.id] = rule.shakeDurationSec;

    if (obj.health <= 0) {
      const added = this.addItemToQuickBar(rule.dropItem, rule.dropCount);
      if (added > 0) {
        this.showPickup(`+${added} ${ITEMS[rule.dropItem].name}`);
      }
      if (added < rule.dropCount) {
        this.showToast('Inventory full');
      }

      if (rule.becomesType) {
        const nextType = rule.becomesType;
        const nextMax =
          RESOURCE_TARGET_CONFIG[nextType]?.hitsRequired ?? NATURE_OBJECT_SPECS[nextType].maxHealth;
        obj.type = nextType;
        obj.maxHealth = nextMax;
        obj.health = nextMax;
        this.unstickPlayer();
      } else {
        this.worldObjects = this.worldObjects.filter((item) => item.id !== obj.id);
        delete this.objectShakeTimers[obj.id];
      }
    }

    this.emitHud();
  }

  private getAvailableSpace(itemId: ItemId): number {
    if (ITEMS[itemId].category === 'tool') return 0;
    const slotCap = ITEMS[itemId].maxStack ?? Number.MAX_SAFE_INTEGER;
    let space = 0;
    for (const slot of this.quickBar) {
      if (slot === null) {
        space += slotCap;
      } else if (slot.itemId === itemId) {
        space += Math.max(0, slotCap - slot.count);
      }
    }
    return space;
  }

  private canAddItem(itemId: ItemId, count: number): boolean {
    return count > 0 && this.getAvailableSpace(itemId) >= count;
  }

  private canAddItemAfterConsuming(
    addItemId: ItemId,
    addCount: number,
    ingredients: readonly RecipeIngredient[],
  ): boolean {
    if (ITEMS[addItemId].category === 'tool' || addCount <= 0) return false;
    const virtualSlots = this.quickBar.map((s) => (s ? { ...s } : null));
    for (const ing of ingredients) {
      let rem = ing.count;
      for (let i = 0; i < QUICK_BAR_SIZE && rem > 0; i++) {
        const slot = virtualSlots[i];
        if (!slot || slot.itemId !== ing.itemId) continue;
        const take = Math.min(slot.count, rem);
        slot.count -= take;
        rem -= take;
        if (slot.count <= 0) {
          virtualSlots[i] = null;
        }
      }
      if (rem > 0) return false;
    }

    const slotCap = ITEMS[addItemId].maxStack ?? Number.MAX_SAFE_INTEGER;
    let space = 0;
    for (const slot of virtualSlots) {
      if (slot === null) {
        space += slotCap;
      } else if (slot.itemId === addItemId) {
        space += Math.max(0, slotCap - slot.count);
      }
    }
    return space >= addCount;
  }

  private addItemToQuickBar(itemId: ItemId, count: number): number {
    if (ITEMS[itemId].category === 'tool' || count <= 0) return 0;
    const slotCap = ITEMS[itemId].maxStack ?? Number.MAX_SAFE_INTEGER;
    let remaining = count;

    for (let i = 0; i < QUICK_BAR_SIZE && remaining > 0; i++) {
      const slot = this.quickBar[i];
      if (slot && slot.itemId === itemId && slot.count < slotCap) {
        const room = slotCap - slot.count;
        const add = Math.min(room, remaining);
        slot.count += add;
        remaining -= add;
      }
    }

    for (let i = 0; i < QUICK_BAR_SIZE && remaining > 0; i++) {
      if (this.quickBar[i] === null) {
        const add = Math.min(slotCap, remaining);
        this.quickBar[i] = { itemId, count: add };
        remaining -= add;
      }
    }

    this.syncQuestReadyStates();
    return count - remaining;
  }

  private consumeSlot(index: number, amount: number): void {
    const slot = this.quickBar[index];
    if (!slot) return;
    slot.count -= amount;
    if (slot.count <= 0) {
      this.quickBar[index] = null;
    }
    this.syncQuestReadyStates();
  }

  private countItemInQuickBar(itemId: ItemId): number {
    let total = 0;
    for (const slot of this.quickBar) {
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  private consumeItemFromQuickBar(itemId: ItemId, amount: number): boolean {
    if (this.countItemInQuickBar(itemId) < amount) return false;
    let remaining = amount;
    for (let i = 0; i < QUICK_BAR_SIZE && remaining > 0; i++) {
      const slot = this.quickBar[i];
      if (!slot || slot.itemId !== itemId) continue;
      const take = Math.min(slot.count, remaining);
      slot.count -= take;
      remaining -= take;
      if (slot.count <= 0) {
        this.quickBar[i] = null;
      }
    }
    this.syncQuestReadyStates();
    return true;
  }

  private endDay(passedOut: boolean): void {
    this.clearActiveAction();
    this.clearInputs();
    this.warningMessage = null;
    this.warningTimer = 0;

    const shippedItems: ShippedLineItem[] = [];
    let earningsToday = 0;
    for (const [id, count] of Object.entries(this.shippingBin)) {
      if (!count || count <= 0) continue;
      const itemId = id as ShippableItemId;
      const def = ITEMS[itemId];
      const unitPrice = def?.sellPrice ?? 0;
      if (!def || unitPrice <= 0) continue;
      const subtotal = count * unitPrice;
      shippedItems.push({
        cropId: itemId,
        name: def.name,
        count,
        unitPrice,
        subtotal,
      });
      earningsToday += subtotal;
    }

    this.gold += earningsToday;
    this.totalEarned += earningsToday;
    this.shippingBin = {};

    let bannerJustRestored = false;
    if (!this.bannerRestored && this.totalEarned >= BANNER_GOAL_GOLD) {
      this.bannerRestored = true;
      bannerJustRestored = true;
    }

    const dayCompleted = this.day;
    const endingSeason = dayCompleted >= SEASON_LENGTH_DAYS;

    this.timeMinutes = DAY_START_MINUTES;
    this.timeAccumulator = 0;
    this.stamina = passedOut
      ? Math.round(MAX_STAMINA * PASS_OUT_STAMINA_RATIO)
      : MAX_STAMINA;

    this.player.x = (PLAYER_SPAWN_TILE.col + 0.5) * TILE_SIZE;
    this.player.y = (PLAYER_SPAWN_TILE.row + 0.65) * TILE_SIZE;
    this.player.facing = 'down';

    if (endingSeason) {
      let cropsRemovedCount = 0;
      let witheredMessage: string | null = null;
      if (this.seasonEndCropsMode === 'die') {
        cropsRemovedCount = endSeasonDieFarmTiles(this.farmTiles);
        witheredMessage = 'The season ended. Unharvested crops withered.';
        this.showToast(witheredMessage);
      } else {
        endSeasonStopFarmTiles(this.farmTiles);
      }

      const nextSeasonSave = this.exportSaveData();
      nextSeasonSave.season = 'Spring';
      nextSeasonSave.day = 1;
      writeAutoSave(nextSeasonSave);

      this.daySummary = null;
      this.seasonSummary = {
        seasonCompleted: this.season,
        seasonEndMode: this.seasonEndCropsMode,
        dayCompleted,
        passedOut,
        shippedItems,
        earningsToday,
        newGold: this.gold,
        totalEarned: this.totalEarned,
        cropsRemovedCount,
        witheredMessage,
        bannerJustRestored,
      };
      this.phase = 'SEASON_END';
      this.emitHud();
      return;
    }

    advanceDayFarmTiles(this.farmTiles);

    this.day += 1;
    writeAutoSave(this.exportSaveData());

    this.seasonSummary = null;
    this.daySummary = {
      dayCompleted,
      passedOut,
      shippedItems,
      earningsToday,
      newGold: this.gold,
      totalEarned: this.totalEarned,
      bannerJustRestored,
      nextDayIsLastDayOfSeason: this.day === SEASON_LENGTH_DAYS,
    };

    this.phase = 'DAY_SUMMARY';
    this.emitHud();
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastTimer = 2.8;
    this.emitHud();
  }

  private showPickup(message: string): void {
    this.pickupMessage = message;
    this.pickupTimer = 2.0;
    this.emitHud();
  }

  private showWarning(message: string): void {
    this.warningMessage = message;
    this.warningTimer = 2.0;
    this.emitHud();
  }

  private getTileActionHint(col: number, row: number): string | null {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return null;
    if (this.terrain[row][col] !== 'farm_plot') return null;

    const tile = this.farmTiles[tileKey(col, row)];
    if (tile?.crop) {
      const def = CROPS[tile.crop.id];
      if (tile.crop.daysGrown >= def.growDays) {
        return 'Harvest';
      }
    }

    const slot = this.quickBar[this.selectedSlot];
    if (!slot) return null;

    if (slot.itemId === 'hoe' && canTillTile(tile)) {
      return 'Till';
    }
    if (slot.itemId === 'watering_can' && canWaterTile(tile)) {
      return 'Water';
    }
    if (ITEMS[slot.itemId].category === 'seed' && canPlantOnTile(tile)) {
      const cropId = SEED_TO_CROP[slot.itemId as SeedItemId];
      if (isPlantingTooLate(cropId, this.day)) {
        return 'Plant (too late)';
      }
      return 'Plant';
    }
    return null;
  }

  private computeTargetPrompt(): string | null {
    if (this.phase !== 'PLAYING') return null;

    const slot = this.quickBar[this.selectedSlot];
    const nearbyTarget = this.findClosestInteractiveTarget();
    if (nearbyTarget?.kind === 'npc') {
      const def = NPC_DEFINITIONS[nearbyTarget.npc.id];
      return `${def.name} (${def.role}) · Talk [E]`;
    }
    if (nearbyTarget?.kind === 'cooking_station') {
      const stationType = COOKING_STATION_TYPES[nearbyTarget.station.type];
      return `${stationType.label} · Cook [E]`;
    }
    const nearby = nearbyTarget?.kind === 'building' ? nearbyTarget.building : null;
    if (nearby) {
      if (nearby.type === 'farmhouse') {
        return 'Farmhouse Door · Sleep for the night [E]';
      }
      if (nearby.type === 'seed_stall') {
        return 'Seed Stall · Buy Spring Seeds [E]';
      }
      if (nearby.type === 'well') {
        if (slot?.itemId === 'watering_can') {
          return `Water Well · Refill Watering Can (${slot.waterLevel ?? 0}/${WATERING_CAN_MAX}) [E]`;
        }
        return 'Water Well · Equip Watering Can [2] to refill [E]';
      }
      if (nearby.type === 'shipping_bin') {
        if (slot && (ITEMS[slot.itemId].category === 'crop' || ITEMS[slot.itemId].category === 'dish')) {
          const def = ITEMS[slot.itemId];
          return `Shipping Bin · Ship ${def.name} (${def.sellPrice ?? 0}G) [E]`;
        }
        return 'Shipping Bin · Hold a crop or dish to ship [E]';
      }
      if (nearby.type === 'signpost') {
        return 'Homestead Signpost · Read [E]';
      }
      if (nearby.type === 'gate_closed') {
        return 'Farm Gate · Open [E]';
      }
      if (nearby.type === 'gate_open') {
        return 'Farm Gate · Close [E]';
      }
    }

    const cursorTarget = this.hoverTile
      ? this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row)
      : null;
    const facing = this.getActionFacingTile();
    const target =
      cursorTarget &&
      (this.terrain[cursorTarget.row]?.[cursorTarget.col] === 'farm_plot' ||
        this.structures[cursorTarget.row]?.[cursorTarget.col] === 'banner')
        ? cursorTarget
        : facing;

    if (target.col < 0 || target.col >= MAP_COLS || target.row < 0 || target.row >= MAP_ROWS) {
      return null;
    }
    const structure = this.structures[target.row][target.col];
    const terrain = this.terrain[target.row][target.col];

    if (structure === 'banner') {
      return this.bannerRestored
        ? 'Suncrest Homestead Banner (Restored!)'
        : `Homestead Banner · ${this.totalEarned} / ${BANNER_GOAL_GOLD}G earned [Space / Click]`;
    }
    if (terrain === 'water') {
      if (slot?.itemId === 'watering_can') {
        return `Pond · Refill Watering Can (${slot.waterLevel ?? 0}/${WATERING_CAN_MAX}) [Space / Click]`;
      }
      return 'Water Source · Equip Watering Can [2] to refill';
    }
    if (terrain === 'farm_plot') {
      const hint = this.getTileActionHint(target.col, target.row);
      const tile = this.farmTiles[tileKey(target.col, target.row)];
      if (hint === 'Harvest' && tile?.crop) {
        return `Ripe ${CROPS[tile.crop.id].name} · Harvest [Space / Click]`;
      }
      if (hint === 'Plant (too late)' && slot) {
        return `${ITEMS[slot.itemId].name} · Plant (too late to ripen!) [Space / Click]`;
      }
      if (hint === 'Plant' && slot) {
        return `${ITEMS[slot.itemId].name} · Plant [Space / Click]`;
      }
      if (hint === 'Water') {
        return 'Tilled Soil · Water [Space / Click]';
      }
      if (hint === 'Till') {
        return 'Farm Plot · Till [Space / Click]';
      }
    }

    const facingObj = this.findFacingResourceTarget();
    const obj = facingObj ?? this.findInteractiveObjectNearTile(target.col, target.row);
    if (obj) {
      const rule = RESOURCE_TARGET_CONFIG[obj.type];
      if (rule) {
        if (slot?.itemId === rule.requiredTool) {
          const actionVerb = rule.requiredTool === 'axe' ? 'Chop' : 'Mine';
          return `${actionVerb} [Space / Click]`;
        }
        return rule.wrongToolHint;
      }
      const hint = NATURE_OBJECT_SPECS[obj.type].toolHint;
      if (hint) return hint;
    }

    if (slot && ITEMS[slot.itemId].category === 'dish') {
      const def = ITEMS[slot.itemId];
      return `${def.name} · Eat (+${def.staminaRestore ?? 0} Stamina) [Space / Click]`;
    }

    return null;
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const atlas = this.atlas;
    const sheets = this.sheets;
    if (!ctx || !canvas || !atlas) return;

    this.resizeCanvas();
    ctx.imageSmoothingEnabled = false;

    const vw = canvas.width;
    const vh = canvas.height;
    const worldW = MAP_COLS * TILE_SIZE;
    const worldH = MAP_ROWS * TILE_SIZE;

    if (vw >= worldW) {
      this.camera.x = -(vw - worldW) / 2;
    } else {
      const targetX = this.player.x - vw / 2;
      this.camera.x = Math.max(0, Math.min(worldW - vw, targetX));
    }

    if (vh >= worldH) {
      this.camera.y = -(vh - worldH) / 2;
    } else {
      const targetY = this.player.y - vh / 2;
      this.camera.y = Math.max(0, Math.min(worldH - vh, targetY));
    }

    this.updateHoverTile();

    ctx.fillStyle = '#25421E';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(Math.round(-this.camera.x), Math.round(-this.camera.y));

    const terrainImg = sheets?.terrainV2;
    const manifest = sheets?.terrainV2Manifest;
    const natureImg = sheets?.natureObjects;
    const buildingsImg = sheets?.buildingsObjects;
    const farmerImg = sheets?.farmer;
    const farmerIdleImg = sheets?.farmerIdle;
    const farmerIdleManifest = sheets?.farmerIdleManifest;

    if (terrainImg && manifest) {
      // Layer 1: grass_1..4 chosen randomly per cell, fixed per cell
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          const grassKey = this.grassVariants[r][c];
          const rect = manifest.grass[grassKey];
          ctx.drawImage(
            terrainImg,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            c * TILE_SIZE,
            r * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }
      }

      // Layer 2: dirt path cells (8-neighbor bitmask autotiling + dirtVariants for key 255)
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (this.terrain[r][c] !== 'dirt') continue;
          const mask = this.dirtMasks[r][c];
          const variant = this.dirtInteriorVariants[r][c];
          const rect =
            mask === 255 && variant !== '255'
              ? manifest.dirtVariants[variant]
              : manifest.autotile.dirt[String(mask)] ?? manifest.autotile.dirt['255'];
          ctx.drawImage(
            terrainImg,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            c * TILE_SIZE,
            r * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }
      }

      // Layer 3: tilled soil cells (soil_dry / soil_wet with shared 8-neighbor bitmask)
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          const tileState = this.farmTiles[tileKey(c, r)];
          if (!tileState?.tilled) {
            if (this.terrain[r][c] === 'farm_plot') {
              // Faint plot guide marks on untilled farm_plot grass cells
              ctx.strokeStyle = 'rgba(244, 234, 213, 0.18)';
              ctx.lineWidth = 2;
              ctx.strokeRect(c * TILE_SIZE + 4, r * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }
            continue;
          }
          const mask = this.soilMasks[r][c];
          const setName = tileState.watered ? 'soil_wet' : 'soil_dry';
          const rect = manifest.autotile[setName][String(mask)] ?? manifest.autotile[setName]['255'];
          ctx.drawImage(
            terrainImg,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            c * TILE_SIZE,
            r * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }
      }

      // Layer 4: water cells (8-neighbor bitmask autotiling)
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (this.terrain[r][c] !== 'water') continue;
          const mask = this.waterMasks[r][c];
          const rect = manifest.autotile.water[String(mask)] ?? manifest.autotile.water['255'];
          ctx.drawImage(
            terrainImg,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            c * TILE_SIZE,
            r * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }
      }
    } else {
      // Fallback while terrain_v2 loads
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          const kind = this.terrain[r][c];
          ctx.fillStyle =
            kind === 'water'
              ? '#3C87BC'
              : kind === 'dirt'
                ? '#C59A67'
                : this.farmTiles[tileKey(c, r)]?.tilled
                  ? '#734A2D'
                  : '#629844';
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Target / Hover tile cursor on farm_plot or resource object (drawn beneath crops/objects/farmer)
    if (this.phase === 'PLAYING') {
      const facingTile = this.getFacingTile();
      if (
        facingTile.row >= FARM_PLOT_BOUNDS.minRow &&
        facingTile.row <= FARM_PLOT_BOUNDS.maxRow &&
        facingTile.col >= FARM_PLOT_BOUNDS.minCol &&
        facingTile.col <= FARM_PLOT_BOUNDS.maxCol
      ) {
        this.drawTileCursor(ctx, facingTile.col, facingTile.row, 'rgba(244, 234, 213, 0.55)');
      } else {
        const facingObj = this.findFacingResourceTarget();
        if (facingObj) {
          this.drawResourceCursor(ctx, facingObj, 'rgba(244, 234, 213, 0.55)');
        }
      }

      if (this.hoverTile) {
        const clickable = this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row);
        if (
          clickable &&
          clickable.row >= FARM_PLOT_BOUNDS.minRow &&
          clickable.row <= FARM_PLOT_BOUNDS.maxRow &&
          clickable.col >= FARM_PLOT_BOUNDS.minCol &&
          clickable.col <= FARM_PLOT_BOUNDS.maxCol
        ) {
          this.drawTileCursor(ctx, clickable.col, clickable.row, 'rgba(229, 154, 40, 0.9)');
        } else if (this.mouseScreen) {
          const hoverObj = this.findResourceObjectAtWorldPoint(
            this.mouseScreen.x + this.camera.x,
            this.mouseScreen.y + this.camera.y,
          );
          if (hoverObj && this.isResourceObjectInClickReach(hoverObj)) {
            this.drawResourceCursor(ctx, hoverObj, 'rgba(229, 154, 40, 0.9)');
          }
        }
      }
    }

    // Y-Sorted Drawables (Crops, Homestead Banner, Buildings, Fences/Gate, Nature Objects, and Farmer)
    interface Drawable {
      sortY: number;
      drawShadow?: () => void;
      draw: () => void;
    }
    const drawables: Drawable[] = [];

    const cropsImg = sheets?.crops;
    const cropsManifest = sheets?.cropsManifest;
    const sparkleFrame = Math.floor(this.animClock * 2) % 2;

    if (cropsImg && cropsManifest) {
      const cellW = cropsManifest.cellWidth;
      const cellH = cropsManifest.cellHeight;
      const drawW = cellW * PIXEL_SCALE;
      const drawH = cellH * PIXEL_SCALE;
      const offsetY = cropsManifest.drawOffsetY * PIXEL_SCALE;

      for (let r = FARM_PLOT_BOUNDS.minRow; r <= FARM_PLOT_BOUNDS.maxRow; r++) {
        for (let c = FARM_PLOT_BOUNDS.minCol; c <= FARM_PLOT_BOUNDS.maxCol; c++) {
          const state = this.farmTiles[tileKey(c, r)];
          if (!state?.crop) continue;
          const tileX = Math.round(c * TILE_SIZE);
          const tileY = Math.round(r * TILE_SIZE);
          const def = CROPS[state.crop.id];
          const stage =
            state.crop.daysGrown >= def.growDays
              ? 4
              : 1 + Math.floor((state.crop.daysGrown / def.growDays) * 3);

          const spriteName = `${state.crop.id}_stage${stage}`;
          const rect = cropsManifest.sprites[spriteName];
          if (!rect) continue;

          const drawY = Math.round(tileY + offsetY);
          drawables.push({
            sortY: Math.round(tileY + 21 * PIXEL_SCALE),
            draw: () => {
              ctx.drawImage(
                cropsImg,
                rect.x,
                rect.y,
                cellW,
                cellH,
                tileX,
                drawY,
                drawW,
                drawH,
              );

              if (stage === 4) {
                this.drawRipeSparkle(ctx, tileX, drawY, sparkleFrame);
              }
            },
          });
        }
      }
    }

    if (buildingsImg) {
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (this.structures[r][c] !== 'banner') continue;
          const anchor = getBannerAnchor(c, r);
          const bannerKey = this.bannerRestored ? 'banner_restored' : 'banner_unrestored';
          const spec = BUILDING_OBJECT_SPECS[bannerKey];
          const shadowSpec = SPRITE_SHADOW_SPECS[bannerKey];
          const drawW = spec.w * PIXEL_SCALE;
          const drawH = spec.h * PIXEL_SCALE;
          const drawX = Math.round(anchor.x - drawW / 2);
          const drawY = Math.round(anchor.y - drawH);

          drawables.push({
            sortY: anchor.y,
            drawShadow: shadowSpec
              ? () => this.drawPixelShadow(ctx, anchor.x, anchor.y, shadowSpec)
              : undefined,
            draw: () => {
              ctx.drawImage(
                buildingsImg,
                spec.x,
                spec.y,
                spec.w,
                spec.h,
                drawX,
                drawY,
                drawW,
                drawH,
              );
            },
          });
        }
      }
    }

    if (buildingsImg) {
      for (const b of this.buildingObjects) {
        const renderKey = this.getBuildingRenderKey(b.type);
        const spec = BUILDING_OBJECT_SPECS[renderKey];
        const shadowSpec = SPRITE_SHADOW_SPECS[renderKey];
        const drawW = spec.w * PIXEL_SCALE;
        const drawH = spec.h * PIXEL_SCALE;
        const drawX = Math.round(b.x - drawW / 2);
        const drawY = Math.round(b.y - drawH);

        drawables.push({
          sortY: b.y,
          drawShadow: shadowSpec
            ? () => this.drawPixelShadow(ctx, b.x, b.y, shadowSpec)
            : undefined,
          draw: () => {
            ctx.drawImage(
              buildingsImg,
              spec.x,
              spec.y,
              spec.w,
              spec.h,
              drawX,
              drawY,
              drawW,
              drawH,
            );
          },
        });
      }
    }

    for (const station of COOKING_STATIONS) {
      const spriteImg = sheets?.cookingStationSprites[station.type];
      const stationManifest = sheets?.cookingStationManifests[station.type];
      const frameW = stationManifest?.frameWidth ?? station.w;
      const frameH = stationManifest?.frameHeight ?? station.h;
      const anchorX = stationManifest?.anchor?.x ?? station.anchor[0];
      const anchorY = stationManifest?.anchor?.y ?? station.anchor[1];
      const drawW = frameW * PIXEL_SCALE;
      const drawH = frameH * PIXEL_SCALE;
      const drawX = Math.round(station.x - anchorX * PIXEL_SCALE);
      const drawY = Math.round(station.y - anchorY * PIXEL_SCALE);
      const frameIndex =
        this.phase === 'COOKING' && this.activeCookingStationId === station.id ? 1 : 0;

      drawables.push({
        sortY: station.y,
        drawShadow: station.shadow
          ? () => this.drawPixelShadow(ctx, station.x, station.y, station.shadow!)
          : undefined,
        draw: () => {
          if (spriteImg) {
            ctx.drawImage(
              spriteImg,
              frameIndex * frameW,
              0,
              frameW,
              frameH,
              drawX,
              drawY,
              drawW,
              drawH,
            );
          } else {
            const phW = 18 * PIXEL_SCALE;
            const phH = 26 * PIXEL_SCALE;
            this.drawCookingStationPlaceholder(
              ctx,
              Math.round(station.x - phW / 2),
              Math.round(station.y - phH),
              phW,
              phH,
            );
          }
        },
      });
    }

    if (natureImg) {
      for (const obj of this.worldObjects) {
        const spec = NATURE_OBJECT_SPECS[obj.type];
        const shadowSpec = SPRITE_SHADOW_SPECS[obj.type];
        const drawW = spec.w * PIXEL_SCALE;
        const drawH = spec.h * PIXEL_SCALE;
        const shakeOffsetX =
          (this.objectShakeTimers[obj.id] ?? 0) > 0
            ? Math.floor(this.animClock * 45) % 2 === 0
              ? -1
              : 1
            : 0;
        const drawX = Math.round(obj.x - drawW / 2 + shakeOffsetX);
        const drawY = Math.round(obj.y - drawH);

        drawables.push({
          sortY: obj.y,
          drawShadow: shadowSpec
            ? () => this.drawPixelShadow(ctx, obj.x + shakeOffsetX, obj.y, shadowSpec)
            : undefined,
          draw: () => {
            ctx.drawImage(
              natureImg,
              spec.x,
              spec.y,
              spec.w,
              spec.h,
              drawX,
              drawY,
              drawW,
              drawH,
            );
          },
        });
      }
    }

    const npcShadowSpec = SPRITE_SHADOW_SPECS.npc;
    for (const npc of this.npcs) {
      const npcImg = sheets?.npcIdleSheets[npc.id];
      const npcManifest = sheets?.npcIdleManifests[npc.id];
      const elapsedMs = this.animClock * 1000 + npc.animOffsetMs;
      drawables.push({
        sortY: npc.y,
        drawShadow: npcShadowSpec
          ? () => this.drawPixelShadow(ctx, npc.x, npc.y, npcShadowSpec)
          : undefined,
        draw: () => {
          if (npcImg && npcManifest) {
            this.drawCharacterIdleSprite(
              ctx,
              npcImg,
              npcManifest,
              npc.x,
              npc.y,
              npc.facing,
              elapsedMs,
            );
          } else {
            ctx.fillStyle = '#E59A28';
            ctx.fillRect(Math.round(npc.x - 16), Math.round(npc.y - 44), 32, 44);
          }
        },
      });
    }

    const playerShadowSpec = SPRITE_SHADOW_SPECS.player;
    drawables.push({
      sortY: this.player.y,
      drawShadow: playerShadowSpec
        ? () => this.drawPixelShadow(ctx, this.player.x, this.player.y, playerShadowSpec)
        : undefined,
      draw: () => {
        const activeAssets = this.activeAction ? this.getActionAssets(this.activeAction.kind) : null;
        if (this.activeAction && activeAssets?.image && activeAssets?.manifest) {
          const actionImg = activeAssets.image;
          const actionManifest = activeAssets.manifest;
          const dirIdx = actionManifest.directions.indexOf(this.player.facing);
          const dirRow = dirIdx >= 0 ? dirIdx : FARMER_DIRECTION_ROW[this.player.facing];
          const frameCol = this.getActiveActionFrame(this.activeAction);
          const frameW = actionManifest.frameWidth;
          const frameH = actionManifest.frameHeight;
          const drawW = frameW * PIXEL_SCALE;
          const drawH = frameH * PIXEL_SCALE;
          const drawX = Math.round(this.player.x - actionManifest.anchor.x * PIXEL_SCALE);
          const drawY = Math.round(this.player.y - actionManifest.anchor.y * PIXEL_SCALE);

          ctx.drawImage(
            actionImg,
            frameCol * frameW,
            dirRow * frameH,
            frameW,
            frameH,
            drawX,
            drawY,
            drawW,
            drawH,
          );
        } else if (!this.player.isMoving && farmerIdleImg && farmerIdleManifest) {
          this.drawCharacterIdleSprite(
            ctx,
            farmerIdleImg,
            farmerIdleManifest,
            this.player.x,
            this.player.y,
            this.player.facing,
            this.idleElapsedMs,
          );
        } else if (farmerImg) {
          const dirRow = FARMER_DIRECTION_ROW[this.player.facing];
          let frameCol = 0;
          if (this.player.isMoving) {
            const step = Math.floor(this.player.animTimer) % 4;
            frameCol = step === 1 ? 1 : step === 3 ? 2 : 0;
          }
          const drawW = FARMER_FRAME_W * PIXEL_SCALE;
          const drawH = FARMER_FRAME_H * PIXEL_SCALE;
          const drawX = Math.round(this.player.x - drawW / 2);
          const drawY = Math.round(this.player.y - drawH + 4);

          ctx.drawImage(
            farmerImg,
            frameCol * FARMER_FRAME_W,
            dirRow * FARMER_FRAME_H,
            FARMER_FRAME_W,
            FARMER_FRAME_H,
            drawX,
            drawY,
            drawW,
            drawH,
          );
        } else {
          const frames = atlas.player[this.player.facing];
          ctx.drawImage(
            frames[0],
            Math.round(this.player.x - 32),
            Math.round(this.player.y - 56),
            64,
            64,
          );
        }

        if (this.player.actionTimer > 0 && this.player.actionTool === 'watering_can') {
          const swingOffset = this.player.actionTimer > 0.11 ? -8 : 6;
          const fx = this.getFacingTile();
          ctx.fillStyle = 'rgba(91, 155, 213, 0.65)';
          ctx.fillRect(
            fx.col * TILE_SIZE + 18,
            fx.row * TILE_SIZE + 22 + swingOffset,
            28,
            16,
          );
        }
      },
    });

    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawables) {
      item.drawShadow?.();
    }
    for (const item of drawables) {
      item.draw();
    }

    // Floating [E] prompt right at nearby interactive object or villager
    if (this.phase === 'PLAYING') {
      const nearbyTarget = this.findClosestInteractiveTarget();
      const promptPos =
        nearbyTarget?.kind === 'npc'
          ? { x: nearbyTarget.npc.x, y: nearbyTarget.npc.y - 102 }
          : nearbyTarget?.kind === 'cooking_station'
            ? {
                x: nearbyTarget.station.x,
                y: nearbyTarget.station.y - nearbyTarget.station.hitbox[1] * PIXEL_SCALE - 10,
              }
            : nearbyTarget?.kind === 'building'
              ? { x: nearbyTarget.building.x, y: nearbyTarget.building.y - 46 }
              : null;
      if (promptPos) {
        const bob = Math.round(Math.sin(this.animClock * 4) * 2);
        const px = Math.round(promptPos.x);
        const py = Math.round(promptPos.y + bob);
        const boxW = 28;
        const boxH = 24;
        const bx = Math.round(px - boxW / 2);
        const by = Math.round(py - boxH / 2);

        ctx.fillStyle = '#231710';
        ctx.fillRect(bx - 2, by - 2, boxW + 4, boxH + 6);
        ctx.fillStyle = '#F4EAD5';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#4A3121';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, boxW - 2, boxH - 2);

        ctx.fillStyle = '#231710';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', px, py + 1);
      }
    }

    if (this.debugOverlay) {
      this.drawDebugWorldBoxes(ctx);
    }

    ctx.restore();

    if (this.phase === 'PLAYING' && this.mouseScreen) {
      const hoverWorldX = this.mouseScreen.x + this.camera.x;
      const hoverWorldY = this.mouseScreen.y + this.camera.y;
      const hoveredStation = this.findCookingStationAtWorldPoint(hoverWorldX, hoverWorldY);
      const camX = Math.round(this.camera.x);
      const camY = Math.round(this.camera.y);

      if (hoveredStation) {
        const stationScreenX = Math.round(hoveredStation.x - camX);
        const stationScreenTopY = Math.round(
          hoveredStation.y - hoveredStation.hitbox[1] * PIXEL_SCALE - camY,
        );
        this.drawWorldHoverTooltip(ctx, vw, stationScreenX, stationScreenTopY, 'Cook', false);
      } else if (this.hoverTile) {
        const clickable = this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row);
        if (
          clickable &&
          clickable.row >= FARM_PLOT_BOUNDS.minRow &&
          clickable.row <= FARM_PLOT_BOUNDS.maxRow &&
          clickable.col >= FARM_PLOT_BOUNDS.minCol &&
          clickable.col <= FARM_PLOT_BOUNDS.maxCol
        ) {
          const actionHint = this.getTileActionHint(clickable.col, clickable.row);
          if (actionHint) {
            const tileScreenCenterX = Math.round(clickable.col * TILE_SIZE + TILE_SIZE / 2 - camX);
            const tileScreenTopY = Math.round(clickable.row * TILE_SIZE - camY);
            this.drawWorldHoverTooltip(
              ctx,
              vw,
              tileScreenCenterX,
              tileScreenTopY,
              actionHint,
              actionHint === 'Plant (too late)',
            );
          }
        }
      }
    }

    if (this.timeMinutes >= 18 * 60) {
      const progress = Math.min(1, (this.timeMinutes - 18 * 60) / (6 * 60));
      const alpha = progress * 0.34;
      ctx.fillStyle = `rgba(22, 24, 58, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);
    }

    if (this.debugOverlay) {
      this.drawDebugHudText(ctx);
    }
  }

  private drawDebugWorldBoxes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (this.terrain[r][c] === 'water' || isSolidStructure(this.structures[r][c])) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.strokeStyle = '#60A5FA';
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(c * TILE_SIZE + 1, r * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (this.structures[r][c] === 'banner') {
          const rect = getBannerCollisionRect(c, r, this.bannerRestored);
          if (rect) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.strokeStyle = '#F59E0B';
            ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
            ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
          }
        }
      }
    }

    for (const bld of this.buildingObjects) {
      const rect = getBuildingCollisionRect(bld);
      if (!rect) continue;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#EF4444';
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    }

    for (const station of COOKING_STATIONS) {
      const rect = getCookingStationCollisionRect(station);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
      ctx.strokeStyle = '#F97316';
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    }

    for (const obj of this.worldObjects) {
      const rect = getObjectCollisionRect(obj);
      if (!rect) continue;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.strokeStyle = '#FACC15';
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    }

    for (const npc of this.npcs) {
      const rect = getNpcCollisionRect(npc);
      if (!rect) continue;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.strokeStyle = '#C084FC';
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
    }

    const pLeft = this.player.x - PLAYER_HALF_W;
    const pTop = this.player.y - PLAYER_HALF_H;
    const pW = PLAYER_HALF_W * 2;
    const pH = PLAYER_HALF_H * 2;
    const overlapping = this.collidesAt(this.player.x, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H);
    ctx.fillStyle = overlapping ? 'rgba(244, 63, 94, 0.4)' : 'rgba(34, 197, 94, 0.35)';
    ctx.strokeStyle = overlapping ? '#F43F5E' : '#22C55E';
    ctx.fillRect(pLeft, pTop, pW, pH);
    ctx.strokeRect(pLeft, pTop, pW, pH);
    ctx.restore();
  }

  private drawDebugHudText(ctx: CanvasRenderingContext2D): void {
    const stateLabel = this.activeAction
      ? 'action lock'
      : this.player.isMoving
        ? 'walking'
        : 'idle';
    const actionLabel = this.activeAction ? this.activeAction.kind : 'none';
    const timerLabel = this.activeAction
      ? `${Math.round(this.activeAction.elapsedMs)}/${this.activeAction.lockTimeoutMs} ms`
      : '0 ms';
    const overlapping = this.collidesAt(this.player.x, this.player.y, PLAYER_HALF_W, PLAYER_HALF_H);
    const lines = [
      `[F3 DEBUG] state: ${stateLabel} | action: ${actionLabel}`,
      `lock timer: ${timerLabel} | facing: ${this.player.facing}`,
      `feet box: (${Math.round(this.player.x - PLAYER_HALF_W)}, ${Math.round(this.player.y - PLAYER_HALF_H)}) ${PLAYER_HALF_W * 2}x${PLAYER_HALF_H * 2} | overlap: ${overlapping}`,
    ];

    ctx.save();
    ctx.font = '12px "JetBrains Mono", monospace';
    const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const pad = 8;
    const lineH = 16;
    const boxW = Math.ceil(maxW) + pad * 2;
    const boxH = lines.length * lineH + pad * 2;

    ctx.fillStyle = 'rgba(18, 13, 10, 0.84)';
    ctx.fillRect(12, 12, boxW, boxH);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, boxW, boxH);

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 12 + pad, 12 + pad + i * lineH);
    }
    ctx.restore();
  }

  private drawPixelShadow(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    shadowSize: readonly [number, number],
  ): void {
    const srcW = Math.max(4, shadowSize[0]);
    const srcH = Math.max(2, shadowSize[1]);
    const rx = srcW / 2;
    const ry = srcH / 2;
    const cx = Math.round(anchorX);
    const cy = Math.round(anchorY);
    const topSrc = Math.floor(-ry);
    const botSrc = Math.ceil(ry) - 1;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let sy = topSrc; sy <= botSrc; sy++) {
      const ny = (sy + 0.5) / ry;
      if (Math.abs(ny) >= 1) continue;
      const halfWidthSrc = Math.round(rx * Math.sqrt(1 - ny * ny));
      if (halfWidthSrc <= 0) continue;
      const rectX = cx - halfWidthSrc * PIXEL_SCALE;
      const rectY = cy + sy * PIXEL_SCALE;
      ctx.fillRect(rectX, rectY, halfWidthSrc * 2 * PIXEL_SCALE, PIXEL_SCALE);
    }
  }

  private drawRipeSparkle(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    frame: number,
  ): void {
    const p = PIXEL_SCALE;
    const sx = frame === 0 ? tileX + 44 : tileX + 14;
    const sy = frame === 0 ? tileY + 4 : tileY + 6;
    const dotX = frame === 0 ? tileX + 14 : tileX + 46;
    const dotY = frame === 0 ? tileY + 10 : tileY + 8;

    // 4-point white & gold pixel star
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(sx, sy - p, p, p);
    ctx.fillRect(sx, sy + p, p, p);
    ctx.fillRect(sx - p, sy, p, p);
    ctx.fillRect(sx + p, sy, p, p);
    ctx.fillStyle = '#F7D259';
    ctx.fillRect(sx, sy, p, p);

    // Secondary gold glint pixel
    ctx.fillStyle = frame === 0 ? '#F7D259' : '#FFFDF5';
    ctx.fillRect(dotX, dotY, p, p);
  }

  private drawResourceCursor(
    ctx: CanvasRenderingContext2D,
    obj: WorldObject,
    color: string,
  ): void {
    const rect = getObjectCollisionRect(obj);
    if (!rect) return;
    const x = Math.round(rect.left);
    const y = Math.round(rect.top);
    const w = Math.round(rect.right - rect.left);
    const h = Math.round(rect.bottom - rect.top);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, Math.max(4, w - 4), Math.max(4, h - 4));
  }

  private drawCookingStationPlaceholder(
    ctx: CanvasRenderingContext2D,
    drawX: number,
    drawY: number,
    drawW: number,
    drawH: number,
  ): void {
    const p = PIXEL_SCALE;
    // Outer outline box matching pixel prop placeholder style
    ctx.fillStyle = '#231710';
    ctx.fillRect(drawX, drawY, drawW, drawH);

    // Chimney / hood top
    ctx.fillStyle = '#4A433D';
    ctx.fillRect(drawX + p * 3, drawY + p, drawW - p * 6, p * 4);
    ctx.fillStyle = '#6A6159';
    ctx.fillRect(drawX + p * 4, drawY + p * 2, drawW - p * 8, p * 2);

    // Main cast-iron stove body
    ctx.fillStyle = '#6B5E54';
    ctx.fillRect(drawX + p, drawY + p * 5, drawW - p * 2, drawH - p * 6);

    // Stovetop deck & burners
    ctx.fillStyle = '#3B342E';
    ctx.fillRect(drawX + p, drawY + p * 5, drawW - p * 2, p * 4);
    ctx.fillStyle = '#231710';
    ctx.fillRect(drawX + p * 3, drawY + p * 6, p * 4, p * 2);
    ctx.fillRect(drawX + drawW - p * 7, drawY + p * 6, p * 4, p * 2);

    // Glowing fire door window
    const emberW = drawW - p * 6;
    const emberH = p * 7;
    const emberX = drawX + p * 3;
    const emberY = drawY + drawH - p * 11;
    ctx.fillStyle = '#231710';
    ctx.fillRect(emberX - p, emberY - p, emberW + p * 2, emberH + p * 2);
    ctx.fillStyle = '#C94A38';
    ctx.fillRect(emberX, emberY, emberW, emberH);
    ctx.fillStyle = '#E59A28';
    ctx.fillRect(emberX + p * 2, emberY + p * 2, emberW - p * 4, emberH - p * 3);
  }

  private drawWorldHoverTooltip(
    ctx: CanvasRenderingContext2D,
    vw: number,
    screenCenterX: number,
    screenTopY: number,
    text: string,
    isWarning: boolean,
  ): void {
    ctx.save();
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const padX = 8;
    const boxW = textWidth + padX * 2;
    const boxH = 22;
    const bx = Math.max(4, Math.min(vw - boxW - 4, Math.round(screenCenterX - boxW / 2)));
    const by = Math.max(4, screenTopY - boxH - 6);

    ctx.fillStyle = isWarning ? '#7A2318' : '#231710';
    ctx.fillRect(bx - 2, by - 2, boxW + 4, boxH + 4);
    ctx.fillStyle = isWarning ? '#FEF3C7' : '#F4EAD5';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = isWarning ? '#C94A38' : '#4A3121';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = isWarning ? '#991B1B' : '#231710';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(bx + boxW / 2), Math.round(by + boxH / 2) + 1);
    ctx.restore();
  }

  private drawTileCursor(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    color: string,
  ): void {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }
}
