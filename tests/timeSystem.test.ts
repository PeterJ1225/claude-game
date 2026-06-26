import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import { DAY_START_MINUTE } from '../src/config/constants';
import type { FarmSystem } from '../src/systems/FarmSystem';
import type { CropSystem } from '../src/systems/CropSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';

const farm = (): FarmSystem => ServiceLocator.get<FarmSystem>(SYS.farm);
const crop = (): CropSystem => ServiceLocator.get<CropSystem>(SYS.crop);
const time = (): TimeSystem => ServiceLocator.get<TimeSystem>(SYS.time);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(42);
  setupSystems();
});

describe('TimeSystem 过夜结算流水线（SPEC 4.5）', () => {
  it('步1：minute 重置到 06:00、day++', () => {
    GameState.data.time.minute = 1000;
    time().processNewDay();
    expect(GameState.data.time.minute).toBe(DAY_START_MINUTE);
    expect(GameState.data.time.day).toBe(2);
  });

  it('步4–6 顺序：浇过水的作物推进 1 阶段、然后 watered 被重置', () => {
    farm().till(2, 2);
    crop().plant(2, 2, 'parsnip_seeds');
    farm().water(2, 2);
    time().processNewDay();
    expect(GameState.data.farm.tiles['2,2'].crop?.stage).toBe(1);
    expect(GameState.data.farm.tiles['2,2'].watered).toBe(false);
  });

  it('步2：出货箱过夜结算入金币并清空', () => {
    const gold0 = GameState.data.player.gold;
    GameState.data.shippingBin.push({ itemId: 'parsnip', qty: 2 }); // 35×2
    time().processNewDay();
    expect(GameState.data.player.gold).toBe(gold0 + 70);
    expect(GameState.data.shippingBin).toHaveLength(0);
  });

  it('步3：换季清除非当季作物', () => {
    GameState.data.time.day = 28;
    farm().till(3, 3);
    crop().plant(3, 3, 'parsnip_seeds');
    time().processNewDay();
    expect(GameState.data.time.season).toBe('summer');
    expect(GameState.data.farm.tiles['3,3'].crop).toBeUndefined();
  });

  it('步3：换季清除非再生的非当季作物，再生作物豁免保留（SPEC 4.5 步3）', () => {
    GameState.data.time.day = 28;
    farm().till(2, 2);
    crop().plant(2, 2, 'parsnip_seeds'); // 非再生
    farm().till(3, 3);
    crop().plant(3, 3, 'greenbean_seeds'); // 再生
    time().processNewDay(); // → 夏季
    expect(GameState.data.time.season).toBe('summer');
    expect(GameState.data.farm.tiles['2,2'].crop).toBeUndefined();
    expect(GameState.data.farm.tiles['3,3'].crop).toBeDefined();
  });

  it('步8：正常睡觉恢复满体力与满血', () => {
    GameState.data.player.energy = 10;
    GameState.data.player.hp = 30;
    time().processNewDay('normal');
    expect(GameState.data.player.energy).toBe(GameState.data.player.maxEnergy);
    expect(GameState.data.player.hp).toBe(GameState.data.player.maxHp);
  });

  it('步4：次日天气用持久化 rng 掷定，确定可复现', () => {
    time().processNewDay();
    const w1 = GameState.data.time.tomorrowWeather;
    GameState.newGame(42);
    setupSystems();
    time().processNewDay();
    expect(GameState.data.time.tomorrowWeather).toBe(w1);
  });

  it('步8：farm 晕倒/熬夜次日扣 min(gold×0.1,100)（SPEC 附录A）', () => {
    GameState.data.player.gold = 1000;
    time().processNewDay('farm');
    expect(GameState.data.player.gold).toBe(900); // min(100,100)
    expect(GameState.data.player.energy).toBe(GameState.data.player.maxEnergy);
  });

  it('正常睡觉不扣钱', () => {
    GameState.data.player.gold = 1000;
    time().processNewDay('normal');
    expect(GameState.data.player.gold).toBe(1000);
  });
});

describe('新游戏 tomorrowWeather 由种子决定', () => {
  it('同种子相同、不同种子可不同', () => {
    GameState.newGame(7);
    const a = GameState.data.time.tomorrowWeather;
    GameState.newGame(7);
    expect(GameState.data.time.tomorrowWeather).toBe(a);
  });
});
