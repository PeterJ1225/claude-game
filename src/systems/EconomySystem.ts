// 经济系统（SPEC 4.6 owner: player.gold / shippingBin / unlocked.shops）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { getItem } from '../data/items';
import {
  FAINT_GOLD_PENALTY_CAP_FARM,
  FAINT_GOLD_PENALTY_CAP_MINE,
  FAINT_GOLD_PENALTY_RATE,
} from '../config/balance';

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
