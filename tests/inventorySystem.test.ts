import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { InventorySystem } from '../src/systems/InventorySystem';

const inv = (): InventorySystem => ServiceLocator.get<InventorySystem>(SYS.inventory);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(1);
  setupSystems();
  GameState.data.inventory.fill(null); // 清空便于测试
});

describe('InventorySystem', () => {
  it('addItem 堆叠到同类格、溢出到空格', () => {
    expect(inv().addItem('parsnip', 5)).toEqual({ added: 5, overflow: 0 });
    inv().addItem('parsnip', 3);
    expect(inv().count('parsnip')).toBe(8);
  });

  it('removeItem 跨格扣减、不足返回 false', () => {
    inv().addItem('parsnip', 10);
    expect(inv().removeItem('parsnip', 4)).toBe(true);
    expect(inv().count('parsnip')).toBe(6);
    expect(inv().removeItem('parsnip', 100)).toBe(false);
    expect(inv().count('parsnip')).toBe(6);
  });

  it('hasSpaceFor：满背包放不下', () => {
    for (let i = 0; i < GameState.data.inventory.length; i++) {
      GameState.data.inventory[i] = { itemId: 'hoe', qty: 1 };
    }
    expect(inv().hasSpaceFor('parsnip', 1)).toBe(false);
  });

  it('快捷栏选择下标环绕 0–11', () => {
    inv().addItem('parsnip_seeds', 1);
    inv().setSelectedIndex(0);
    expect(inv().selectedSlot()?.itemId).toBe('parsnip_seeds');
    inv().setSelectedIndex(13);
    expect(GameState.data.player.hotbarSelectedIndex).toBe(1);
  });
});
