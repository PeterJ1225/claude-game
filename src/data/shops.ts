// 商店定义（数据驱动，SPEC 6.6）。买入价由 ShopStockEntry.price 定义。
import type { ShopDef } from '../types';

export const SHOPS: ShopDef[] = [
  {
    id: 'seedShop',
    name: '种子店',
    openHours: [9 * 60, 17 * 60],
    stock: [
      { itemId: 'parsnip_seeds', price: 20, seasons: ['spring'] },
      { itemId: 'greenbean_seeds', price: 60, seasons: ['spring'] },
    ],
  },
];

const SHOP_MAP = new Map(SHOPS.map((s) => [s.id, s]));

export function getShop(id: string): ShopDef {
  const s = SHOP_MAP.get(id);
  if (!s) throw new Error(`未知商店: ${id}`);
  return s;
}
