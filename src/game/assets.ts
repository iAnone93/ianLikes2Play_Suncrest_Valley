import { COOKING_STATIONS, COOKING_STATION_TYPES } from './cooking';
import { FARMER_PORTRAIT_CONFIG, NPC_LIST } from './npcs';
import type {
  BuildingObjectType,
  CookingStationType,
  Direction,
  DirtInteriorKey,
  DishItemId,
  GrassVariantKey,
  ItemId,
  NatureObjectType,
  NpcId,
} from './types';

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnchoredSpriteRect extends SpriteRect {
  anchor?: 'bottom-center';
}

export type AutotileSetName = 'water' | 'dirt' | 'soil_dry' | 'soil_wet';

export interface TerrainV2Manifest {
  tileSize: number;
  sheet: string;
  grass: Record<GrassVariantKey, SpriteRect>;
  dirtVariants: Record<Exclude<DirtInteriorKey, '255'>, SpriteRect>;
  autotile: Record<AutotileSetName, Record<string, SpriteRect>>;
}

export interface CropsManifest {
  tileSize: number;
  sheet: string;
  cellWidth: number;
  cellHeight: number;
  drawOffsetY: number;
  sprites: Record<string, AnchoredSpriteRect>;
}

export interface FarmerActionManifest {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  directions: Direction[];
  frames: number;
  hitFrame?: number;
  frameDurationMs: number[];
  effectOnFrame?: number;
}

export interface FarmerIdleManifest {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  directions: Direction[];
  frames: number;
  frameDurationMs: number[];
  loop: boolean;
}

export interface PortraitManifest {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  expressions: string[];
  anchor?: 'bottom-center';
  note?: string;
}

export const FARMER_PORTRAIT_ASSETS = {
  sheetPath: FARMER_PORTRAIT_CONFIG.sheetPath,
  manifestPath: FARMER_PORTRAIT_CONFIG.manifestPath,
  expressions: {
    neutral: '/assets/aistudio/farmer_neutral_96_4b4c6f1d.png',
    happy: '/assets/aistudio/farmer_happy_96_f01ff540.png',
    surprised: '/assets/aistudio/farmer_surprised_96_7fae2846.png',
  },
} as const;

export function getPortraitFrameIndex(
  manifest: PortraitManifest | null | undefined,
  expression?: string,
): number {
  if (!manifest || !Array.isArray(manifest.expressions) || manifest.expressions.length === 0) {
    return 0;
  }
  if (!expression) return 0;
  const idx = manifest.expressions.indexOf(expression);
  return idx >= 0 ? idx : 0;
}

export type IconName =
  | 'hoe'
  | 'watering_can'
  | 'axe'
  | 'pickaxe'
  | 'seeds_turnip'
  | 'seeds_potato'
  | 'seeds_strawberry'
  | 'crop_turnip'
  | 'crop_potato'
  | 'crop_strawberry'
  | 'wood'
  | 'stone'
  | DishItemId;

export interface IconsManifest {
  tileSize: number;
  sheet: string;
  sprites: Record<string, SpriteRect>;
}

export interface CookingStationManifest {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  frames: string[];
  anchor: { x: number; y: number };
  note?: string;
}

export interface BuildingManifestEntry extends SpriteRect {
  anchor: 'bottom-center';
  collision: [number, number] | null;
  interaction?: string;
}

export interface BuildingsManifest {
  sheet: string;
  sprites: Record<BuildingObjectType, BuildingManifestEntry>;
}

export const ITEM_TO_ICON_NAME: Record<ItemId, IconName> = {
  hoe: 'hoe',
  watering_can: 'watering_can',
  axe: 'axe',
  pickaxe: 'pickaxe',
  turnip_seed: 'seeds_turnip',
  potato_seed: 'seeds_potato',
  strawberry_seed: 'seeds_strawberry',
  turnip: 'crop_turnip',
  potato: 'crop_potato',
  strawberry: 'crop_strawberry',
  wood: 'wood',
  stone: 'stone',
  boiled_turnip: 'boiled_turnip',
  roasted_potato: 'roasted_potato',
  strawberry_jam: 'strawberry_jam',
  veggie_stew: 'veggie_stew',
};

