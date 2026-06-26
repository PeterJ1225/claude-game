// 全局类型（SPEC 第 6 章）。新增内容先扩展这里，再写数据与逻辑。

// 6.0 共享类型
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'sunny' | 'rain' | 'storm' | 'snow';
export interface InventorySlot {
  itemId: string;
  qty: number;
}

// 6.1 作物
export interface CropDef {
  id: string;
  name: string;
  seedItemId: string;
  produceItemId: string;
  seasons: Season[];
  growthStages: number[];
  regrowDays?: number;
  spriteKey: string;
  yieldMin: number;
  yieldMax: number;
}

// 6.2 物品
export type ItemCategory =
  | 'seed'
  | 'crop'
  | 'tool'
  | 'ore'
  | 'fish'
  | 'gift'
  | 'material'
  | 'cooked'
  | 'misc';
export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  sellPrice: number; // 唯一售价真相源
  stackable: boolean;
  maxStack: number;
  iconKey: string;
  description: string;
  edible?: { energy: number; health: number };
}

// 6.3 工具
export type ToolType = 'hoe' | 'wateringCan' | 'pickaxe' | 'axe' | 'sword' | 'fishingRod';
export type ToolTier = 'basic' | 'copper' | 'iron' | 'gold' | 'iridium';
export interface ToolDef {
  id: string;
  type: ToolType;
  tier: ToolTier;
  energyCost: number;
  areaOfEffect: { width: number; height: number };
  upgradeFrom?: string;
  upgradeCost?: { gold: number; materialItemId: string; materialQty: number; days: number };
}

// 6.4 NPC
export interface NPCScheduleEntry {
  time: number;
  scene: string;
  x: number;
  y: number;
}
export interface NPCDef {
  id: string;
  name: string;
  spriteKey: string;
  birthday: { season: Season; day: number };
  giftTastes: { love: string[]; like: string[]; dislike: string[]; hate: string[] };
  schedule: Record<string, NPCScheduleEntry[]>;
  dialogueFile: string;
}

// 6.5 鱼
export interface FishDef {
  id: string;
  name: string;
  itemId: string;
  seasons: Season[];
  weather: (Weather | 'any')[];
  locations: string[];
  timeRange: [number, number];
  difficulty: number;
}

// 6.6 商店
export interface ShopStockEntry {
  itemId: string;
  price: number;
  seasons?: Season[];
  stock?: number;
}
export interface ShopDef {
  id: string;
  name: string;
  npcId?: string;
  openHours: [number, number];
  stock: ShopStockEntry[];
}

// 6.7 怪物
export interface MonsterDef {
  id: string;
  name: string;
  spriteKey: string;
  hp: number;
  attack: number;
  speed: number;
  minMineLevel: number;
  drops: { itemId: string; chance: number; min: number; max: number }[];
}

// 6.8 节日
export interface FestivalDef {
  id: string;
  name: string;
  season: Season;
  day: number;
  startTime: number;
  endTime: number;
  scene: string;
  description: string;
}

// 6.10 配方
export interface RecipeDef {
  id: string;
  name: string;
  producesItemId: string;
  producesQty: number;
  ingredients: { itemId: string; qty: number }[];
  station: 'stove' | 'none';
  unlockedBy?: { skill: SkillId; level: number } | { flag: string };
}

// 5.10 技能
export type SkillId = 'farming' | 'mining' | 'fishing' | 'combat';
export interface SkillPerk {
  skill: SkillId;
  level: number;
  passive?: { type: string; value: number };
}

// 6.11 对话
export interface DialogueLine {
  speaker?: string;
  text: string;
}
export type DialogueCondition =
  | { type: 'minHearts'; hearts: number }
  | { type: 'flag'; flag: string; equals?: boolean | number }
  | { type: 'season'; season: Season }
  | { type: 'weather'; weather: Weather }
  | { type: 'firstMeet' };
export interface DialogueNode {
  id: string;
  conditions?: DialogueCondition[];
  lines: DialogueLine[];
  setFlags?: Record<string, boolean | number>;
  once?: boolean;
}
export interface DialogueScript {
  npcId: string;
  nodes: DialogueNode[];
  fallbackNodeId: string;
}

export type Facing = 'up' | 'down' | 'left' | 'right';

// 6.9 中央存档结构
export interface SaveData {
  version: number;
  rng: { seed: number; state: number };
  player: {
    name: string;
    gold: number;
    energy: number;
    maxEnergy: number;
    hp: number;
    maxHp: number;
    position: { scene: string; x: number; y: number };
    facing: Facing;
    skills: Record<SkillId, { level: number; xp: number }>;
    tools: Record<ToolType, ToolTier>;
    wateringCanWater: number;
    hotbarSelectedIndex: number;
  };
  time: {
    year: number;
    season: Season;
    day: number;
    minute: number;
    weather: Weather;
    tomorrowWeather: Weather;
  };
  inventory: (InventorySlot | null)[];
  farm: {
    tiles: Record<
      string,
      {
        tilled: boolean;
        watered: boolean;
        crop?: { cropId: string; stage: number; daysInStage: number; regrowReady?: boolean };
      }
    >;
  };
  shippingBin: InventorySlot[];
  toolUpgrades: { fromToolType: ToolType; toTier: ToolTier; daysRemaining: number }[];
  chests: Record<string, (InventorySlot | null)[]>;
  relationships: Record<
    string,
    { points: number; met: boolean; talkedToday: boolean; giftsThisWeek: number }
  >;
  unlocked: { recipes: string[]; shops: string[] };
  mine: { deepestLevel: number };
  consumedDialogueNodes: string[];
  flags: Record<string, boolean | number>;
  settings: { bgmVolume: number; sfxVolume: number; fullscreen: boolean; language: string };
}
