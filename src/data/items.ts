// 物品定义（数据驱动，SPEC 6.2）。售价唯一真相源在此。
import type { ItemDef } from '../types';

export const ITEMS: ItemDef[] = [
  // 工具：作为不可堆叠物品占背包格；实际档位查 player.tools（itemId 与 ToolType 同名）
  { id: 'hoe', name: '锄头', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_hoe', description: '翻地，产生可种植耕地。' },
  { id: 'wateringCan', name: '水壶', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_can', description: '给耕地浇水。' },
  { id: 'pickaxe', name: '镐', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_pick', description: '采矿、碎石。' },
  { id: 'axe', name: '斧', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_axe', description: '砍树。' },

  // 种子
  { id: 'parsnip_seeds', name: '防风草种子', category: 'seed', sellPrice: 10, stackable: true, maxStack: 999, iconKey: 'icon_seed_parsnip', description: '春季作物，4 天成熟。' },
  { id: 'greenbean_seeds', name: '青豆种子', category: 'seed', sellPrice: 30, stackable: true, maxStack: 999, iconKey: 'icon_seed_greenbean', description: '春季作物，成熟后可多次收获。' },

  // 产出
  { id: 'parsnip', name: '防风草', category: 'crop', sellPrice: 35, stackable: true, maxStack: 999, iconKey: 'icon_parsnip', description: '一种春季根菜。' },
  { id: 'green_bean', name: '青豆', category: 'crop', sellPrice: 40, stackable: true, maxStack: 999, iconKey: 'icon_greenbean', description: '可多次收获的作物。' },
];

const ITEM_MAP = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const i = ITEM_MAP.get(id);
  if (!i) throw new Error(`未知物品: ${id}`);
  return i;
}

export function hasItemDef(id: string): boolean {
  return ITEM_MAP.has(id);
}