export interface NatureObjectSpec extends SpriteRect {
  anchor: 'bottom-center';
  collision: [number, number] | null;
  maxHealth: number;
  toolHint?: string;
}

export interface BuildingObjectSpec extends SpriteRect {
  anchor: 'bottom-center';
  collision: [number, number] | null;
  interactive?: boolean;
}

export const NATURE_OBJECT_SPECS: Record<NatureObjectType, NatureObjectSpec> = {
  oak_tree: {
    x: 0,
    y: 0,
    w: 59,
    h: 78,
    anchor: 'bottom-center',
    collision: [14, 8],
    maxHealth: 5,
    toolHint: 'Needs the axe',
  },
  pine_tree: {
    x: 61,
    y: 0,
    w: 45,
    h: 79,
    anchor: 'bottom-center',
    collision: [12, 8],
    maxHealth: 5,
    toolHint: 'Needs the axe',
  },
  boulder: {
    x: 108,
    y: 0,
    w: 33,
    h: 28,
    anchor: 'bottom-center',
    collision: [30, 16],
    maxHealth: 6,
    toolHint: 'Needs the pickaxe',
  },
  bush: {
    x: 143,
    y: 0,
    w: 28,
    h: 23,
    anchor: 'bottom-center',
    collision: [24, 10],
    maxHealth: 1,
  },
  stump: {
    x: 173,
    y: 0,
    w: 30,
    h: 23,
    anchor: 'bottom-center',
    collision: [10, 6],
    maxHealth: 3,
    toolHint: 'Needs the axe',
  },
  rock: {
    x: 205,
    y: 0,
    w: 25,
    h: 18,
    anchor: 'bottom-center',
    collision: [22, 10],
    maxHealth: 2,
    toolHint: 'Needs the pickaxe',
  },
  flower_white: {
    x: 0,
    y: 81,
    w: 24,
    h: 22,
    anchor: 'bottom-center',
    collision: null,
    maxHealth: 1,
  },
  flower_yellow: {
    x: 26,
    y: 81,
    w: 24,
    h: 22,
    anchor: 'bottom-center',
    collision: null,
    maxHealth: 1,
  },
  flower_pink: {
    x: 52,
    y: 81,
    w: 24,
    h: 22,
    anchor: 'bottom-center',
    collision: null,
    maxHealth: 1,
  },
};

export const BUILDING_OBJECT_SPECS: Record<BuildingObjectType, BuildingObjectSpec> = {
  farmhouse: {
    x: 0,
    y: 0,
    w: 107,
    h: 95,
    anchor: 'bottom-center',
    collision: [96, 52],
    interactive: true,
  },
  seed_stall: {
    x: 109,
    y: 0,
    w: 62,
    h: 63,
    anchor: 'bottom-center',
    collision: [56, 24],
    interactive: true,
  },
  well: {
    x: 173,
    y: 0,
    w: 42,
    h: 58,
    anchor: 'bottom-center',
    collision: [30, 22],
    interactive: true,
  },
  shipping_bin: {
    x: 217,
    y: 0,
    w: 43,
    h: 35,
    anchor: 'bottom-center',
    collision: [34, 16],
    interactive: true,
  },
  shipping_bin_empty: {
    x: 217,
    y: 58,
    w: 43,
    h: 34,
    anchor: 'bottom-center',
    collision: [34, 16],
    interactive: true,
  },
  signpost: {
    x: 262,
    y: 0,
    w: 30,
    h: 44,
    anchor: 'bottom-center',
    collision: [8, 8],
    interactive: true,
  },
  banner_unrestored: {
    x: 2,
    y: 124,
    w: 28,
    h: 56,
    anchor: 'bottom-center',
    collision: [14, 10],
    interactive: true,
  },
  banner_restored: {
    x: 34,
    y: 124,
    w: 28,
    h: 56,
    anchor: 'bottom-center',
    collision: [14, 10],
    interactive: true,
  },
  gate_closed: {
    x: 0,
    y: 97,
    w: 32,
    h: 24,
    anchor: 'bottom-center',
    collision: [32, 8],
    interactive: true,
  },
  gate_open: {
    x: 34,
    y: 97,
    w: 21,
    h: 24,
    anchor: 'bottom-center',
    collision: null,
    interactive: true,
  },
  fence_h: {
    x: 57,
    y: 97,
    w: 32,
    h: 22,
    anchor: 'bottom-center',
    collision: [32, 8],
  },
  fence_end_left: {
    x: 91,
    y: 97,
    w: 19,
    h: 24,
    anchor: 'bottom-center',
    collision: [18, 8],
  },
  fence_end_right: {
    x: 112,
    y: 97,
    w: 19,
    h: 24,
    anchor: 'bottom-center',
    collision: [18, 8],
  },
  fence_v: {
    x: 133,
    y: 97,
    w: 14,
    h: 25,
    anchor: 'bottom-center',
    collision: [8, 24],
  },
  fence_post: {
    x: 149,
    y: 97,
    w: 9,
    h: 24,
    anchor: 'bottom-center',
    collision: [8, 8],
  },
};

