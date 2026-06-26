// 库存系统（SPEC 4.6 owner: inventory / hotbarSelectedIndex）。暴露受控同步方法。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { HOTBAR_SIZE } from '../config/constants';
import { getItem } from '../data/items';
import type { InventorySlot } from '../types';

export class InventorySystem {
  private get inv(): (InventorySlot | null)[] {
    return GameState.data.inventory;
  }

  // 受控同步方法：加物品，返回实际加入数量与放不下的溢出
  addItem(itemId: string, qty: number): { added: number; overflow: number } {
    const def = getItem(itemId);
    const inv = this.inv;
    let remaining = qty;
    if (def.stackable) {
      for (let i = 0; i < inv.length && remaining > 0; i++) {
        const slot = inv[i];
        if (slot && slot.itemId === itemId && slot.qty < def.maxStack) {
          const add = Math.min(remaining, def.maxStack - slot.qty);
          slot.qty += add;
          remaining -= add;
        }
      }
    }
    for (let i = 0; i < inv.length && remaining > 0; i++) {
      if (!inv[i]) {
        const add = def.stackable ? Math.min(remaining, def.maxStack) : 1;
        inv[i] = { itemId, qty: add };
        remaining -= add;
      }
    }
    const added = qty - remaining;
    if (added > 0) EventBus.emit('inventory:changed', {});
    return { added, overflow: remaining };
  }

  removeItem(itemId: string, qty: number): boolean {
    const inv = this.inv;
    if (this.count(itemId) < qty) return false;
    let remaining = qty;
    for (let i = 0; i < inv.length && remaining > 0; i++) {
      const slot = inv[i];
      if (slot && slot.itemId === itemId) {
        const take = Math.min(remaining, slot.qty);
        slot.qty -= take;
        remaining -= take;
        if (slot.qty === 0) inv[i] = null;
      }
    }
    EventBus.emit('inventory:changed', {});
    return true;
  }

  hasSpaceFor(itemId: string, qty: number): boolean {
    const def = getItem(itemId);
    let remaining = qty;
    const inv = this.inv;
    if (def.stackable) {
      for (const slot of inv) {
        if (slot && slot.itemId === itemId) remaining -= def.maxStack - slot.qty;
        if (remaining <= 0) return true;
      }
    }
    for (const slot of inv) {
      if (!slot) remaining -= def.stackable ? def.maxStack : 1;
      if (remaining <= 0) return true;
    }
    return remaining <= 0;
  }

  count(itemId: string): number {
    let n = 0;
    for (const slot of this.inv) if (slot && slot.itemId === itemId) n += slot.qty;
    return n;
  }

  // 快捷栏（= inventory 前 12 格视图）
  selectedSlot(): InventorySlot | null {
    return this.inv[GameState.data.player.hotbarSelectedIndex] ?? null;
  }

  setSelectedIndex(i: number): void {
    GameState.data.player.hotbarSelectedIndex = ((i % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
    EventBus.emit('inventory:changed', {});
  }

  // 消耗当前选中格 1 个（如播种用掉 1 颗种子）
  consumeSelectedOne(): void {
    const idx = GameState.data.player.hotbarSelectedIndex;
    const slot = this.inv[idx];
    if (!slot) return;
    slot.qty -= 1;
    if (slot.qty <= 0) this.inv[idx] = null;
    EventBus.emit('inventory:changed', {});
  }
}
