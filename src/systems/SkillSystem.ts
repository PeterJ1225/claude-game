// 技能系统（SPEC 4.6 owner: player.skills / unlocked.recipes）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { MAX_SKILL_LEVEL, skillXpForLevel } from '../config/balance';
import type { SkillId } from '../types';

export class SkillSystem {
  addXp(skill: SkillId, amount: number): void {
    const s = GameState.data.player.skills[skill];
    s.xp += amount;
    while (s.level < MAX_SKILL_LEVEL && s.xp >= skillXpForLevel(s.level + 1)) {
      s.level += 1;
      EventBus.emit('skill:levelUp', { skill, level: s.level });
    }
  }

  // 配方解锁唯一真相源走这里（SPEC 5.10/6.10）
  unlockRecipe(id: string): void {
    const u = GameState.data.unlocked.recipes;
    if (!u.includes(id)) u.push(id);
  }
}
