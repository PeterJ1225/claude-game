// 存档结构、版本、迁移、新游戏工厂（SPEC 6.9 / 存档版本与迁移）。
import type { InventorySlot, SaveData, SkillId, ToolTier, ToolType } from '../types';
import { FARM_SPAWN, INVENTORY_SIZE } from '../config/constants';
import { MAX_ENERGY, MAX_HP, START_GOLD, WATERING_CAN_CAPACITY } from '../config/balance';

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
  inventory[0] = { itemId: 'parsnip_seeds', qty: 15 };

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
      weather: 'sunny',
      tomorrowWeather: 'sunny', // M0 占位；后续由过夜流水线按天气概率掷定
    },
    inventory,
    farm: { tiles: {} },
    shippingBin: [],
    toolUpgrades: [],
    chests: {},
    relationships: {},
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
