// 交互编排者（SPEC 4.6 编排者模式）：用户动作 → 检查体力 → 改 owner 状态 → 广播。
import { ServiceLocator } from '../core/ServiceLocator';
import { GameState } from '../save/GameState';
import { getItem } from '../data/items';
import { ENERGY_COST, TOOL_AOE_LENGTH } from '../config/balance';
import { SYS } from './keys';
import type { Facing } from '../types';
import type { InventorySystem } from './InventorySystem';
import type { FarmSystem } from './FarmSystem';
import type { CropSystem } from './CropSystem';
import type { EnergySystem } from './EnergySystem';
import type { EconomySystem } from './EconomySystem';

const FACE_OFFSET: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export class InteractionSystem {
  // 主操作键：对朝向瓦片（按工具档位扩展为一条直线）使用当前手持物
  useSelectedOn(tx: number, ty: number, facing: Facing): void {
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    const slot = inv.selectedSlot();
    if (!slot) return;
    const def = getItem(slot.itemId);
    const farm = ServiceLocator.get<FarmSystem>(SYS.farm);
    const crop = ServiceLocator.get<CropSystem>(SYS.crop);
    const energy = ServiceLocator.get<EnergySystem>(SYS.energy);

    if (def.category === 'tool') {
      if (slot.itemId === 'hoe' || slot.itemId === 'wateringCan') {
        const len = TOOL_AOE_LENGTH[GameState.data.player.tools[slot.itemId]];
        const [ox, oy] = FACE_OFFSET[facing];
        let affected = false;
        for (let i = 0; i < len; i++) {
          const x = tx + ox * i;
          const y = ty + oy * i;
          const ok = slot.itemId === 'hoe' ? farm.till(x, y) : farm.water(x, y);
          if (ok) affected = true;
        }
        // 一次挥动算一次动作，只扣一次体力（SPEC 5.1 口径，避免高档工具低体力暴扣 HP）
        if (affected) energy.trySpend(slot.itemId === 'hoe' ? ENERGY_COST.hoe : ENERGY_COST.water);
      }
      // pickaxe/axe：农场无可采/可砍对象，M5+ 处理
    } else if (def.category === 'seed') {
      if (crop.plant(tx, ty, slot.itemId)) inv.consumeSelectedOne();
    }
  }

  // 交互键：对朝向瓦片做交互（收获成熟作物）。返回是否发生了交互。
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
