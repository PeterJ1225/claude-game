// 作物定义（数据驱动，SPEC 6.1）。生长/再生语义见 SPEC 6.1。冬季无作物（换季全清）。
import type { CropDef } from '../types';

export const CROPS: CropDef[] = [
  // 春
  { id: 'parsnip', name: '防风草', seedItemId: 'parsnip_seeds', produceItemId: 'parsnip', seasons: ['spring'], growthStages: [1, 1, 1, 1], spriteKey: 'crop_parsnip', yieldMin: 1, yieldMax: 1 },
  { id: 'green_bean', name: '青豆', seedItemId: 'greenbean_seeds', produceItemId: 'green_bean', seasons: ['spring'], growthStages: [1, 2, 2, 2], regrowDays: 3, spriteKey: 'crop_greenbean', yieldMin: 1, yieldMax: 1 },
  // 夏
  { id: 'tomato', name: '番茄', seedItemId: 'tomato_seeds', produceItemId: 'tomato', seasons: ['summer'], growthStages: [1, 2, 2, 2], regrowDays: 4, spriteKey: 'crop_tomato', yieldMin: 1, yieldMax: 1 },
  { id: 'melon', name: '甜瓜', seedItemId: 'melon_seeds', produceItemId: 'melon', seasons: ['summer'], growthStages: [2, 2, 3, 3], spriteKey: 'crop_melon', yieldMin: 1, yieldMax: 1 },
  // 秋
  { id: 'pumpkin', name: '南瓜', seedItemId: 'pumpkin_seeds', produceItemId: 'pumpkin', seasons: ['fall'], growthStages: [2, 3, 3, 3], spriteKey: 'crop_pumpkin', yieldMin: 1, yieldMax: 1 },
  // 夏秋
  { id: 'corn', name: '玉米', seedItemId: 'corn_seeds', produceItemId: 'corn', seasons: ['summer', 'fall'], growthStages: [2, 2, 2, 2], regrowDays: 4, spriteKey: 'crop_corn', yieldMin: 1, yieldMax: 1 },
];

const CROP_MAP = new Map(CROPS.map((c) => [c.id, c]));
const CROP_BY_SEED = new Map(CROPS.map((c) => [c.seedItemId, c]));

export function getCrop(id: string): CropDef {
  const c = CROP_MAP.get(id);
  if (!c) throw new Error(`未知作物: ${id}`);
  return c;
}

export function getCropBySeed(seedItemId: string): CropDef | undefined {
  return CROP_BY_SEED.get(seedItemId);
}
