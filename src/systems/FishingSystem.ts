// 钓鱼系统（SPEC 5.9/6.5）：按当前季节/天气/时段/地点筛选可钓的鱼并随机一条。
import { GameState } from '../save/GameState';
import { RandomService } from '../core/RandomService';
import { FISH } from '../data/fish';
import type { FishDef } from '../types';

export class FishingSystem {
  availableFish(location: string): FishDef[] {
    const t = GameState.data.time;
    return FISH.filter(
      (f) =>
        f.locations.includes(location) &&
        f.seasons.includes(t.season) &&
        (f.weather.includes('any') || f.weather.includes(t.weather)) &&
        t.minute >= f.timeRange[0] &&
        t.minute <= f.timeRange[1],
    );
  }

  rollFish(location: string): FishDef | null {
    const pool = this.availableFish(location);
    if (pool.length === 0) return null;
    return pool[RandomService.int(pool.length)];
  }
}
