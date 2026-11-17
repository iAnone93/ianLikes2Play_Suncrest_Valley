import {
  BANNER_GOAL_GOLD,
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
  PLAYER_SPEED_PX_PER_SEC,
  QUICK_BAR_SIZE,
  REAL_SECONDS_PER_GAME_MINUTE,
  SEED_TO_CROP,
  TILE_SIZE,
  WATER_STAMINA_COST,
  WATERING_CAN_MAX,
  formatClock,
} from './constants';
import { buildHomesteadMap, isSolidTile, tileKey } from './map';
import { getSpriteAtlas, type SpriteAtlas } from './pixelSprites';
import { createNewGameState, loadAutoSave, writeAutoSave } from './save';
import type {
  CropId,
  DaySummaryData,
  Direction,
  FarmTileState,
  GamePhase,
  HudSnapshot,
  InventorySlot,
  ItemId,
  PlayerState,
  SeedItemId,
  ShippedLineItem,
  Stage1SaveData,
  TileKind,
} from './types';

type HudListener = (snapshot: HudSnapshot) => void;

export class SuncrestEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private atlas: SpriteAtlas | null = null;
  private rafId: number | null = null;
  private lastFrameMs = 0;

  private map: TileKind[][] = buildHomesteadMap();
  private phase: GamePhase = 'TITLE';

  private day = 1;
  private timeMinutes = DAY_START_MINUTES;
  private timeAccumulator = 0;
  private gold = 100;
  private totalEarned = 0;
  private stamina = MAX_STAMINA;
  private bannerRestored = false;
  private bannerCelebrationVisible = false;

  private player: PlayerState = {
    x: 4.5 * TILE_SIZE,
    y: 5.5 * TILE_SIZE,
    facing: 'down',
    animTimer: 0,
    isMoving: false,
    actionTimer: 0,
    actionTool: null,
  };

  private quickBar: (InventorySlot | null)[] = Array.from({ length: QUICK_BAR_SIZE }, () => null);
  private selectedSlot = 0;
  private farmTiles: Record<string, FarmTileState> = {};
  private shippingBin: Partial<Record<CropId, number>> = {};
  private daySummary: DaySummaryData | null = null;

  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private hoverTile: { col: number; row: number } | null = null;
  private mouseScreen: { x: number; y: number } | null = null;
  private camera = { x: 0, y: 0 };
  private waterAnimTimer = 0;

  private toastMessage: string | null = null;
  private toastTimer = 0;
  private lastPrompt: string | null = null;
  private lastMinuteSnapshot = Math.floor(DAY_START_MINUTES);

  private listeners = new Set<HudListener>();

  // Bound event listeners
  private onKeyDownBound = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUpBound = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onBlurBound = () => this.clearInputs();
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
      shippingCount += qty;
      shippingValue += qty * CROPS[id as CropId].sellPrice;
    }

    return {
      phase: this.phase,
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
      bannerCelebrationVisible: this.bannerCelebrationVisible,
      daySummary: this.daySummary,
    };
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = getSpriteAtlas();

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
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
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
      this.canvas.removeEventListener('mouseleave', this.onMouseLeaveBound);
      this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
      this.canvas.removeEventListener('wheel', this.onWheelBound);
    }
    this.canvas = null;
    this.ctx = null;
    this.clearInputs();
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
    } else if (this.phase === 'SHOP' || this.phase === 'SLEEP_CONFIRM') {
      this.phase = 'PLAYING';
      this.emitHud();
    }
  }

  public closeModal(): void {
    if (this.phase === 'SHOP' || this.phase === 'SLEEP_CONFIRM' || this.phase === 'PAUSED') {
      this.phase = 'PLAYING';
      this.emitHud();
    }
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
    } else {
      this.showToast(`Good morning! Day ${this.day} begins.`);
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

  private applyState(data: Stage1SaveData, nextPhase: GamePhase): void {
    this.day = data.day;
    this.timeMinutes = data.timeMinutes;
    this.timeAccumulator = 0;
    this.gold = data.gold;
    this.totalEarned = data.totalEarned;
    this.stamina = data.stamina;
    this.bannerRestored = data.bannerRestored;
    this.bannerCelebrationVisible = false;
    this.player = {
      x: data.player.x,
      y: data.player.y,
      facing: data.player.facing,
      animTimer: 0,
      isMoving: false,
      actionTimer: 0,
      actionTool: null,
    };
    this.quickBar = data.quickBar.map((s) => (s ? { ...s } : null));
    this.selectedSlot = data.selectedSlot;
    this.farmTiles = JSON.parse(JSON.stringify(data.farmTiles)) as Record<string, FarmTileState>;
    this.shippingBin = { ...data.shippingBin };
    this.daySummary = null;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.lastMinuteSnapshot = Math.floor(this.timeMinutes);
    this.phase = nextPhase;
    this.clearInputs();
  }

  private exportSaveData(): Stage1SaveData {
    return {
      saveVersion: 1,
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

    if (code === 'Escape') {
      if (this.phase === 'PLAYING' || this.phase === 'PAUSED' || this.phase === 'SHOP' || this.phase === 'SLEEP_CONFIRM') {
        this.togglePause();
      }
      return;
    }

    if (this.phase === 'PLAYING') {
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
    if (this.phase !== 'PLAYING') return;
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
    if (e.button !== 0 || this.phase !== 'PLAYING' || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreen = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.updateHoverTile();
    if (this.hoverTile) {
      const target = this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row);
      if (target) {
        this.faceTowardTile(target.col, target.row);
        this.interactWithTile(target.col, target.row);
      } else {
        // Fallback: act on tile directly in front of player
        const front = this.getFacingTile();
        this.interactWithTile(front.col, front.row);
      }
    }
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

  private faceTowardTile(col: number, row: number): void {
    const dx = (col + 0.5) * TILE_SIZE - this.player.x;
    const dy = (row + 0.5) * TILE_SIZE - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.facing = dx >= 0 ? 'right' : 'left';
    } else {
      this.player.facing = dy >= 0 ? 'down' : 'up';
    }
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
    this.waterAnimTimer += dt;

    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer === 0) {
        this.toastMessage = null;
        this.emitHud();
      }
    }

    if (this.phase !== 'PLAYING') {
      this.justPressedKeys.clear();
      return;
    }

    // Action swing animation cooldown
    if (this.player.actionTimer > 0) {
      this.player.actionTimer = Math.max(0, this.player.actionTimer - dt);
      if (this.player.actionTimer === 0) {
        this.player.actionTool = null;
      }
    }

    // Movement input
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
    } else {
      this.player.isMoving = false;
      this.player.animTimer = 0;
    }

    // Edge-triggered action
    if (this.justPressedKeys.has('Space') || this.justPressedKeys.has('KeyE')) {
      const target = this.getFacingTile();
      this.interactWithTile(target.col, target.row);
    }

    // Time progression: 1 game minute per real second
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
    const halfW = 13;
    const halfH = 10;

    // X axis
    const nextX = this.player.x + dx;
    if (!this.collidesAt(nextX, this.player.y, halfW, halfH)) {
      this.player.x = nextX;
    }

    // Y axis
    const nextY = this.player.y + dy;
    if (!this.collidesAt(this.player.x, nextY, halfW, halfH)) {
      this.player.y = nextY;
    }
  }

  private collidesAt(cx: number, cy: number, halfW: number, halfH: number): boolean {
    const left = Math.floor((cx - halfW) / TILE_SIZE);
    const right = Math.floor((cx + halfW) / TILE_SIZE);
    const top = Math.floor((cy - halfH) / TILE_SIZE);
    const bottom = Math.floor((cy + halfH) / TILE_SIZE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
        if (isSolidTile(this.map[r][c])) return true;
      }
    }
    return false;
  }

  private interactWithTile(col: number, row: number): void {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    const kind = this.map[row][col];
    const slot = this.quickBar[this.selectedSlot];

    // Interactive buildings first
    if (kind === 'bed_door' || kind === 'house') {
      if (kind === 'bed_door' || (row === 3 && col >= 3 && col <= 5)) {
        this.clearInputs();
        this.phase = 'SLEEP_CONFIRM';
        this.emitHud();
        return;
      }
    }

    if (kind === 'shop') {
      this.clearInputs();
      this.phase = 'SHOP';
      this.emitHud();
      return;
    }

    if (kind === 'banner') {
      if (this.bannerRestored) {
        this.showToast('Suncrest Homestead Banner — Restored!');
      } else {
        this.showToast(
          `Homestead Banner: ${this.totalEarned}G / ${BANNER_GOAL_GOLD}G total earned`,
        );
      }
      return;
    }

    if (kind === 'bin') {
      if (slot && ITEMS[slot.itemId].category === 'crop') {
        const cropId = slot.itemId as CropId;
        this.shippingBin[cropId] = (this.shippingBin[cropId] ?? 0) + 1;
        this.consumeSlot(this.selectedSlot, 1);
        this.showToast(
          `Shipped ${CROPS[cropId].name} (+${CROPS[cropId].sellPrice}G at midnight)`,
        );
        this.emitHud();
      } else {
        const snap = this.getHudSnapshot();
        if (snap.shippingCount > 0) {
          this.showToast(
            `Shipping Bin: ${snap.shippingCount} crop(s) worth ${snap.shippingValue}G tonight`,
          );
        } else {
          this.showToast('Hold a harvested crop and interact here to ship it.');
        }
      }
      return;
    }

    if (kind === 'well' || kind === 'water') {
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

    // Farm Plot interactions
    if (kind === 'farm_plot') {
      const key = tileKey(col, row);
      const tileState = this.farmTiles[key];

      // 1. Always prioritize harvesting mature crops (0 stamina)
      if (tileState?.crop) {
        const def = CROPS[tileState.crop.id];
        if (tileState.crop.daysGrown >= def.growDays) {
          if (!this.canAddItem(def.id, 1)) {
            this.showToast('Quick bar is full! Ship crops at the Bin first.');
            return;
          }
          this.addItemToQuickBar(def.id, 1);
          tileState.crop = null;
          this.showToast(`Harvested ${def.name}!`);
          this.emitHud();
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

      // 2. Hoe -> Till soil
      if (slot.itemId === 'hoe') {
        if (tileState?.tilled) {
          this.showToast('Soil is already tilled.');
          return;
        }
        if (this.stamina < HOE_STAMINA_COST) {
          this.showToast('Too tired');
          return;
        }
        this.stamina -= HOE_STAMINA_COST;
        this.farmTiles[key] = {
          tilled: true,
          watered: false,
          crop: null,
        };
        this.triggerActionAnim('hoe');
        this.emitHud();
        return;
      }

      // 3. Watering Can -> Water soil
      if (slot.itemId === 'watering_can') {
        if (!tileState?.tilled) {
          this.showToast('Till the soil with your Hoe [1] first.');
          return;
        }
        if (tileState.watered) {
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
        this.stamina -= WATER_STAMINA_COST;
        slot.waterLevel = water - 1;
        tileState.watered = true;
        if (tileState.crop) {
          tileState.crop.wateredToday = true;
        }
        this.triggerActionAnim('watering_can');
        this.emitHud();
        return;
      }

      // 4. Seeds -> Plant (0 stamina)
      if (ITEMS[slot.itemId].category === 'seed') {
        if (!tileState?.tilled) {
          this.showToast('Till soil with your Hoe [1] before planting.');
          return;
        }
        if (tileState.crop) {
          this.showToast('A crop is already growing here.');
          return;
        }
        const seedId = slot.itemId as SeedItemId;
        const cropId = SEED_TO_CROP[seedId];
        tileState.crop = {
          id: cropId,
          daysGrown: 0,
          wateredToday: tileState.watered,
        };
        this.consumeSlot(this.selectedSlot, 1);
        this.showToast(`Planted ${CROPS[cropId].name} seeds`);
        this.emitHud();
        return;
      }
    }
  }

  private triggerActionAnim(tool: ItemId): void {
    this.player.actionTimer = 0.22;
    this.player.actionTool = tool;
  }

  private canAddItem(itemId: ItemId, count: number): boolean {
    if (ITEMS[itemId].category === 'tool') return false;
    const existing = this.quickBar.some((s) => s?.itemId === itemId);
    if (existing) return true;
    const empty = this.quickBar.some((s) => s === null);
    return empty && count > 0;
  }

  private addItemToQuickBar(itemId: ItemId, count: number): void {
    for (let i = 0; i < QUICK_BAR_SIZE; i++) {
      const slot = this.quickBar[i];
      if (slot && slot.itemId === itemId) {
        slot.count += count;
        return;
      }
    }
    for (let i = 0; i < QUICK_BAR_SIZE; i++) {
      if (this.quickBar[i] === null) {
        this.quickBar[i] = { itemId, count };
        return;
      }
    }
  }

  private consumeSlot(index: number, amount: number): void {
    const slot = this.quickBar[index];
    if (!slot) return;
    slot.count -= amount;
    if (slot.count <= 0) {
      this.quickBar[index] = null;
    }
  }

  private endDay(passedOut: boolean): void {
    this.clearInputs();

    // 1. Settle Shipping Bin earnings
    const shippedItems: ShippedLineItem[] = [];
    let earningsToday = 0;
    for (const cropId of Object.keys(CROPS) as CropId[]) {
      const count = this.shippingBin[cropId] ?? 0;
      if (count <= 0) continue;
      const def = CROPS[cropId];
      const subtotal = count * def.sellPrice;
      shippedItems.push({
        cropId,
        name: def.name,
        count,
        unitPrice: def.sellPrice,
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

    // 2. Grow watered crops & reset daily moisture
    for (const key of Object.keys(this.farmTiles)) {
      const tile = this.farmTiles[key];
      if (tile.crop) {
        if (tile.crop.wateredToday) {
          const maxDays = CROPS[tile.crop.id].growDays;
          tile.crop.daysGrown = Math.min(maxDays, tile.crop.daysGrown + 1);
        }
        tile.crop.wateredToday = false;
      }
      tile.watered = false;
    }

    const dayCompleted = this.day;
    // After Day 10, Spring repeats smoothly in Stage 1
    this.day += 1;
    this.timeMinutes = DAY_START_MINUTES;
    this.timeAccumulator = 0;
    this.stamina = passedOut
      ? Math.round(MAX_STAMINA * PASS_OUT_STAMINA_RATIO)
      : MAX_STAMINA;

    // Reset player onto farmhouse porch for the new morning
    this.player.x = 4.5 * TILE_SIZE;
    this.player.y = 4.6 * TILE_SIZE;
    this.player.facing = 'down';

    // 3. Auto-save at morning start
    writeAutoSave(this.exportSaveData());

    this.daySummary = {
      dayCompleted,
      passedOut,
      shippedItems,
      earningsToday,
      newGold: this.gold,
      totalEarned: this.totalEarned,
      bannerJustRestored,
    };

    this.phase = 'DAY_SUMMARY';
    this.emitHud();
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastTimer = 2.8;
    this.emitHud();
  }

  private computeTargetPrompt(): string | null {
    if (this.phase !== 'PLAYING') return null;
    const target = this.getFacingTile();
    if (target.col < 0 || target.col >= MAP_COLS || target.row < 0 || target.row >= MAP_ROWS) {
      return null;
    }
    const kind = this.map[target.row][target.col];
    const slot = this.quickBar[this.selectedSlot];

    if (kind === 'bed_door') return 'Farmhouse Door · Sleep for the night [Space / Click]';
    if (kind === 'shop') return 'Seed Shop Stall · Buy Spring Seeds [Space / Click]';
    if (kind === 'banner') {
      return this.bannerRestored
        ? 'Suncrest Homestead Banner (Restored!)'
        : `Homestead Banner · ${this.totalEarned} / ${BANNER_GOAL_GOLD}G earned [Space / Click]`;
    }
    if (kind === 'bin') {
      if (slot && ITEMS[slot.itemId].category === 'crop') {
        const def = CROPS[slot.itemId as CropId];
        return `Shipping Bin · Ship ${def.name} (${def.sellPrice}G) [Space / Click]`;
      }
      return 'Shipping Bin · Hold a crop to ship [Space / Click]';
    }
    if (kind === 'well' || kind === 'water') {
      if (slot?.itemId === 'watering_can') {
        return `Water Well · Refill Watering Can (${slot.waterLevel ?? 0}/${WATERING_CAN_MAX}) [Space / Click]`;
      }
      return 'Water Source · Equip Watering Can [2] to refill';
    }
    if (kind === 'farm_plot') {
      const tile = this.farmTiles[tileKey(target.col, target.row)];
      if (tile?.crop) {
        const def = CROPS[tile.crop.id];
        if (tile.crop.daysGrown >= def.growDays) {
          return `Ripe ${def.name} · Harvest [Space / Click]`;
        }
      }
    }
    return null;
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const atlas = this.atlas;
    if (!ctx || !canvas || !atlas) return;

    this.resizeCanvas();
    ctx.imageSmoothingEnabled = false;

    const vw = canvas.width;
    const vh = canvas.height;
    const worldW = MAP_COLS * TILE_SIZE;
    const worldH = MAP_ROWS * TILE_SIZE;

    // Camera follows player cleanly, centered if viewport exceeds map
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

    ctx.fillStyle = '#1D3319';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(Math.round(-this.camera.x), Math.round(-this.camera.y));

    const waterFrame = Math.floor(this.waterAnimTimer * 2) % 2;

    // Pass 1: Ground terrain & farm soil
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const kind = this.map[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Base grass under almost everything
        const grassVar = (c * 7 + r * 13) % 3;
        ctx.drawImage(atlas.grass[grassVar], x, y, TILE_SIZE, TILE_SIZE);

        if (kind === 'dirt_path') {
          ctx.drawImage(atlas.dirtPath, x, y, TILE_SIZE, TILE_SIZE);
        } else if (kind === 'water') {
          ctx.drawImage(atlas.water[waterFrame], x, y, TILE_SIZE, TILE_SIZE);
        } else if (kind === 'fence') {
          ctx.drawImage(atlas.fence, x, y, TILE_SIZE, TILE_SIZE);
        } else if (kind === 'farm_plot') {
          const state = this.farmTiles[tileKey(c, r)];
          if (!state || !state.tilled) {
            ctx.drawImage(atlas.farmUntilled, x, y, TILE_SIZE, TILE_SIZE);
          } else if (state.watered) {
            ctx.drawImage(atlas.soilWatered, x, y, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.drawImage(atlas.soilTilled, x, y, TILE_SIZE, TILE_SIZE);
          }

          if (state?.crop) {
            const def = CROPS[state.crop.id];
            const progress = state.crop.daysGrown / def.growDays;
            let stage = 0;
            if (state.crop.daysGrown >= def.growDays) stage = 3;
            else if (progress >= 0.5) stage = 2;
            else if (state.crop.daysGrown >= 1 || state.crop.wateredToday) stage = 1;

            ctx.drawImage(atlas.crops[state.crop.id][stage], x, y, TILE_SIZE, TILE_SIZE);

            // Subtle ripe harvest sparkle indicator
            if (stage === 3 && Math.floor(this.waterAnimTimer * 3 + c + r) % 3 === 0) {
              ctx.fillStyle = '#FFF5B8';
              ctx.fillRect(x + 36, y + 6, 4, 4);
            }
          }
        }
      }
    }

    // Pass 2: Target / Hover tile highlight when playing
    if (this.phase === 'PLAYING') {
      const facingTile = this.getFacingTile();
      this.drawTileCursor(ctx, facingTile.col, facingTile.row, 'rgba(244, 234, 213, 0.55)');

      if (this.hoverTile) {
        const clickable = this.resolveClickTarget(this.hoverTile.col, this.hoverTile.row);
        if (clickable) {
          this.drawTileCursor(ctx, clickable.col, clickable.row, 'rgba(229, 154, 40, 0.9)');
        }
      }
    }

    // Pass 3: Y-sorted vertical props, buildings, trees & player
    interface Drawable {
      sortY: number;
      draw: () => void;
    }
    const drawables: Drawable[] = [];

    // Farmhouse (cols 3..5, rows 2..3)
    drawables.push({
      sortY: 4 * TILE_SIZE,
      draw: () => {
        ctx.drawImage(
          atlas.farmhouse,
          3 * TILE_SIZE,
          2 * TILE_SIZE - 18,
          3 * TILE_SIZE,
          38 * 3,
        );
      },
    });

    // Seed Shop Stall (cols 15..17, rows 3..4)
    drawables.push({
      sortY: 5 * TILE_SIZE,
      draw: () => {
        ctx.drawImage(
          atlas.shop,
          15 * TILE_SIZE,
          3 * TILE_SIZE - 12,
          3 * TILE_SIZE,
          36 * 3,
        );
      },
    });

    // Single-tile props: trees, bin, well, banner
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const kind = this.map[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (kind === 'tree') {
          drawables.push({
            sortY: (r + 1) * TILE_SIZE,
            draw: () => {
              ctx.drawImage(atlas.tree, x - 6, y - 30, 20 * 3, 26 * 3);
            },
          });
        } else if (kind === 'bin') {
          drawables.push({
            sortY: (r + 1) * TILE_SIZE,
            draw: () => {
              ctx.drawImage(atlas.bin, x, y - 6, 16 * 3, 18 * 3);
            },
          });
        } else if (kind === 'well') {
          drawables.push({
            sortY: (r + 1) * TILE_SIZE,
            draw: () => {
              ctx.drawImage(atlas.well, x, y - 18, 16 * 3, 22 * 3);
            },
          });
        } else if (kind === 'banner') {
          drawables.push({
            sortY: (r + 1) * TILE_SIZE,
            draw: () => {
              const sprite = this.bannerRestored ? atlas.bannerRestored : atlas.bannerUnrestored;
              ctx.drawImage(sprite, x, y - 30, 16 * 3, 26 * 3);
            },
          });
        }
      }
    }

    // Player character
    drawables.push({
      sortY: this.player.y + 10,
      draw: () => {
        const frames = atlas.player[this.player.facing];
        let frameIdx = 0;
        if (this.player.isMoving) {
          frameIdx = Math.floor(this.player.animTimer) % 2 === 0 ? 1 : 2;
        }
        // Soft pixel shadow under boots
        ctx.fillStyle = 'rgba(20, 28, 14, 0.32)';
        ctx.fillRect(Math.round(this.player.x - 14), Math.round(this.player.y + 2), 28, 8);

        const drawX = Math.round(this.player.x - 24);
        const drawY = Math.round(this.player.y - 40);
        ctx.drawImage(frames[frameIdx], drawX, drawY, 48, 48);

        // Quick tool swing indicator
        if (this.player.actionTimer > 0 && this.player.actionTool) {
          const swingOffset = this.player.actionTimer > 0.11 ? -6 : 4;
          const fx = this.getFacingTile();
          ctx.fillStyle =
            this.player.actionTool === 'watering_can'
              ? 'rgba(91, 155, 213, 0.65)'
              : 'rgba(229, 180, 84, 0.7)';
          ctx.fillRect(
            fx.col * TILE_SIZE + 14,
            fx.row * TILE_SIZE + 16 + swingOffset,
            20,
            12,
          );
        }
      },
    });

    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawables) {
      item.draw();
    }

    ctx.restore();

    // Subtle warm golden-hour / dusk tint as evening deepens (18:00 -> 24:00)
    if (this.timeMinutes >= 18 * 60) {
      const progress = Math.min(1, (this.timeMinutes - 18 * 60) / (6 * 60));
      const alpha = progress * 0.34;
      ctx.fillStyle = `rgba(22, 24, 58, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
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
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }
}
