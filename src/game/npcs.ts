import type {
  DialogueLine,
  Direction,
  ItemId,
  NpcId,
  NpcState,
  QuestStatus,
} from './types';

export const FARMER_PORTRAIT_CONFIG = {
  speakerName: 'You',
  sheetPath: '/assets/aistudio/farmer_portraits_96_a90ed2d9.png',
  manifestPath: '/assets/aistudio/farmer_portraits_manifest_51cddb0c.json',
  portraitSize: 96,
  expressions: ['neutral', 'happy', 'surprised'] as const,
} as const;

export interface NpcDialogueLineTemplate {
  speaker: 'npc' | 'player';
  text: string;
  expression?: string;
}

export interface NpcQuestDefinition {
  title: string;
  description: string;
  requiredItemId: ItemId;
  requiredCount: number;
  rewardGold?: number;
  rewardItem?: { itemId: ItemId; count: number };
}

export interface NpcDefinition {
  id: NpcId;
  name: string;
  role: string;
  homeX: number;
  homeY: number;
  defaultFacing: Direction;
  collision: readonly [number, number];
  animOffsetMs: number;
  sheet: string;
  manifest: string;
  portraitSheet: string | null;
  portraitManifest: string | null;
  portraitSize: number;
  expressions: readonly string[];
  quest: NpcQuestDefinition;
  dialogue: {
    greeting: NpcDialogueLineTemplate[];
    questOffer: NpcDialogueLineTemplate[];
    inProgress: NpcDialogueLineTemplate[];
    complete: NpcDialogueLineTemplate[];
    idleChatter: NpcDialogueLineTemplate[];
  };
}

export const NPC_DEFINITIONS: Record<NpcId, NpcDefinition> = {
  tobias: {
    id: 'tobias',
    name: 'Tobias',
    role: 'Old Farmer',
    homeX: 288,
    homeY: 544,
    defaultFacing: 'down',
    collision: [16, 10],
    animOffsetMs: 0,
    sheet: '/assets/aistudio/npc_tobias_idle_32x48_c52e1873.png',
    manifest: '/assets/aistudio/npc_tobias_manifest_8ee634ec.json',
    portraitSheet: '/assets/aistudio/tobias_portraits_96_1227d1a5.png',
    portraitManifest: '/assets/aistudio/tobias_portraits_manifest_d1603fd1.json',
    portraitSize: 96,
    expressions: ['neutral', 'happy', 'grumpy'],
    quest: {
      title: 'Fresh Turnips',
      description: 'Bring me 3 turnips.',
      requiredItemId: 'turnip',
      requiredCount: 3,
      rewardItem: { itemId: 'potato_seed', count: 5 },
    },
    dialogue: {
      greeting: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'Morning, farmer. Good to see smoke rising from the homestead chimney again.',
        },
      ],
      questOffer: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'Nothing keeps a carpenter working like a warm root stew. Bring me 3 turnips and I will trade you 5 bags of Potato Seeds.',
        },
        {
          speaker: 'player',
          expression: 'happy',
          text: 'I can grow those on the plot. I will bring you 3 Turnips!',
        },
      ],
      inProgress: [
        {
          speaker: 'npc',
          expression: 'grumpy',
          text: 'Still short on turnips? I need 3 harvested Turnips—not seed packets! Water your plot every day.',
        },
      ],
      complete: [
        {
          speaker: 'npc',
          expression: 'happy',
          text: 'Crisp and purple-topped—just what I asked for! Here are 5 Potato Seeds for your next planting.',
        },
        {
          speaker: 'player',
          expression: 'happy',
          text: 'Thanks, Tobias! I will put these seeds right in the soil.',
        },
      ],
      idleChatter: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'A solid fence keeps the weeds out and the valley looking proud. Keep at the crops!',
        },
      ],
    },
  },
  lila: {
    id: 'lila',
    name: 'Lila',
    role: 'Shopkeeper',
    homeX: 1144,
    homeY: 344,
    defaultFacing: 'down',
    collision: [16, 10],
    animOffsetMs: 180,
    sheet: '/assets/aistudio/npc_lila_idle_32x48_f8ddf58b.png',
    manifest: '/assets/aistudio/npc_lila_manifest_d8a52897.json',
    portraitSheet: '/assets/aistudio/lila_portraits_96_1d5955ba.png',
    portraitManifest: '/assets/aistudio/lila_portraits_manifest_fd72f5fd.json',
    portraitSize: 96,
    expressions: ['neutral', 'happy', 'worried'],
    quest: {
      title: 'Stall Crates',
      description: 'Bring me 5 wood.',
      requiredItemId: 'wood',
      requiredCount: 5,
      rewardGold: 150,
    },
    dialogue: {
      greeting: [
        {
          speaker: 'npc',
          expression: 'happy',
          text: 'Hi there! The morning breeze smells like fresh soil—Spring is finally waking up.',
        },
      ],
      questOffer: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'My seed stall needs extra crate planks before market day. Bring me 5 wood and I will pay you 150G!',
        },
        {
          speaker: 'player',
          expression: 'surprised',
          text: '150G for 5 Wood? I have my axe ready!',
        },
      ],
      inProgress: [
        {
          speaker: 'npc',
          expression: 'worried',
          text: 'Oh, still gathering wood? I need 5 Wood in your pack—try chopping the trees or stumps around the homestead.',
        },
      ],
      complete: [
        {
          speaker: 'npc',
          expression: 'happy',
          text: 'Lovely sturdy timber! Thank you so much—here is 150G for the planks!',
        },
        {
          speaker: 'player',
          expression: 'happy',
          text: 'Glad I could help out, Lila!',
        },
      ],
      idleChatter: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'Strawberries take four watered days, potatoes take five—drop by the stall anytime you need more seeds.',
        },
      ],
    },
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus',
    role: 'Fisherman',
    homeX: 1120,
    homeY: 650,
    defaultFacing: 'down',
    collision: [16, 10],
    animOffsetMs: 340,
    sheet: '/assets/aistudio/npc_marcus_idle_32x48_506a0e3c.png',
    manifest: '/assets/aistudio/npc_marcus_manifest_bccdc91f.json',
    portraitSheet: '/assets/aistudio/marcus_portraits_96_08589e56.png?v=2',
    portraitManifest: '/assets/aistudio/marcus_portraits_manifest_12413ad6.json?v=2',
    portraitSize: 96,
    expressions: ['neutral', 'smile', 'thinking'],
    quest: {
      title: 'Pond Coping',
      description: 'Bring me 3 stone.',
      requiredItemId: 'stone',
      requiredCount: 3,
      rewardItem: { itemId: 'strawberry_seed', count: 5 },
    },
    dialogue: {
      greeting: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'Hey neighbor. Listening to the water down by the pond helps me measure out the day.',
        },
      ],
      questOffer: [
        {
          speaker: 'npc',
          expression: 'thinking',
          text: 'Hmm... I need 3 stone to weigh down my fishing nets by the pond. Do me a favor and mine some with your pickaxe—you can have 5 Strawberry Seeds I saved.',
        },
        {
          speaker: 'player',
          expression: 'neutral',
          text: '5 Strawberry Seeds! I will break some rocks and bring you 3 Stone.',
        },
      ],
      inProgress: [
        {
          speaker: 'npc',
          expression: 'thinking',
          text: 'Let me see... I still need 3 Stone to anchor my fishing nets. Try mining the gray rocks around the clearing.',
        },
      ],
      complete: [
        {
          speaker: 'npc',
          expression: 'smile',
          text: 'Nice and heavy—these 3 Stones will keep my fishing nets steady in the water! Here are 5 Strawberry Seeds for your farm.',
        },
        {
          speaker: 'player',
          expression: 'happy',
          text: 'Thank you, Marcus! These will brighten the plot.',
        },
      ],
      idleChatter: [
        {
          speaker: 'npc',
          expression: 'neutral',
          text: 'Every stone on that old banner base was set by hand decades ago. Wait until you see it flying high again.',
        },
      ],
    },
  },
};

