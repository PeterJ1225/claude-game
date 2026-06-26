// 怪物定义（数据驱动，SPEC 6.7）。M5：史莱姆 + 蝙蝠。
import type { MonsterDef } from '../types';

export const MONSTERS: MonsterDef[] = [
  {
    id: 'green_slime',
    name: '绿史莱姆',
    spriteKey: 'mon_slime',
    hp: 24,
    attack: 6,
    speed: 35,
    minMineLevel: 1,
    drops: [
      { itemId: 'stone', chance: 0.5, min: 1, max: 2 },
      { itemId: 'copper_ore', chance: 0.2, min: 1, max: 1 },
    ],
  },
  {
    id: 'bat',
    name: '蝙蝠',
    spriteKey: 'mon_bat',
    hp: 18,
    attack: 8,
    speed: 55,
    minMineLevel: 4,
    drops: [{ itemId: 'iron_ore', chance: 0.25, min: 1, max: 1 }],
  },
];

const MONSTER_MAP = new Map(MONSTERS.map((m) => [m.id, m]));

export function getMonster(id: string): MonsterDef {
  const m = MONSTER_MAP.get(id);
  if (!m) throw new Error(`未知怪物: ${id}`);
  return m;
}

// 某矿层可出现的怪物 id 列表
export function monstersForLevel(level: number): string[] {
  return MONSTERS.filter((m) => level >= m.minMineLevel).map((m) => m.id);
}
