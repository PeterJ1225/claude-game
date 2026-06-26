import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import { BrowserStorage, type StorageLike } from '../src/save/SaveStorage';
import { SaveSystem, DEFAULT_SLOT } from '../src/save/SaveSystem';
import type { FarmSystem } from '../src/systems/FarmSystem';
import type { CropSystem } from '../src/systems/CropSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';
import type { InventorySystem } from '../src/systems/InventorySystem';

function mem(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(2024);
  setupSystems();
});

describe('M1 完整循环（DoD）：种→浇→4 夜成熟→收获→存档→读档状态一致', () => {
  it('跑通核心循环并验证存读档后 time/inventory/farm 字段完全一致', async () => {
    const farm = ServiceLocator.get<FarmSystem>(SYS.farm);
    const crop = ServiceLocator.get<CropSystem>(SYS.crop);
    const time = ServiceLocator.get<TimeSystem>(SYS.time);
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);

    farm.till(10, 10);
    expect(crop.plant(10, 10, 'parsnip_seeds')).toBe(true);
    for (let d = 0; d < 4; d++) {
      expect(farm.water(10, 10)).toBe(true);
      time.processNewDay();
    }
    expect(crop.isMatureAt(10, 10)).toBe(true);
    expect(crop.harvest(10, 10)).toBe(true);
    expect(inv.count('parsnip')).toBe(1);
    expect(GameState.data.time.day).toBe(5);

    // 手动存档
    const storage = new BrowserStorage(mem());
    await new SaveSystem(storage).save();
    const savedJson = await storage.load(DEFAULT_SLOT);
    expect(savedJson).not.toBeNull();

    // 「关闭再开」：换成不同的内存态，再从同一存储读档
    GameState.newGame(1);
    expect(GameState.data.time.day).toBe(1);
    expect(await new SaveSystem(storage).load()).toBe(true);

    // 读档后状态与存档时序列化一致
    expect(JSON.stringify(GameState.data)).toBe(savedJson);
    expect(GameState.data.time.day).toBe(5);
    expect(GameState.data.inventory.some((s) => s?.itemId === 'parsnip')).toBe(true);
  });
});
