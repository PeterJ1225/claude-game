// 工具系统（SPEC 4.6 owner: player.tools / toolUpgrades）。
import { GameState } from '../save/GameState';

export class ToolSystem {
  // 过夜结算方法（SPEC 4.5 步 7）：在途升级倒计时，归 0 则提升档位。
  tickUpgrades(): void {
    const ups = GameState.data.toolUpgrades;
    if (ups.length === 0) return;
    for (const u of ups) u.daysRemaining -= 1;
    for (const u of ups) {
      if (u.daysRemaining <= 0) GameState.data.player.tools[u.fromToolType] = u.toTier;
    }
    GameState.data.toolUpgrades = ups.filter((u) => u.daysRemaining > 0);
  }
}
