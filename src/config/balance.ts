// 数值平衡基线（SPEC 附录 A）。实现以此为准，改动登记 ADR。

import type { Season, Weather, ToolTier } from '../types';

// 玩家
export const MAX_ENERGY = 270;
export const MAX_HP = 100;
export const MOVE_SPEED = 80; // px/s（世界坐标）
export const LOW_ENERGY_SPEED_FACTOR = 0.6;
export const START_GOLD = 500;
export const MAX_STACK = 999;
export const INVINCIBILITY_MS = 700;

// 水壶容量（按档）
export const WATERING_CAN_CAPACITY: Record<ToolTier, number> = {
  basic: 40,
  copper: 60,
  iron: 80,
  gold: 100,
  iridium: 120,
};

// 能耗（每次动作）
export const ENERGY_COST = {
  hoe: 2,
  water: 2,
  pickaxe: 2,
  axe: 2,
  sword: 2,
  scythe: 0,
} as const;
export const FAINT_HP_COST = 4; // 体力 ≤0 后每次动作改扣 HP

// 晕倒/熬夜惩罚（SPEC 附录 A）
export const FAINT_GOLD_PENALTY_RATE = 0.1;
export const FAINT_GOLD_PENALTY_CAP_FARM = 100;
export const FAINT_GOLD_PENALTY_CAP_MINE = 500;
export const FAINT_MINE_ITEM_LOSS_MAX = 3;

// 天气概率（按季，过夜掷次日；和为 1.0）
export const WEATHER_PROBABILITY: Record<Season, Record<Weather, number>> = {
  spring: { sunny: 0.78, rain: 0.22, storm: 0, snow: 0 },
  summer: { sunny: 0.8, rain: 0.1, storm: 0.1, snow: 0 },
  fall: { sunny: 0.78, rain: 0.22, storm: 0, snow: 0 },
  winter: { sunny: 0.7, rain: 0, storm: 0, snow: 0.3 },
};

// 好感度
export const HEART_POINTS = 250; // 1 心 = 250 点
export const MAX_HEARTS = 10;
export const GIFT_POINTS = { love: 80, like: 45, neutral: 20, dislike: -20, hate: -40 } as const;
export const DAILY_TALK_POINTS = 20;
export const GIFTS_PER_WEEK = 2;
export const BIRTHDAY_GIFT_MULTIPLIER = 8;

// 技能：升到 L 级所需累计 XP
export function skillXpForLevel(level: number): number {
  return level * level * 100;
}
export const MAX_SKILL_LEVEL = 10;

// 战斗（SPEC 附录A）
export const SWORD_BASE_DAMAGE = 8;
export const SWORD_TIER_BONUS = 6; // 每档 +6
export const COMBAT_DAMAGE_VARIANCE = 0.15;
export const COMBAT_XP_KILL = 6;
export const MINING_XP_NODE = 6;
export const MINE_ELEVATOR_INTERVAL = 5; // 每 5 层一个存点/电梯

// 钓鱼小游戏（SPEC 附录A）
export const FISHING_BAR_FRACTION = 0.34; // 绿条基础长度占比
export const FISHING_SKILL_BONUS = 0.04; // 每级钓鱼 +4% 绿条
export const FISHING_PROGRESS_GAIN = 0.55; // 命中时每秒进度
export const FISHING_PROGRESS_LOSS = 0.4; // 脱靶时每秒进度
export const FISHING_XP_CATCH = 10;

// 节日（SPEC 5.11）：首次参加当年某节日发放的奖励金币
export const FESTIVAL_ATTEND_REWARD = 300;

// 工具升级（M3：金币 + 天数；材料 M5 起补）
export const TOOL_TIER_ORDER: ToolTier[] = ['basic', 'copper', 'iron', 'gold', 'iridium'];
export const TOOL_UPGRADE_DAYS = 2;
export const TOOL_UPGRADE_COST: Record<Exclude<ToolTier, 'basic'>, number> = {
  copper: 500,
  iron: 1500,
  gold: 4000,
  iridium: 10000,
};

// 工具作用范围：朝向方向的直线瓦片数（按档位）。锄头/水壶用。
export const TOOL_AOE_LENGTH: Record<ToolTier, number> = {
  basic: 1,
  copper: 3,
  iron: 5,
  gold: 7,
  iridium: 9,
};