export const NPC_LIST: NpcDefinition[] = [
  NPC_DEFINITIONS.tobias,
  NPC_DEFINITIONS.lila,
  NPC_DEFINITIONS.marcus,
];

export function createInitialNpcs(): NpcState[] {
  return NPC_LIST.map((def) => ({
    id: def.id,
    x: def.homeX,
    y: def.homeY,
    facing: def.defaultFacing,
    animOffsetMs: def.animOffsetMs,
  }));
}

export function createInitialQuestStates(): Record<NpcId, QuestStatus> {
  return {
    tobias: 'not_started',
    lila: 'not_started',
    marcus: 'not_started',
  };
}

export function normalizeQuestStates(
  raw?: Partial<Record<NpcId, QuestStatus | 'available'>> | null,
): Record<NpcId, QuestStatus> {
  const defaults = createInitialQuestStates();
  if (!raw || typeof raw !== 'object') return defaults;
  for (const id of Object.keys(defaults) as NpcId[]) {
    const val = raw[id];
    if (val === 'not_started' || val === 'active' || val === 'ready' || val === 'completed') {
      defaults[id] = val;
    } else if (val === 'available') {
      defaults[id] = 'not_started';
    }
  }
  return defaults;
}

export type NpcDialogueScene = 'offer' | 'inProgress' | 'complete' | 'idleChatter';

export function buildDialogueLinesForNpc(
  def: NpcDefinition,
  scene: NpcDialogueScene,
): DialogueLine[] {
  const templates: NpcDialogueLineTemplate[] =
    scene === 'offer'
      ? [...def.dialogue.greeting, ...def.dialogue.questOffer]
      : scene === 'inProgress'
        ? def.dialogue.inProgress
        : scene === 'complete'
          ? def.dialogue.complete
          : def.dialogue.idleChatter;

  return templates.map((tpl) => {
    if (tpl.speaker === 'player') {
      return {
        speaker: 'player',
        speakerName: FARMER_PORTRAIT_CONFIG.speakerName,
        text: tpl.text,
        expression: tpl.expression ?? 'neutral',
        portraitSheet: FARMER_PORTRAIT_CONFIG.sheetPath,
        portraitManifestPath: FARMER_PORTRAIT_CONFIG.manifestPath,
        portraitSize: FARMER_PORTRAIT_CONFIG.portraitSize,
        portraitKey: 'player',
      };
    }
    return {
      speaker: 'npc',
      speakerName: def.name,
      text: tpl.text,
      expression: tpl.expression ?? 'neutral',
      portraitSheet: def.portraitSheet,
      portraitManifestPath: def.portraitManifest,
      portraitSize: def.portraitSize,
      portraitKey: def.portraitSheet ? def.id : null,
    };
  });
}
