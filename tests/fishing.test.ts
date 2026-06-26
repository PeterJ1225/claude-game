import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import type { FishingSystem } from '../src/systems/FishingSystem';

const fishing = (): FishingSystem => ServiceLocator.get<FishingSystem>(SYS.fishing);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(42);
  setupSystems();
});

describe('M6 钓鱼可用性筛选', () => {
  it('按地点过滤：非 beach 地点钓不到鱼', () => {
    GameState.data.time.season = 'summer';
    GameState.data.time.weather = 'sunny';
    GameState.data.time.minute = 13 * 60;
    expect(fishing().availableFish('river')).toEqual([]);
    expect(fishing().availableFish('beach').length).toBeGreaterThan(0);
  });

  it('按时段过滤：超出 timeRange 的鱼不出现', () => {
    GameState.data.time.season = 'summer';
    GameState.data.time.weather = 'sunny';
    GameState.data.time.minute = 13 * 60; // 河豚窗口内 12:00–16:00
    const noon = fishing().availableFish('beach').map((f) => f.id);
    expect(noon).toContain('pufferfish');

    GameState.data.time.minute = 20 * 60; // 河豚窗口外
    const night = fishing().availableFish('beach').map((f) => f.id);
    expect(night).not.toContain('pufferfish');
  });

  it('按季节+天气过滤：河豚只在夏天晴天', () => {
    GameState.data.time.minute = 13 * 60;
    GameState.data.time.season = 'summer';
    GameState.data.time.weather = 'rain';
    expect(fishing().availableFish('beach').map((f) => f.id)).not.toContain('pufferfish');
    GameState.data.time.weather = 'sunny';
    expect(fishing().availableFish('beach').map((f) => f.id)).toContain('pufferfish');
    GameState.data.time.season = 'winter';
    expect(fishing().availableFish('beach').map((f) => f.id)).not.toContain('pufferfish');
  });

  it('鱼池为空时 rollFish 返回 null，否则返回池中之一', () => {
    GameState.data.time.season = 'summer';
    GameState.data.time.weather = 'sunny';
    GameState.data.time.minute = 20 * 60; // 夏夜 20:00：沙丁/金枪过点、凤尾非夏季、河豚过窗 → 无鱼
    expect(fishing().availableFish('beach')).toEqual([]);
    expect(fishing().rollFish('beach')).toBeNull();

    GameState.data.time.minute = 13 * 60;
    const pool = new Set(fishing().availableFish('beach').map((f) => f.id));
    const rolled = fishing().rollFish('beach');
    expect(rolled).not.toBeNull();
    expect(pool.has(rolled!.id)).toBe(true);
  });
});
