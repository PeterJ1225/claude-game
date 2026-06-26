// 体力/生命系统（SPEC 4.6 owner: player.energy/hp/maxEnergy/maxHp）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { FAINT_HP_COST } from '../config/balance';

export class EnergySystem {
  // 消耗体力。体力充足返回 true；不足则按 SPEC 5.1 仍执行动作但扣 HP，返回 false。
  trySpend(amount: number): boolean {
    const p = GameState.data.player;
    if (p.energy >= amount) {
      p.energy -= amount;
      EventBus.emit('player:energyChanged', { energy: p.energy, max: p.maxEnergy });
      return true;
    }
    p.energy = 0;
    p.hp = Math.max(0, p.hp - FAINT_HP_COST);
    EventBus.emit('player:energyChanged', { energy: p.energy, max: p.maxEnergy });
    EventBus.emit('player:hpChanged', { hp: p.hp, max: p.maxHp });
    return false;
  }

  // 战斗受击：扣 HP，返回是否倒下（HP≤0）
  damage(amount: number): boolean {
    const p = GameState.data.player;
    p.hp = Math.max(0, p.hp - amount);
    EventBus.emit('player:hpChanged', { hp: p.hp, max: p.maxHp });
    return p.hp <= 0;
  }

  // 过夜恢复（SPEC 4.5 步 8 / 附录 A）：睡觉/熬夜醒来满体力满血（farm 晕倒的金钱惩罚另算）。
  restoreOnSleep(): void {
    const p = GameState.data.player;
    p.energy = p.maxEnergy;
    p.hp = p.maxHp;
    EventBus.emit('player:energyChanged', { energy: p.energy, max: p.maxEnergy });
    EventBus.emit('player:hpChanged', { hp: p.hp, max: p.maxHp });
  }

  // 矿洞内 HP 归零/超时即时晕倒（SPEC 附录 A：energy=maxEnergy×0.5、hp=maxHp）
  faintMine(): void {
    const p = GameState.data.player;
    p.energy = Math.floor(p.maxEnergy * 0.5);
    p.hp = p.maxHp;
    EventBus.emit('player:energyChanged', { energy: p.energy, max: p.maxEnergy });
    EventBus.emit('player:hpChanged', { hp: p.hp, max: p.maxHp });
  }
}
