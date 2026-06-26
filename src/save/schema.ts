// 存档结构、版本、迁移、新游戏工厂（SPEC 6.9 / 存档版本与迁移）。
import type { InventorySlot, SaveData, SkillId, ToolTier, ToolType } from '../types';
import { FARM_SPAWN, INVENTORY_SIZE } from '../config/constants';
import { MAX_ENERGY, MAX_HP, START_GOLD, WATERING_CAN_CAPACITY } from '../config/balance';
import { deriveValue } from '../utils/random';
import { pickWeather } from '../systems/weather';
import { NPCS } from '../data/npcs';

// 首个实现版本。规格期演进（v2→v2.2）发生在编码前，无历史存档、无需迁移；
// 迁移机制用于首发之后的结构变更：改 SaveData 结构 → ++ + 写 migrate 分支 + 测试。
export const CURRENT_SAVE_VERSION = 1;

const INITIAL_TOOLS: Record<ToolType, ToolTier> = {
  hoe: 'basic',
  wateringCan: 'basic',
  pickaxe: 'basic',
  axe: 'basic',
  sword: 'basic',
  fishingRod: 'basic',
};

export function createNewGame(seed: number, playerName = 'Player'): SaveData {
  const inventory: (InventorySlot | null)[] = Array.from({ length: INVENTORY_SIZE }, () => null);
  // 工具作为不可堆叠物品占前几格（档位查 player.tools），其后是初始种子
  inventory[0] = { itemId: 'hoe', qty: 1 };
  inventory[1] = { itemId: 'wateringCan', qty: 1 };
  inventory[2] = { itemId: 'pickaxe', qty: 1 };
  inventory[3] = { itemId: 'axe', qty: 1 };
  inventory[4] = { itemId: 'parsnip_seeds', qty: 15 };
  inventory[5] = { itemId: 'greenbean_seeds', qty: 10 };

  const skills: Record<SkillId, { level: number; xp: number }> = {
    farming: { level: 1, xp: 0 },
    mining: { level: 1, xp: 0 },
    fishing: { level: 1, xp: 0 },
    combat: { level: 1, xp: 0 },
  };

  return {
    version: CURRENT_SAVE_VERSION,
    rng: { seed, state: seed },
    player: {
      name: playerName,
      gold: START_GOLD,
      energy: MAX_ENERGY,
      maxEnergy: MAX_ENERGY,
      hp: MAX_HP,
      maxHp: MAX_HP,
      position: { scene: 'Farm', x: FARM_SPAWN.x, y: FARM_SPAWN.y },
      facing: 'down',
      skills,
      tools: { ...INITIAL_TOOLS },
      wateringCanWater: WATERING_CAN_CAPACITY.basic,
      hotbarSelectedIndex: 0,
    },
    time: {
      year: 1,
      season: 'spring',
      day: 1,
      minute: 360, // 06:00
      weather: 'sunny', // 第 1 天固定晴
      tomorrowWeather: pickWeather('spring', deriveValue(seed, 'weather', 1)), // 由种子域派生掷定
    },
    inventory,
    farm: { tiles: {} },
    shippingBin: [],
    toolUpgrades: [],
    chests: {},
    relationships: Object.fromEntries(
      NPCS.map((n) => [n.id, { points: 0, met: false, talkedToday: false, giftsThisWeek: 0 }]),
    ),
    unlocked: { recipes: [], shops: ['seedShop'] },
    mine: { deepestLevel: 0 },
    consumedDialogueNodes: [],
    flags: {},
    settings: { bgmVolume: 0.7, sfxVolume: 0.8, fullscreen: false, language: 'zh' },
  };
}

// 读档迁移：首发后逐版升级；当前 version=1 无前置版本。
export function migrate(raw: SaveData): SaveData {
  if (raw.version > CURRENT_SAVE_VERSION) {
    throw new Error(`存档版本 ${raw.version} 高于当前实现 ${CURRENT_SAVE_VERSION}`);
  }
  // 未来：while (raw.version < CURRENT_SAVE_VERSION) { ...逐版升级... }
  return raw;
}
