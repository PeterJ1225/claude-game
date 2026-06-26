// 作物定义（数据驱动，SPEC 6.1）。生长/再生语义见 SPEC 6.1。
import type { CropDef } from '../types';

export const CROPS: CropDef[] = [
  {
    id: 'parsnip',
    name: '防风草',
    seedItemId: 'parsnip_seeds',
    produceItemId: 'parsnip',
    seasons: ['spring'],
    growthStages: [1, 1, 1, 1], // 4 个浇水日成熟，一次性
    spriteKey: 'crop_parsnip',
    yieldMin: 1,
    yieldMax: 1,
  },
  {
    id: 'green_bean',
    name: '青豆',
    seedItemId: 'greenbean_seeds',
    produceItemId: 'green_bean',
    seasons: ['spring'],
    growthStages: [1, 2, 2, 2], // 7 个浇水日成熟
    regrowDays: 3, // 之后每 3 个浇水日再收一次
    spriteKey: 'crop_greenbean',
    yieldMin: 1,
    yieldMax: 1,
  },
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
