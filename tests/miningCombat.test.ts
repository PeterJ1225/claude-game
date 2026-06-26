import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import { getMonster } from '../src/data/monsters';
import type { MiningSystem } from '../src/systems/MiningSystem';
import type { CombatSystem } from '../src/systems/CombatSystem';
import type { InventorySystem } from '../src/systems/InventorySystem';

const mining = (): MiningSystem => ServiceLocator.get<MiningSystem>(SYS.mining);
const combat = (): CombatSystem => ServiceLocator.get<CombatSystem>(SYS.combat);
const inv = (): InventorySystem => ServiceLocator.get<InventorySystem>(SYS.inventory);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(123);
  setupSystems();
});

describe('M5 矿洞分层（确定性派生）', () => {
  it('同种子同层布局相同、不同层不同', () => {
    const a = mining().generateLayer(3);
    const b = mining().generateLayer(3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = mining().generateLayer(4);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('descend 更新最深层进度', () => {
    expect(GameState.data.mine.deepestLevel).toBe(0);
    mining().descend(5);
    expect(GameState.data.mine.deepestLevel).toBe(5);
    mining().descend(3); // 不倒退
    expect(GameState.data.mine.deepestLevel).toBe(5);
  });

  it('深层出现更强怪物（蝙蝠 ≥4 层）', () => {
    const shallow = mining().generateLayer(1).monsters.map((m) => m.type);
    expect(shallow.every((t) => t === 'green_slime')).toBe(true);
  });
});

describe('M5 战斗', () => {
  it('剑伤随档位提升', () => {
    GameState.data.player.tools.sword = 'basic';
    const lows: number[] = [];
    for (let i = 0; i < 30; i++) lows.push(combat().swordDamage());
    GameState.data.player.tools.sword = 'gold';
    const highs: number[] = [];
    for (let i = 0; i < 30; i++) highs.push(combat().swordDamage());
    const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(highs)).toBeGreaterThan(avg(lows));
  });

  it('受击扣血、无敌帧内忽略、HP 归零返回 fainted', () => {
    GameState.data.player.hp = 100;
    expect(combat().hitPlayer(10, 1000)).toBe('hit');
    expect(GameState.data.player.hp).toBe(90);
    expect(combat().hitPlayer(10, 1100)).toBe('iframe'); // 无敌帧内（<700ms）
    expect(GameState.data.player.hp).toBe(90);
    expect(combat().hitPlayer(200, 5000)).toBe('fainted');
    expect(GameState.data.player.hp).toBe(0);
  });

  it('怪物掉落进背包格式正确', () => {
    const drops = mining().rollMonsterDrops(getMonster('green_slime'));
    for (const d of drops) {
      expect(typeof d.itemId).toBe('string');
      expect(d.qty).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('M5 矿洞晕倒丢物', () => {
  it('loseRandom 从随机的非工具格各丢 1、保留工具', () => {
    GameState.data.inventory.fill(null);
    const ids = ['stone', 'coal', 'copper_ore', 'iron_ore', 'gold_ore'];
    ids.forEach((id, i) => (GameState.data.inventory[i] = { itemId: id, qty: 1 }));
    GameState.data.inventory[10] = { itemId: 'hoe', qty: 1 };
    const total = (): number => ids.reduce((s, id) => s + inv().count(id), 0);
    expect(total()).toBe(5);
    inv().loseRandom(3);
    expect(total()).toBe(2); // 丢了 3 件
    expect(inv().count('hoe')).toBe(1); // 工具不丢
  });
});
