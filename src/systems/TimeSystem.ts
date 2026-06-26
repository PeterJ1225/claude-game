// 时间系统（SPEC 4.6 owner: time.*）+ 过夜结算流水线编排者（SPEC 4.5）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { RandomService } from '../core/RandomService';
import { DAY_END_MINUTE, DAY_START_MINUTE, MINUTES_PER_TICK, MS_PER_TICK } from '../config/constants';
import { pickWeather } from './weather';
import { isNewWeek } from '../utils/time';
import { SYS } from './keys';
import type { Season, Weather } from '../types';
import type { EconomySystem } from './EconomySystem';
import type { CropSystem } from './CropSystem';
import type { FarmSystem } from './FarmSystem';
import type { ToolSystem } from './ToolSystem';
import type { EnergySystem } from './EnergySystem';
import type { RelationshipSystem } from './RelationshipSystem';
import type { NPCSystem } from './NPCSystem';

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

export class TimeSystem {
  private acc = 0;
  private paused = false;

  setPaused(p: boolean): void {
    this.paused = p;
  }

  isPastEndOfDay(): boolean {
    return GameState.data.time.minute >= DAY_END_MINUTE;
  }

  // 由玩法场景每帧调用，按真实毫秒推进游戏分钟（步长 10 分钟）。
  update(deltaMs: number): void {
    if (this.paused) return;
    const t = GameState.data.time;
    if (t.minute >= DAY_END_MINUTE) return;
    this.acc += deltaMs;
    while (this.acc >= MS_PER_TICK) {
      this.acc -= MS_PER_TICK;
      t.minute += MINUTES_PER_TICK;
      EventBus.emit('time:tick', { minute: t.minute });
      if (t.minute % 60 === 0) EventBus.emit('time:hourTick', { hour: Math.floor(t.minute / 60) });
      if (t.minute >= DAY_END_MINUTE) {
        t.minute = DAY_END_MINUTE;
        break;
      }
    }
  }

  // 过夜结算流水线（SPEC 4.5，步 1–10；步 11 自动存档由睡觉编排者随后 await 完成）。
  // 编排者只写 time.*，其余每步调用对应 owner 的编排期结算方法。
  processNewDay(faintContext: 'normal' | 'farm' = 'normal'): void {
    const t = GameState.data.time;
    // 1 推进日期与时刻
    t.minute = DAY_START_MINUTE;
    t.day += 1;
    let changedSeason = false;
    if (t.day > 28) {
      t.day = 1;
      const idx = SEASONS.indexOf(t.season);
      if (idx === SEASONS.length - 1) {
        t.season = SEASONS[0];
        t.year += 1;
      } else {
        t.season = SEASONS[idx + 1];
      }
      changedSeason = true;
    }
    this.acc = 0;
    // 2 出货箱结算
    ServiceLocator.get<EconomySystem>(SYS.economy).settleShippingBin();
    // 3 换季清苗
    if (changedSeason) ServiceLocator.get<CropSystem>(SYS.crop).clearOutOfSeasonCrops(t.season);
    // 4 掷次日天气（M1 无节日，故无节日强制晴覆盖）
    t.weather = t.tomorrowWeather;
    t.tomorrowWeather = this.rollWeather(t.season);
    // 5 降水自动浇水
    if (t.weather === 'rain' || t.weather === 'storm') {
      ServiceLocator.get<FarmSystem>(SYS.farm).waterAllTiles();
    }
    // 6 作物生长 + 重置 watered
    ServiceLocator.get<CropSystem>(SYS.crop).growOvernight();
    ServiceLocator.get<FarmSystem>(SYS.farm).resetWatered();
    // 7 工具在途升级
    ServiceLocator.get<ToolSystem>(SYS.tool).tickUpgrades();
    // 8 体力/生命 + 熬夜晕倒金钱惩罚（矿洞 HP=0 晕倒走 MineScene 即时路径，不经此处）
    ServiceLocator.get<EnergySystem>(SYS.energy).restoreOnSleep();
    if (faintContext === 'farm') {
      ServiceLocator.get<EconomySystem>(SYS.economy).applyFaintPenalty('farm');
    }
    // 9 每日/每周重置 + NPC 日程
    ServiceLocator.get<RelationshipSystem>(SYS.relationship).dailyReset(isNewWeek(t.day));
    ServiceLocator.get<NPCSystem>(SYS.npc).resetDailySchedule();
    // 10 广播通知事件（仅供 UI/音频，禁写 GameState）
    EventBus.emit('time:newDay', { year: t.year, season: t.season, day: t.day });
    if (changedSeason) EventBus.emit('time:newSeason', { season: t.season });
    EventBus.emit('weather:changed', { weather: t.weather });
  }

  private rollWeather(season: Season): Weather {
    return pickWeather(season, RandomService.next());
  }
}