export type ShadowSpec = readonly [number, number] | null;

export const FARMER_FRAME_W = 32;
export const FARMER_FRAME_H = 48;

export const SPRITE_SHADOW_SPECS: Record<
  BuildingObjectType | NatureObjectType | 'player' | 'npc',
  ShadowSpec
> = {
  // Buildings & standing structures
  farmhouse: [86, 27],
  seed_stall: [50, 16],
  well: [34, 11],
  shipping_bin: [34, 11],
  shipping_bin_empty: [34, 11],
  signpost: [24, 8],
  banner_unrestored: [22, 6],
  banner_restored: [22, 6],
  // Fences & gates (no shadow)
  gate_closed: null,
  gate_open: null,
  fence_h: null,
  fence_end_left: null,
  fence_end_right: null,
  fence_v: null,
  fence_post: null,
  // Standing nature objects
  oak_tree: [47, 15],
  pine_tree: [36, 11],
  stump: [22, 6],
  boulder: [26, 8],
  rock: [20, 6],
  // Flat / smaller-than-tile nature objects (no shadow)
  bush: null,
  flower_white: null,
  flower_yellow: null,
  flower_pink: null,
  // Characters
  player: [26, 8],
  npc: [26, 8],
};

export const FARMER_DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

export interface LoadedSpriteSheets {
  terrainV2: HTMLImageElement | null;
  terrainV2Manifest: TerrainV2Manifest | null;
  natureObjects: HTMLImageElement | null;
  buildingsObjects: HTMLImageElement | null;
  buildingsObjectsManifest: BuildingsManifest | null;
  farmer: HTMLImageElement | null;
  farmerIdle: HTMLImageElement | null;
  farmerIdleManifest: FarmerIdleManifest | null;
  farmerHoe: HTMLImageElement | null;
  farmerHoeManifest: FarmerActionManifest | null;
  farmerWater: HTMLImageElement | null;
  farmerWaterManifest: FarmerActionManifest | null;
  farmerHarvest: HTMLImageElement | null;
  farmerHarvestManifest: FarmerActionManifest | null;
  farmerAxe: HTMLImageElement | null;
  farmerAxeManifest: FarmerActionManifest | null;
  farmerPickaxe: HTMLImageElement | null;
  farmerPickaxeManifest: FarmerActionManifest | null;
  farmerPortraits: HTMLImageElement | null;
  farmerPortraitsManifest: PortraitManifest | null;
  farmerPortraitNeutral: HTMLImageElement | null;
  farmerPortraitHappy: HTMLImageElement | null;
  farmerPortraitSurprised: HTMLImageElement | null;
  npcIdleSheets: Partial<Record<NpcId, HTMLImageElement>>;
  npcIdleManifests: Partial<Record<NpcId, FarmerIdleManifest>>;
  npcPortraitSheets: Partial<Record<NpcId, HTMLImageElement>>;
  npcPortraitManifests: Partial<Record<NpcId, PortraitManifest>>;
  crops: HTMLImageElement | null;
  cropsManifest: CropsManifest | null;
  icons: HTMLImageElement | null;
  iconsManifest: IconsManifest | null;
  dishes: HTMLImageElement | null;
  dishesManifest: IconsManifest | null;
  iconUrls: Partial<Record<IconName, string>>;
  cookingStationSprites: Partial<Record<CookingStationType, HTMLImageElement>>;
  cookingStationManifests: Partial<Record<CookingStationType, CookingStationManifest>>;
  ready: boolean;
}

