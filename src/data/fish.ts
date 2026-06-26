// 鱼类定义（数据驱动，SPEC 6.5）。按季节/地点/天气/时段出现。
import type { FishDef } from '../types';

export const FISH: FishDef[] = [
  { id: 'sardine', name: '沙丁鱼', itemId: 'sardine', seasons: ['spring', 'summer', 'fall', 'winter'], weather: ['any'], locations: ['beach'], timeRange: [6 * 60, 19 * 60], difficulty: 30 },
  { id: 'anchovy', name: '凤尾鱼', itemId: 'anchovy', seasons: ['spring', 'fall'], weather: ['any'], locations: ['beach'], timeRange: [6 * 60, 26 * 60], difficulty: 35 },
  { id: 'tuna', name: '金枪鱼', itemId: 'tuna', seasons: ['summer', 'winter'], weather: ['any'], locations: ['beach'], timeRange: [6 * 60, 19 * 60], difficulty: 60 },
  { id: 'pufferfish', name: '河豚', itemId: 'pufferfish', seasons: ['summer'], weather: ['sunny'], locations: ['beach'], timeRange: [12 * 60, 16 * 60], difficulty: 80 },
];

const FISH_MAP = new Map(FISH.map((f) => [f.id, f]));

export function getFish(id: string): FishDef {
  const f = FISH_MAP.get(id);
  if (!f) throw new Error(`未知鱼: ${id}`);
  return f;
}
