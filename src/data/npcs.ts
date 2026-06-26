// NPC 定义（数据驱动，SPEC 6.4）。M4：2 个常驻小镇的 NPC，简单日程。
import type { NPCDef } from '../types';

export const NPCS: NPCDef[] = [
  {
    id: 'mira',
    name: '米拉',
    spriteKey: 'npc_mira',
    birthday: { season: 'spring', day: 5 },
    giftTastes: {
      love: ['melon'],
      like: ['tomato', 'green_bean'],
      dislike: ['parsnip'],
      hate: ['copper_ore'],
    },
    schedule: {
      default: [
        { time: 6 * 60, scene: 'Town', x: 6, y: 6 },
        { time: 10 * 60, scene: 'Town', x: 14, y: 9 },
        { time: 14 * 60, scene: 'Town', x: 8, y: 14 },
        { time: 20 * 60, scene: 'Town', x: 6, y: 6 },
      ],
    },
    dialogueFile: 'mira',
  },
  {
    id: 'sam',
    name: '山姆',
    spriteKey: 'npc_sam',
    birthday: { season: 'summer', day: 10 },
    giftTastes: {
      love: ['corn'],
      like: ['parsnip', 'pumpkin'],
      dislike: ['green_bean'],
      hate: ['iron_ore'],
    },
    schedule: {
      default: [
        { time: 6 * 60, scene: 'Town', x: 30, y: 10 },
        { time: 11 * 60, scene: 'Town', x: 24, y: 6 },
        { time: 18 * 60, scene: 'Town', x: 28, y: 16 },
      ],
    },
    dialogueFile: 'sam',
  },
];

const NPC_MAP = new Map(NPCS.map((n) => [n.id, n]));

export function getNPC(id: string): NPCDef {
  const n = NPC_MAP.get(id);
  if (!n) throw new Error(`未知 NPC: ${id}`);
  return n;
}
