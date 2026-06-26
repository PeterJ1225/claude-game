// 节日定义（数据驱动，SPEC 6.8）。固定日期；当天小镇变为节日场景。
import type { FestivalDef } from '../types';

export const FESTIVALS: FestivalDef[] = [
  { id: 'spring_fair', name: '春日庆典', season: 'spring', day: 13, startTime: 9 * 60, endTime: 14 * 60, scene: 'TownFestival', description: '小镇广场的春日集市，居民们聚在一起迎接新季。' },
  { id: 'luau', name: '夏日海滩派对', season: 'summer', day: 11, startTime: 9 * 60, endTime: 14 * 60, scene: 'TownFestival', description: '夏日的欢聚，分享美食与笑声。' },
  { id: 'harvest', name: '秋收节', season: 'fall', day: 16, startTime: 9 * 60, endTime: 14 * 60, scene: 'TownFestival', description: '庆祝丰收的盛大节日。' },
  { id: 'star_night', name: '冬夜星节', season: 'winter', day: 25, startTime: 9 * 60, endTime: 14 * 60, scene: 'TownFestival', description: '冬夜的灯火与祈福，一年的尾声。' },
];

const FESTIVAL_MAP = new Map(FESTIVALS.map((f) => [f.id, f]));

export function getFestival(id: string): FestivalDef {
  const f = FESTIVAL_MAP.get(id);
  if (!f) throw new Error(`未知节日: ${id}`);
  return f;
}
