import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { RelationshipSystem } from '../src/systems/RelationshipSystem';
import type { DialogSystem } from '../src/systems/DialogSystem';
import type { NPCSystem } from '../src/systems/NPCSystem';

const rel = (): RelationshipSystem => ServiceLocator.get<RelationshipSystem>(SYS.relationship);
const dialog = (): DialogSystem => ServiceLocator.get<DialogSystem>(SYS.dialog);
const npc = (): NPCSystem => ServiceLocator.get<NPCSystem>(SYS.npc);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(1);
  setupSystems();
});

describe('M4 好感度', () => {
  it('每日对话 +20，当天重复无效', () => {
    expect(rel().talk('mira')).toBe(true);
    expect(GameState.data.relationships.mira.points).toBe(20);
    expect(rel().talk('mira')).toBe(false);
    expect(GameState.data.relationships.mira.points).toBe(20);
  });

  it('送礼按喜好加减、每周上限 2 次', () => {
    expect(rel().gift('mira', 'melon')).toBe('love'); // +80
    expect(GameState.data.relationships.mira.points).toBe(80);
    expect(rel().gift('mira', 'copper_ore')).toBe('hate'); // -40 → 40
    expect(GameState.data.relationships.mira.points).toBe(40);
    expect(rel().gift('mira', 'melon')).toBeNull(); // 超周上限
  });

  it('心数换算 250 点/心', () => {
    GameState.data.relationships.mira.points = 500;
    expect(rel().heartsOf('mira')).toBe(2);
  });

  it('生日送礼 ×8 倍率', () => {
    GameState.data.time.season = 'spring';
    GameState.data.time.day = 5; // 米拉生日
    rel().gift('mira', 'tomato'); // like 45 ×8
    expect(GameState.data.relationships.mira.points).toBe(360);
  });
});

describe('M4 对话与心事件', () => {
  it('首次相遇取 first 节点，标记相遇后不再取', () => {
    const n1 = dialog().pickNode('mira');
    expect(n1.id).toBe('first');
    dialog().consume('mira', n1);
    expect(dialog().pickNode('mira').id).not.toBe('first');
  });

  it('达 2 心触发 once 心事件，消费后写 flag 且不再触发', () => {
    GameState.data.relationships.mira.points = 500;
    GameState.data.relationships.mira.met = true;
    const n = dialog().pickNode('mira');
    expect(n.id).toBe('heart2');
    dialog().consume('mira', n);
    expect(GameState.data.flags['event:mira:1']).toBe(true);
    expect(dialog().pickNode('mira').id).not.toBe('heart2');
  });
});

describe('M4 NPC 日程', () => {
  it('按时间返回当前应在的场景与像素位置', () => {
    GameState.data.time.minute = 6 * 60;
    const t = npc().currentTarget('mira');
    expect(t.scene).toBe('Town');
    expect(t.x).toBe(6 * 16 + 8);
  });
});
