// 物品定义（数据驱动，SPEC 6.2）。售价唯一真相源在此。
import type { ItemDef } from '../types';

export const ITEMS: ItemDef[] = [
  // 工具：作为不可堆叠物品占背包格；实际档位查 player.tools（itemId 与 ToolType 同名）
  { id: 'hoe', name: '锄头', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_hoe', description: '翻地。升级后作用范围更大。' },
  { id: 'wateringCan', name: '水壶', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_can', description: '浇水。升级后容量更大、范围更广。' },
  { id: 'pickaxe', name: '镐', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_pick', description: '采矿、碎石。' },
  { id: 'axe', name: '斧', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_axe', description: '砍树。' },
  { id: 'sword', name: '剑', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_sword', description: '矿洞战斗武器。' },
  { id: 'fishingRod', name: '钓竿', category: 'tool', sellPrice: 0, stackable: false, maxStack: 1, iconKey: 'icon_rod', description: '在水边钓鱼。' },

  // 鱼
  { id: 'sardine', name: '沙丁鱼', category: 'fish', sellPrice: 40, stackable: true, maxStack: 999, iconKey: 'icon_sardine', description: '常见小鱼。' },
  { id: 'anchovy', name: '凤尾鱼', category: 'fish', sellPrice: 30, stackable: true, maxStack: 999, iconKey: 'icon_anchovy', description: '细长小鱼。' },
  { id: 'tuna', name: '金枪鱼', category: 'fish', sellPrice: 100, stackable: true, maxStack: 999, iconKey: 'icon_tuna', description: '大型海鱼。' },
  { id: 'pufferfish', name: '河豚', category: 'fish', sellPrice: 200, stackable: true, maxStack: 999, iconKey: 'icon_puffer', description: '稀有且难钓。' },

  // 种子
  { id: 'parsnip_seeds', name: '防风草种子', category: 'seed', sellPrice: 10, stackable: true, maxStack: 999, iconKey: 'icon_seed_parsnip', description: '春季，4 天成熟。' },
  { id: 'greenbean_seeds', name: '青豆种子', category: 'seed', sellPrice: 30, stackable: true, maxStack: 999, iconKey: 'icon_seed_greenbean', description: '春季，多次收获。' },
  { id: 'tomato_seeds', name: '番茄种子', category: 'seed', sellPrice: 25, stackable: true, maxStack: 999, iconKey: 'icon_seed_tomato', description: '夏季，多次收获。' },
  { id: 'melon_seeds', name: '甜瓜种子', category: 'seed', sellPrice: 40, stackable: true, maxStack: 999, iconKey: 'icon_seed_melon', description: '夏季，高价值。' },
  { id: 'pumpkin_seeds', name: '南瓜种子', category: 'seed', sellPrice: 50, stackable: true, maxStack: 999, iconKey: 'icon_seed_pumpkin', description: '秋季，高价值。' },
  { id: 'corn_seeds', name: '玉米种子', category: 'seed', sellPrice: 75, stackable: true, maxStack: 999, iconKey: 'icon_seed_corn', description: '夏秋，多次收获。' },

  // 产出
  { id: 'parsnip', name: '防风草', category: 'crop', sellPrice: 35, stackable: true, maxStack: 999, iconKey: 'icon_parsnip', description: '春季根菜。' },
  { id: 'green_bean', name: '青豆', category: 'crop', sellPrice: 40, stackable: true, maxStack: 999, iconKey: 'icon_greenbean', description: '可多次收获。' },
  { id: 'tomato', name: '番茄', category: 'crop', sellPrice: 60, stackable: true, maxStack: 999, iconKey: 'icon_tomato', description: '夏季作物。' },
  { id: 'melon', name: '甜瓜', category: 'crop', sellPrice: 250, stackable: true, maxStack: 999, iconKey: 'icon_melon', description: '夏季高价值作物。' },
  { id: 'pumpkin', name: '南瓜', category: 'crop', sellPrice: 320, stackable: true, maxStack: 999, iconKey: 'icon_pumpkin', description: '秋季高价值作物。' },
  { id: 'corn', name: '玉米', category: 'crop', sellPrice: 50, stackable: true, maxStack: 999, iconKey: 'icon_corn', description: '夏秋多次收获。' },

  // 矿石/材料（M3 工具升级用；M5 起由采矿掉落，M3 由商店/调试给予）
  { id: 'stone', name: '石头', category: 'material', sellPrice: 2, stackable: true, maxStack: 999, iconKey: 'icon_stone', description: '采矿副产。' },
  { id: 'coal', name: '煤炭', category: 'material', sellPrice: 15, stackable: true, maxStack: 999, iconKey: 'icon_coal', description: '燃料/材料。' },
  { id: 'copper_ore', name: '铜矿', category: 'ore', sellPrice: 5, stackable: true, maxStack: 999, iconKey: 'icon_copper', description: '工具升级材料。' },
  { id: 'iron_ore', name: '铁矿', category: 'ore', sellPrice: 10, stackable: true, maxStack: 999, iconKey: 'icon_iron', description: '工具升级材料。' },
  { id: 'gold_ore', name: '金矿', category: 'ore', sellPrice: 25, stackable: true, maxStack: 999, iconKey: 'icon_gold', description: '工具升级材料。' },
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
