import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { ToolSystem } from '../src/systems/ToolSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';
import type { InventorySystem } from '../src/systems/InventorySystem';
import type { InteractionSystem } from '../src/systems/InteractionSystem';
import type { FarmSystem } from '../src/systems/FarmSystem';

const tool = (): ToolSystem => ServiceLocator.get<ToolSystem>(SYS.tool);
const time = (): TimeSystem => ServiceLocator.get<TimeSystem>(SYS.time);
const inv = (): InventorySystem => ServiceLocator.get<InventorySystem>(SYS.inventory);
const interaction = (): InteractionSystem => ServiceLocator.get<InteractionSystem>(SYS.interaction);
const farm = (): FarmSystem => ServiceLocator.get<FarmSystem>(SYS.farm);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(1);
  setupSystems();
});

describe('M3 工具升级（铁匠）', () => {
  it('升级：扣钱 + 收走工具入队列，2 天后归还升级档', () => {
    GameState.data.player.gold = 1000;
    expect(tool().startUpgrade('hoe')).toBe(true); // basic→copper, 500 金
    expect(GameState.data.player.gold).toBe(500);
    expect(inv().count('hoe')).toBe(0);
    expect(GameState.data.toolUpgrades).toHaveLength(1);

    time().processNewDay();
    expect(GameState.data.player.tools.hoe).toBe('basic'); // 第1天未完成

    time().processNewDay();
    expect(GameState.data.player.tools.hoe).toBe('copper'); // 第2天完成
    expect(inv().count('hoe')).toBe(1); // 工具归还
    expect(GameState.data.toolUpgrades).toHaveLength(0);
  });

  it('金币不足无法升级、工具仍在', () => {
    GameState.data.player.gold = 100;
    expect(tool().startUpgrade('hoe')).toBe(false);
    expect(inv().count('hoe')).toBe(1);
  });

  it('升级归还时背包满则保留待下次、不丢工具', () => {
    GameState.data.player.gold = 1000;
    tool().startUpgrade('hoe');
    GameState.data.inventory.fill({ itemId: 'parsnip', qty: 1 }); // 塞满
    time().processNewDay();
    time().processNewDay(); // 本应完成，但背包满
    expect(GameState.data.player.tools.hoe).toBe('basic');
    expect(GameState.data.toolUpgrades).toHaveLength(1);
    GameState.data.inventory[0] = null; // 腾出空位
    time().processNewDay();
    expect(GameState.data.player.tools.hoe).toBe('copper');
    expect(GameState.data.toolUpgrades).toHaveLength(0);
  });

  it('升级后工具作用范围扩大（朝向直线）', () => {
    GameState.data.player.tools.hoe = 'iron'; // 长度 5
    GameState.data.player.hotbarSelectedIndex = 0; // 第 0 格是锄头
    interaction().useSelectedOn(5, 5, 'right');
    for (let i = 0; i < 5; i++) {
      expect(farm().getTile(5 + i, 5)?.tilled).toBe(true);
    }
    expect(farm().getTile(10, 5)).toBeUndefined(); // 第 6 格未翻
  });
});
