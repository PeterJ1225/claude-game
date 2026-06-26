import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { EconomySystem } from '../src/systems/EconomySystem';
import type { InventorySystem } from '../src/systems/InventorySystem';
import type { TimeSystem } from '../src/systems/TimeSystem';
import type { InteractionSystem } from '../src/systems/InteractionSystem';

const econ = (): EconomySystem => ServiceLocator.get<EconomySystem>(SYS.economy);
const inv = (): InventorySystem => ServiceLocator.get<InventorySystem>(SYS.inventory);
const time = (): TimeSystem => ServiceLocator.get<TimeSystem>(SYS.time);
const interaction = (): InteractionSystem => ServiceLocator.get<InteractionSystem>(SYS.interaction);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(1);
  setupSystems();
});

describe('M2 经济：买种 / 出货箱卖出 / 跨天结算', () => {
  it('买种子扣金币、入背包；金币不足则失败', () => {
    GameState.data.player.gold = 100;
    expect(econ().buyItem('parsnip_seeds', 20)).toBe(true);
    expect(GameState.data.player.gold).toBe(80);
    expect(inv().count('parsnip_seeds')).toBe(16); // 初始 15 + 买 1

    GameState.data.player.gold = 5;
    expect(econ().buyItem('parsnip_seeds', 20)).toBe(false);
    expect(GameState.data.player.gold).toBe(5);
  });

  it('出货箱：放入 → 过夜结算入金币、箱清空', () => {
    GameState.data.inventory.fill(null);
    inv().addItem('parsnip', 3); // 35×3 = 105
    GameState.data.player.hotbarSelectedIndex = 0;
    GameState.data.player.gold = 0;

    expect(interaction().shipSelected()).toBe(true);
    expect(inv().count('parsnip')).toBe(0);
    expect(GameState.data.shippingBin).toHaveLength(1);

    time().processNewDay();
    expect(GameState.data.player.gold).toBe(105);
    expect(GameState.data.shippingBin).toHaveLength(0);
  });

  it('shipSelected 拒绝出售工具', () => {
    GameState.data.inventory.fill(null);
    GameState.data.inventory[0] = { itemId: 'hoe', qty: 1 };
    GameState.data.player.hotbarSelectedIndex = 0;
    expect(interaction().shipSelected()).toBe(false);
  });
});
