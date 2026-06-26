import { describe, it, expect } from 'vitest';
import { createNewGame, CURRENT_SAVE_VERSION } from '../src/save/schema';
import { INVENTORY_SIZE } from '../src/config/constants';
import { MAX_ENERGY } from '../src/config/balance';

// 验证 6.9 SaveData / v2.2 / v2.2.1 的结构决策真正落到了 createNewGame。
describe('createNewGame', () => {
  const save = createNewGame(42);

  it('version = CURRENT_SAVE_VERSION = 1', () => {
    expect(save.version).toBe(CURRENT_SAVE_VERSION);
    expect(CURRENT_SAVE_VERSION).toBe(1);
  });

  it('inventory 定长 36，前几格为工具+种子', () => {
    expect(save.inventory).toHaveLength(INVENTORY_SIZE);
    expect(save.inventory[0]).toEqual({ itemId: 'hoe', qty: 1 });
    expect(save.inventory[1]).toEqual({ itemId: 'wateringCan', qty: 1 });
    expect(save.inventory[4]).toEqual({ itemId: 'parsnip_seeds', qty: 15 });
    expect(save.inventory[6]).toBeNull();
  });

  it('player.tools 为 Record 形状、四基础工具 basic 档', () => {
    expect(save.player.tools.hoe).toBe('basic');
    expect(save.player.tools.wateringCan).toBe('basic');
    expect(save.player.tools.pickaxe).toBe('basic');
    expect(save.player.tools.axe).toBe('basic');
  });

  it('能量满 / 时间 06:00 / rng{seed,state}', () => {
    expect(save.player.energy).toBe(MAX_ENERGY);
    expect(save.player.energy).toBe(save.player.maxEnergy);
    expect(save.time.minute).toBe(360);
    expect(save.rng).toEqual({ seed: 42, state: 42 });
    expect(save.mine.deepestLevel).toBe(0);
  });

  it('已消除双真相源/旧字段：无独立 hotbar、unlocked 无 tools/mineLevel', () => {
    expect('hotbar' in save).toBe(false);
    expect('tools' in save.unlocked).toBe(false);
    expect('mineLevel' in save.unlocked).toBe(false);
    expect(save.unlocked).toEqual({ recipes: [], shops: ['seedShop'] });
  });
});
