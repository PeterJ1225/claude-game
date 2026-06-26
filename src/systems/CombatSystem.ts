// 战斗系统（SPEC 5.8/附录A）：剑伤计算、玩家受击 + 无敌帧。
import { GameState } from '../save/GameState';
import { ServiceLocator } from '../core/ServiceLocator';
import { RandomService } from '../core/RandomService';
import {
  COMBAT_DAMAGE_VARIANCE,
  INVINCIBILITY_MS,
  SWORD_BASE_DAMAGE,
  SWORD_TIER_BONUS,
  TOOL_TIER_ORDER,
} from '../config/balance';
import { SYS } from './keys';
import type { EnergySystem } from './EnergySystem';

export class CombatSystem {
  private lastHitAt = -1e9; // 上次受击的场景时间戳（ms）

  // 玩家挥剑伤害：基础 + 档位加成，±15% 随机
  swordDamage(): number {
    const i = Math.max(0, TOOL_TIER_ORDER.indexOf(GameState.data.player.tools.sword));
    const base = SWORD_BASE_DAMAGE + i * SWORD_TIER_BONUS;
    const v = 1 + (RandomService.next() * 2 - 1) * COMBAT_DAMAGE_VARIANCE;
    return Math.max(1, Math.round(base * v));
  }

  // 玩家受击：无敌帧内忽略。返回 'iframe' | 'hit' | 'fainted'
  hitPlayer(amount: number, nowMs: number): 'iframe' | 'hit' | 'fainted' {
    if (nowMs - this.lastHitAt < INVINCIBILITY_MS) return 'iframe';
    this.lastHitAt = nowMs;
    const fainted = ServiceLocator.get<EnergySystem>(SYS.energy).damage(amount);
    return fainted ? 'fainted' : 'hit';
  }

  resetIframe(): void {
    this.lastHitAt = -1e9;
  }
}
