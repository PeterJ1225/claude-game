// 商店定义（数据驱动，SPEC 6.6）。买入价由 ShopStockEntry.price。种子按季供货。
import type { ShopDef } from '../types';

export const SHOPS: ShopDef[] = [
  {
    id: 'seedShop',
    name: '种子店',
    openHours: [9 * 60, 17 * 60],
    stock: [
      { itemId: 'parsnip_seeds', price: 20, seasons: ['spring'] },
      { itemId: 'greenbean_seeds', price: 60, seasons: ['spring'] },
      { itemId: 'tomato_seeds', price: 50, seasons: ['summer'] },
      { itemId: 'melon_seeds', price: 80, seasons: ['summer'] },
      { itemId: 'corn_seeds', price: 150, seasons: ['summer', 'fall'] },
      { itemId: 'pumpkin_seeds', price: 100, seasons: ['fall'] },
    ],
  },
];

const SHOP_MAP = new Map(SHOPS.map((s) => [s.id, s]));

export function getShop(id: string): ShopDef {
  const s = SHOP_MAP.get(id);
  if (!s) throw new Error(`未知商店: ${id}`);
  return s;
}
