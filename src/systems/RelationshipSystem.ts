// 关系系统（SPEC 4.6 owner: relationships）。M1 暂无 NPC，dailyReset 在空集合上为 no-op，
// 但保留以让过夜流水线（4.5 步 9）完整、便于 M4 扩展。
import { GameState } from '../save/GameState';

export class RelationshipSystem {
  dailyReset(isNewWeek: boolean): void {
    const rels = GameState.data.relationships;
    for (const k in rels) {
      rels[k].talkedToday = false;
      if (isNewWeek) rels[k].giftsThisWeek = 0;
    }
  }

  markMet(npcId: string): void {
    const r = GameState.data.relationships[npcId];
    if (r) r.met = true;
  }
}
