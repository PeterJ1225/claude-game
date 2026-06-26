// 经济系统（SPEC 4.6 owner: player.gold / shippingBin / unlocked.shops）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { getItem } from '../data/items';
import { SYS } from './keys';
import {
  FAINT_GOLD_PENALTY_CAP_FARM,
  FAINT_GOLD_PENALTY_CAP_MINE,
  FAINT_GOLD_PENALTY_RATE,
} from '../config/balance';
import type { InventorySystem } from './InventorySystem';

export class EconomySystem {
  addGold(amount: number): void {
    const p = GameState.data.player;
    p.gold += amount;
    EventBus.emit('economy:goldChanged', { gold: p.gold, delta: amount });
  }

  trySpend(amount: number): boolean {
    const p = GameState.data.player;
    if (p.gold < amount) return false;
    p.gold -= amount;
    EventBus.emit('economy:goldChanged', { gold: p.gold, delta: -amount });
    return true;
  }

  // 晕倒/熬夜金钱惩罚（SPEC 附录 A）：扣 min(gold×0.1, 上限)
  applyFaintPenalty(context: 'farm' | 'mine'): void {
    const p = GameState.data.player;
    const cap = context === 'mine' ? FAINT_GOLD_PENALTY_CAP_MINE : FAINT_GOLD_PENALTY_CAP_FARM;
    const penalty = Math.min(Math.floor(p.gold * FAINT_GOLD_PENALTY_RATE), cap);
    if (penalty > 0) {
      p.gold -= penalty;
      EventBus.emit('economy:goldChanged', { gold: p.gold, delta: -penalty });
    }
  }

  // 从商店买入：金币足且背包放得下才成交（受控同步方法）
  buyItem(itemId: string, price: number, qty = 1): boolean {
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    if (!inv.hasSpaceFor(itemId, qty)) return false; // 先确认放得下，再扣款
    if (!this.trySpend(price * qty)) return false;
    inv.addItem(itemId, qty);
    return true;
  }

  // 放入出货箱（owner: shippingBin），过夜流水线第 2 步结算
  addToShippingBin(itemId: string, qty: number): void {
    GameState.data.shippingBin.push({ itemId, qty });
  }

  // 过夜结算方法（SPEC 4.5 步 2）：总额 = Σ qty × ItemDef.sellPrice
  settleShippingBin(): void {
    const bin = GameState.data.shippingBin;
    if (bin.length === 0) return;
    let total = 0;
    for (const slot of bin) total += getItem(slot.itemId).sellPrice * slot.qty;
    GameState.data.shippingBin = [];
    if (total > 0) this.addGold(total);
  }
}
