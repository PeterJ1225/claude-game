import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { SYS } from '../src/systems/keys';
import { getFestival } from '../src/data/festivals';
import type { FestivalSystem } from '../src/systems/FestivalSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';
import type { NPCSystem } from '../src/systems/NPCSystem';
import type { DialogSystem } from '../src/systems/DialogSystem';

const festival = (): FestivalSystem => ServiceLocator.get<FestivalSystem>(SYS.festival);
const npc = (): NPCSystem => ServiceLocator.get<NPCSystem>(SYS.npc);
const dialog = (): DialogSystem => ServiceLocator.get<DialogSystem>(SYS.dialog);

beforeEach(() => {
  ServiceLocator.reset();
  GameState.newGame(7);
  setupSystems();
});

describe('M7 节日日历', () => {
  it('节日当天 festivalToday 命中、非节日日返回 null', () => {
    GameState.data.time.season = 'spring';
    GameState.data.time.day = 13;
    expect(festival().festivalToday()?.id).toBe('spring_fair');
    GameState.data.time.day = 14;
    expect(festival().festivalToday()).toBeNull();
    GameState.data.time.season = 'summer';
    GameState.data.time.day = 11;
    expect(festival().festivalToday()?.id).toBe('luau');
  });

  it('参加标记按年份记录，跨年可重新参加', () => {
    const f = getFestival('spring_fair');
    GameState.data.time.year = 1;
    expect(festival().hasAttended(f)).toBe(false);
    festival().markAttended(f);
    expect(festival().hasAttended(f)).toBe(true);
    expect(GameState.data.flags['festival:spring_fair:1']).toBe(true);
    GameState.data.time.year = 2;
    expect(festival().hasAttended(f)).toBe(false);
  });
});

describe('M7 节日当天居民聚集到节日场景', () => {
  it('节日当天 NPC 在 TownFestival、Town 无人', () => {
    GameState.data.time.season = 'fall';
    GameState.data.time.day = 16; // 秋收节
    expect(npc().idsInScene('TownFestival').sort()).toEqual(['mira', 'sam']);
    expect(npc().idsInScene('Town')).toEqual([]);
  });

  it('非节日日 NPC 按日程在 Town', () => {
    GameState.data.time.season = 'fall';
    GameState.data.time.day = 17;
    GameState.data.time.minute = 12 * 60;
    expect(npc().idsInScene('Town').sort()).toEqual(['mira', 'sam']);
    expect(npc().idsInScene('TownFestival')).toEqual([]);
  });
});

describe('M7 节日当天强制晴（过夜流水线步4）', () => {
  it('过夜进入节日日 → 当天天气强制 sunny', () => {
    GameState.data.time.season = 'spring';
    GameState.data.time.day = 12;
    GameState.data.time.tomorrowWeather = 'rain';
    ServiceLocator.get<TimeSystem>(SYS.time).processNewDay();
    expect(GameState.data.time.day).toBe(13);
    expect(GameState.data.time.weather).toBe('sunny');
  });
});

describe('M7 更多心事件（4 心）', () => {
  it('米拉 2 心后再到 4 心触发 heart4，且只触发一次', () => {
    const rel = GameState.data.relationships['mira'];
    rel.met = true;
    rel.points = 1000; // 4 心
    GameState.data.time.season = 'summer'; // 避开 spring/rain 旁支
    GameState.data.time.weather = 'sunny';

    const n2 = dialog().pickNode('mira');
    expect(n2.id).toBe('heart2');
    dialog().consume('mira', n2);

    const n4 = dialog().pickNode('mira');
    expect(n4.id).toBe('heart4');
    dialog().consume('mira', n4);
    expect(GameState.data.flags['event:mira:2']).toBe(true);

    const after = dialog().pickNode('mira');
    expect(after.id).toBe('day'); // 心事件已消费，回落日常
  });
});
