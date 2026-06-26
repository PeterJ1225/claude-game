// 交互编排者（SPEC 4.6 编排者模式）：用户动作 → 检查体力 → 改 owner 状态 → 广播。
import { ServiceLocator } from '../core/ServiceLocator';
import { getItem } from '../data/items';
import { ENERGY_COST } from '../config/balance';
import { SYS } from './keys';
import type { InventorySystem } from './InventorySystem';
import type { FarmSystem } from './FarmSystem';
import type { CropSystem } from './CropSystem';
import type { EnergySystem } from './EnergySystem';
import type { EconomySystem } from './EconomySystem';

export class InteractionSystem {
  // 主操作键：对朝向瓦片使用当前手持物
  useSelectedOn(tx: number, ty: number): void {
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    const slot = inv.selectedSlot();
    if (!slot) return;
    const def = getItem(slot.itemId);
    const farm = ServiceLocator.get<FarmSystem>(SYS.farm);
    const crop = ServiceLocator.get<CropSystem>(SYS.crop);
    const energy = ServiceLocator.get<EnergySystem>(SYS.energy);

    if (def.category === 'tool') {
      if (slot.itemId === 'hoe') {
        if (farm.till(tx, ty)) energy.trySpend(ENERGY_COST.hoe);
      } else if (slot.itemId === 'wateringCan') {
        if (farm.water(tx, ty)) energy.trySpend(ENERGY_COST.water);
      }
      // pickaxe/axe：M1 农场无可采/可砍对象，暂为 no-op
    } else if (def.category === 'seed') {
      if (crop.plant(tx, ty, slot.itemId)) inv.consumeSelectedOne();
    }
  }

  // 交互键：对朝向瓦片做交互（M1：收获成熟作物）。返回是否发生了交互。
  interactOn(tx: number, ty: number): boolean {
    return ServiceLocator.get<CropSystem>(SYS.crop).harvest(tx, ty);
  }

  // 把当前选中格（非工具）整堆放入出货箱。返回是否成功。
  shipSelected(): boolean {
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    const slot = inv.selectedSlot();
    if (!slot) return false;
    if (getItem(slot.itemId).category === 'tool') return false;
    const itemId = slot.itemId;
    const qty = slot.qty;
    if (!inv.removeItem(itemId, qty)) return false;
    ServiceLocator.get<EconomySystem>(SYS.economy).addToShippingBin(itemId, qty);
    return true;
  }
}

