import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { FarmSystem } from '../src/systems/FarmSystem';
import type { CropSystem } from '../src/systems/CropSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';
import type { InventorySystem } from '../src/systems/InventorySystem';

const farm = (): FarmSystem => ServiceLocator.get<FarmSystem>(SYS.farm);
const crop = (): CropSystem => ServiceLocator.get<CropSystem>(SYS.crop);
const time = (): TimeSystem => ServiceLocator.get<TimeSystem>(SYS.time);
const inv = (): InventorySystem => ServiceLocator.get<InventorySystem>(SYS.inventory);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(123);
  setupSystems();
});

describe('CropSystem 种植与生长（SPEC 6.1）', () => {
  it('未翻地不能种；翻地后能种当季作物，且不能重复种', () => {
    expect(crop().plant(5, 5, 'parsnip_seeds')).toBe(false);
    expect(farm().till(5, 5)).toBe(true);
    expect(crop().plant(5, 5, 'parsnip_seeds')).toBe(true);
    expect(crop().plant(5, 5, 'parsnip_seeds')).toBe(false);
  });

  it('防风草浇水 4 个过夜成熟、收获入背包、一次性作物消失', () => {
    farm().till(5, 5);
    crop().plant(5, 5, 'parsnip_seeds');
    for (let d = 0; d < 4; d++) {
      expect(farm().water(5, 5)).toBe(true);
      time().processNewDay();
    }
    expect(crop().isMatureAt(5, 5)).toBe(true);
    const before = inv().count('parsnip');
    expect(crop().harvest(5, 5)).toBe(true);
    expect(inv().count('parsnip')).toBe(before + 1);
    expect(GameState.data.farm.tiles['5,5'].crop).toBeUndefined();
  });

  it('不浇水不生长', () => {
    farm().till(6, 6);
    crop().plant(6, 6, 'parsnip_seeds');
    time().processNewDay();
    expect(GameState.data.farm.tiles['6,6'].crop?.stage).toBe(0);
  });

  it('再生作物收获后按 regrowDays 再次成熟、作物保留', () => {
    farm().till(7, 7);
    crop().plant(7, 7, 'greenbean_seeds'); // [1,2,2,2] regrow 3
    for (let i = 0; i < 7; i++) {
      farm().water(7, 7);
      time().processNewDay();
    }
    expect(crop().isMatureAt(7, 7)).toBe(true);
    expect(crop().harvest(7, 7)).toBe(true);
    expect(crop().isMatureAt(7, 7)).toBe(false);
    for (let i = 0; i < 3; i++) {
      farm().water(7, 7);
      time().processNewDay();
    }
    expect(crop().isMatureAt(7, 7)).toBe(true);
    expect(GameState.data.farm.tiles['7,7'].crop).toBeDefined();
  });
});
