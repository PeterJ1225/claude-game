// 工具系统（SPEC 4.6 owner: player.tools / toolUpgrades）。M3：铁匠升级。
import { GameState } from '../save/GameState';
import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { SYS } from './keys';
import { TOOL_TIER_ORDER, TOOL_UPGRADE_COST, TOOL_UPGRADE_DAYS } from '../config/balance';
import type { ToolTier, ToolType } from '../types';
import type { EconomySystem } from './EconomySystem';
import type { InventorySystem } from './InventorySystem';

export class ToolSystem {
  nextTier(type: ToolType): Exclude<ToolTier, 'basic'> | null {
    const cur = GameState.data.player.tools[type];
    const i = TOOL_TIER_ORDER.indexOf(cur);
    if (i < 0 || i >= TOOL_TIER_ORDER.length - 1) return null;
    return TOOL_TIER_ORDER[i + 1] as Exclude<ToolTier, 'basic'>;
  }

  upgradeCost(type: ToolType): number | null {
    const next = this.nextTier(type);
    return next ? TOOL_UPGRADE_COST[next] : null;
  }

  isUpgrading(type: ToolType): boolean {
    return GameState.data.toolUpgrades.some((u) => u.fromToolType === type);
  }

  // 开始升级：需背包里有该工具 + 足够金币。收走工具入升级队列，N 天后归还。
  startUpgrade(type: ToolType): boolean {
    const next = this.nextTier(type);
    if (!next || this.isUpgrading(type)) return false;
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    if (inv.count(type) < 1) return false;
    if (!ServiceLocator.get<EconomySystem>(SYS.economy).trySpend(TOOL_UPGRADE_COST[next])) return false;
    inv.removeItem(type, 1);
    GameState.data.toolUpgrades.push({ fromToolType: type, toTier: next, daysRemaining: TOOL_UPGRADE_DAYS });
    return true;
  }

  // 过夜结算方法（SPEC 4.5 步 7）：倒计时，归 0 提升档位并归还工具物品。
  tickUpgrades(): void {
    const ups = GameState.data.toolUpgrades;
    if (ups.length === 0) return;
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    let completed = false;
    const remaining: typeof ups = [];
    for (const u of ups) {
      u.daysRemaining -= 1;
      if (u.daysRemaining > 0) {
        remaining.push(u);
      } else if (inv.hasSpaceFor(u.fromToolType, 1)) {
        GameState.data.player.tools[u.fromToolType] = u.toTier;
        inv.addItem(u.fromToolType, 1);
        completed = true;
      } else {
        u.daysRemaining = 0; // 背包满：保留，下次过夜重试归还，不丢工具、不提前升档
        remaining.push(u);
      }
    }
    GameState.data.toolUpgrades = remaining;
    if (completed) EventBus.emit('inventory:changed', {});
  }
}
