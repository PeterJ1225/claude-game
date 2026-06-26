// 节日系统（SPEC 5.11）：节日日历查询 + 参加进度（owner: flags['festival:*']，见 4.6）。
// 节日当天小镇居民聚到节日场景；参加标记按年份记 'festival:<id>:<year>'，跨年可重新参加。
import { GameState } from '../save/GameState';
import { FESTIVALS } from '../data/festivals';
import type { Season, FestivalDef } from '../types';

export class FestivalSystem {
  // 今天（按季节+日，不限时段）是否某节日
  festivalToday(): FestivalDef | null {
    const t = GameState.data.time;
    return FESTIVALS.find((f) => f.season === t.season && f.day === t.day) ?? null;
  }

  // 指定日期是否节日（供过夜流水线判「次日强制晴」）
  isFestivalOn(season: Season, day: number): boolean {
    return FESTIVALS.some((f) => f.season === season && f.day === day);
  }

  // 当前是否在节日活动时段内（用于横幅文案/氛围；进入与 NPC 聚集按整日口径）
  activeFestival(): FestivalDef | null {
    const f = this.festivalToday();
    if (!f) return null;
    const m = GameState.data.time.minute;
    return m >= f.startTime && m <= f.endTime ? f : null;
  }

  private attendedKey(f: FestivalDef): string {
    return `festival:${f.id}:${GameState.data.time.year}`;
  }

  hasAttended(f: FestivalDef): boolean {
    return GameState.data.flags[this.attendedKey(f)] === true;
  }

  markAttended(f: FestivalDef): void {
    GameState.data.flags[this.attendedKey(f)] = true;
  }
}