const sheets: LoadedSpriteSheets = {
  terrainV2: null,
  terrainV2Manifest: null,
  natureObjects: null,
  buildingsObjects: null,
  buildingsObjectsManifest: null,
  farmer: null,
  farmerIdle: null,
  farmerIdleManifest: null,
  farmerHoe: null,
  farmerHoeManifest: null,
  farmerWater: null,
  farmerWaterManifest: null,
  farmerHarvest: null,
  farmerHarvestManifest: null,
  farmerAxe: null,
  farmerAxeManifest: null,
  farmerPickaxe: null,
  farmerPickaxeManifest: null,
  farmerPortraits: null,
  farmerPortraitsManifest: null,
  farmerPortraitNeutral: null,
  farmerPortraitHappy: null,
  farmerPortraitSurprised: null,
  npcIdleSheets: {},
  npcIdleManifests: {},
  npcPortraitSheets: {},
  npcPortraitManifests: {},
  crops: null,
  cropsManifest: null,
  icons: null,
  iconsManifest: null,
  dishes: null,
  dishesManifest: null,
  iconUrls: {},
  cookingStationSprites: {},
  cookingStationManifests: {},
  ready: false,
};

let loadingStarted = false;
const readyListeners = new Set<() => void>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadJson<T>(src: string): Promise<T> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load manifest: ${src}`);
  return (await res.json()) as T;
}

function extractSpriteSheetIcons(
  img: HTMLImageElement,
  manifest: IconsManifest,
  urls: Partial<Record<IconName, string>>,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  for (const [name, rect] of Object.entries(manifest.sprites) as [IconName, SpriteRect][]) {
    canvas.width = rect.w;
    canvas.height = rect.h;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, rect.w, rect.h);
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    urls[name] = canvas.toDataURL();
  }
}

function buildIconUrls(
  iconsImg: HTMLImageElement,
  manifest: IconsManifest,
  dishesImg: HTMLImageElement,
  dishesManifest: IconsManifest,
): Partial<Record<IconName, string>> {
  const urls: Partial<Record<IconName, string>> = {};
  if (typeof document === 'undefined') return urls;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return urls;

  extractSpriteSheetIcons(iconsImg, manifest, urls, canvas, ctx);
  extractSpriteSheetIcons(dishesImg, dishesManifest, urls, canvas, ctx);
  return urls;
}

export function getLoadedSpriteSheets(onReady?: () => void): LoadedSpriteSheets {
  if (onReady && !sheets.ready) {
    readyListeners.add(onReady);
  }
  if (!loadingStarted) {
    loadingStarted = true;
    Promise.all([
      loadImage('/assets/aistudio/terrain_v2_597f5903.png'),
      loadJson<TerrainV2Manifest>('/assets/aistudio/terrain_v2_manifest_8c24b17a.json'),
      loadImage('/assets/aistudio/nature_objects_8175a3fa.png'),
      loadImage('/assets/aistudio/buildings_objects_8fda4ffa.png?v=4'),
      loadJson<BuildingsManifest>('/assets/aistudio/buildings_objects_manifest_bfeee454.json?v=4'),
      loadImage('/assets/aistudio/farmer_sheet_32x48_cb7608e6.png'),
      loadImage('/assets/aistudio/farmer_idle_32x48_e1ca1ff7.png?v=3'),
      loadJson<FarmerIdleManifest>('/assets/aistudio/farmer_idle_manifest_2a228c40.json?v=3'),
      loadImage('/assets/aistudio/farmer_hoe_64_14ed371a.png?v=3'),
      loadJson<FarmerActionManifest>('/assets/aistudio/farmer_hoe_manifest_a0891851.json?v=3'),
      loadImage('/assets/aistudio/farmer_water_64_863cfc5a.png?v=3'),
      loadJson<FarmerActionManifest>('/assets/aistudio/farmer_water_manifest_0445553e.json?v=3'),
      loadImage('/assets/aistudio/farmer_harvest_64_385dd124.png?v=3'),
      loadJson<FarmerActionManifest>('/assets/aistudio/farmer_harvest_manifest_04e9e6a2.json?v=3'),
      loadImage('/assets/aistudio/farmer_axe_80_a577f5a9.png'),
      loadJson<FarmerActionManifest>('/assets/aistudio/farmer_axe_manifest_385da80c.json'),
      loadImage('/assets/aistudio/farmer_pickaxe_80_c00f96f5.png'),
      loadJson<FarmerActionManifest>('/assets/aistudio/farmer_pickaxe_manifest_2ff98e89.json'),
      loadImage(FARMER_PORTRAIT_ASSETS.sheetPath),
      loadJson<PortraitManifest>(FARMER_PORTRAIT_ASSETS.manifestPath),
      loadImage(FARMER_PORTRAIT_ASSETS.expressions.neutral),
      loadImage(FARMER_PORTRAIT_ASSETS.expressions.happy),
      loadImage(FARMER_PORTRAIT_ASSETS.expressions.surprised),
      loadImage('/assets/aistudio/crops_7271184c.png?v=2'),
      loadJson<CropsManifest>('/assets/aistudio/crops_manifest_36a79f8c.json?v=2'),
      loadImage('/assets/aistudio/icons_44203313.png?v=4'),
      loadJson<IconsManifest>('/assets/aistudio/icons_manifest_cee231f8.json?v=4'),
      loadImage('/assets/aistudio/dishes_32_5c545d1e.png?v=2'),
      loadJson<IconsManifest>('/assets/aistudio/dishes_manifest_0c7081e4.json?v=2'),
      Promise.all(
        NPC_LIST.map(async (npc) => {
          const [idleImg, idleManifest, portraitImg, portraitManifest] = await Promise.all([
            loadImage(npc.sheet),
            loadJson<FarmerIdleManifest>(npc.manifest),
            npc.portraitSheet ? loadImage(npc.portraitSheet) : Promise.resolve(null),
            npc.portraitManifest
              ? loadJson<PortraitManifest>(npc.portraitManifest)
              : Promise.resolve(null),
          ]);
          return {
            id: npc.id,
            idleImg,
            idleManifest,
            portraitImg,
            portraitManifest,
          };
        }),
      ),
      Promise.all(
        (
          Object.values(COOKING_STATION_TYPES) as {
            type: CookingStationType;
            sprite: string | null;
            manifest: string | null;
          }[]
        ).map(async (stationSpec) => {
          const [img, stationManifest] = await Promise.all([
            stationSpec.sprite ? loadImage(stationSpec.sprite) : Promise.resolve(null),
            stationSpec.manifest
              ? loadJson<CookingStationManifest>(stationSpec.manifest)
              : Promise.resolve(null),
          ]);
          return {
            type: stationSpec.type,
            img,
            manifest: stationManifest,
          };
        }),
      ),
    ])
      .then(
        ([
          terrainV2,
          terrainV2Manifest,
          natureObjects,
          buildingsObjects,
          buildingsObjectsManifest,
          farmer,
          farmerIdle,
          farmerIdleManifest,
          farmerHoe,
          farmerHoeManifest,
          farmerWater,
          farmerWaterManifest,
          farmerHarvest,
          farmerHarvestManifest,
          farmerAxe,
          farmerAxeManifest,
          farmerPickaxe,
          farmerPickaxeManifest,
          farmerPortraits,
          farmerPortraitsManifest,
          farmerPortraitNeutral,
          farmerPortraitHappy,
          farmerPortraitSurprised,
          crops,
          cropsManifest,
          icons,
          iconsManifest,
          dishes,
          dishesManifest,
          npcLoadedList,
          stationLoadedList,
        ]) => {
          sheets.terrainV2 = terrainV2;
          sheets.terrainV2Manifest = terrainV2Manifest;
          sheets.natureObjects = natureObjects;
          sheets.buildingsObjects = buildingsObjects;
          sheets.buildingsObjectsManifest = buildingsObjectsManifest;
          for (const [key, entry] of Object.entries(buildingsObjectsManifest.sprites) as [
            BuildingObjectType,
            BuildingManifestEntry,
          ][]) {
            if (BUILDING_OBJECT_SPECS[key]) {
              BUILDING_OBJECT_SPECS[key].x = entry.x;
              BUILDING_OBJECT_SPECS[key].y = entry.y;
              BUILDING_OBJECT_SPECS[key].w = entry.w;
              BUILDING_OBJECT_SPECS[key].h = entry.h;
              BUILDING_OBJECT_SPECS[key].collision = entry.collision;
            }
          }
          sheets.farmer = farmer;
          sheets.farmerIdle = farmerIdle;
          sheets.farmerIdleManifest = farmerIdleManifest;
          sheets.farmerHoe = farmerHoe;
          sheets.farmerHoeManifest = farmerHoeManifest;
          sheets.farmerWater = farmerWater;
          sheets.farmerWaterManifest = farmerWaterManifest;
          sheets.farmerHarvest = farmerHarvest;
          sheets.farmerHarvestManifest = farmerHarvestManifest;
          sheets.farmerAxe = farmerAxe;
          sheets.farmerAxeManifest = farmerAxeManifest;
          sheets.farmerPickaxe = farmerPickaxe;
          sheets.farmerPickaxeManifest = farmerPickaxeManifest;
          sheets.farmerPortraits = farmerPortraits;
          sheets.farmerPortraitsManifest = farmerPortraitsManifest;
          sheets.farmerPortraitNeutral = farmerPortraitNeutral;
          sheets.farmerPortraitHappy = farmerPortraitHappy;
          sheets.farmerPortraitSurprised = farmerPortraitSurprised;
          for (const entry of npcLoadedList) {
            sheets.npcIdleSheets[entry.id] = entry.idleImg;
            sheets.npcIdleManifests[entry.id] = entry.idleManifest;
            if (entry.portraitImg) {
              sheets.npcPortraitSheets[entry.id] = entry.portraitImg;
            }
            if (entry.portraitManifest) {
              sheets.npcPortraitManifests[entry.id] = entry.portraitManifest;
            }
          }
          sheets.crops = crops;
          sheets.cropsManifest = cropsManifest;
          sheets.icons = icons;
          sheets.iconsManifest = iconsManifest;
          sheets.dishes = dishes;
          sheets.dishesManifest = dishesManifest;
          sheets.iconUrls = buildIconUrls(icons, iconsManifest, dishes, dishesManifest);
          for (const entry of stationLoadedList) {
            if (entry.img) {
              sheets.cookingStationSprites[entry.type] = entry.img;
            }
            if (entry.manifest) {
              sheets.cookingStationManifests[entry.type] = entry.manifest;
              const typeSpec = COOKING_STATION_TYPES[entry.type];
              if (typeSpec) {
                typeSpec.w = entry.manifest.frameWidth;
                typeSpec.h = entry.manifest.frameHeight;
                typeSpec.anchor = [entry.manifest.anchor.x, entry.manifest.anchor.y];
              }
              for (const station of COOKING_STATIONS) {
                if (station.type === entry.type) {
                  station.w = entry.manifest.frameWidth;
                  station.h = entry.manifest.frameHeight;
                  station.anchor = [entry.manifest.anchor.x, entry.manifest.anchor.y];
                }
              }
            }
          }
          sheets.ready = true;
          for (const listener of readyListeners) {
            listener();
          }
          readyListeners.clear();
        },
      )
      .catch((err) => {
        console.error(err);
      });
  } else if (sheets.ready && onReady) {
    onReady();
  }
  return sheets;
}

export function getItemIconUrl(key: ItemId | IconName): string | null {
  getLoadedSpriteSheets();
  const iconName: IconName =
    key in ITEM_TO_ICON_NAME ? ITEM_TO_ICON_NAME[key as ItemId] : (key as IconName);
  return sheets.iconUrls[iconName] ?? null;
}

export function subscribeAssetsReady(listener: () => void): () => void {
  if (sheets.ready) return () => {};
  readyListeners.add(listener);
  getLoadedSpriteSheets();
  return () => {
    readyListeners.delete(listener);
  };
}
