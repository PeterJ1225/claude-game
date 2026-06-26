// NPC 系统（SPEC 5.7）：按日程 + 时间计算 NPC 当前应在的场景与像素位置（派生态，不入档）。
import { GameState } from '../save/GameState';
import { NPCS, getNPC } from '../data/npcs';
import { TILE_SIZE } from '../config/constants';
import type { NPCScheduleEntry } from '../types';

export class NPCSystem {
  // 当前时间该 NPC 应在的场景与像素中心（M4 用 'default' 日程，取 time≤当前的最后一条）。
  currentTarget(npcId: string): { scene: string; x: number; y: number } {
    const entries = getNPC(npcId).schedule.default ?? [];
    const minute = GameState.data.time.minute;
    let cur: NPCScheduleEntry | undefined = entries[0];
    for (const e of entries) if (e.time <= minute) cur = e;
    const base = cur ?? { scene: 'Town', x: 0, y: 0, time: 0 };
    return { scene: base.scene, x: base.x * TILE_SIZE + TILE_SIZE / 2, y: base.y * TILE_SIZE + TILE_SIZE / 2 };
  }

  idsInScene(scene: string): string[] {
    return NPCS.filter((n) => this.currentTarget(n.id).scene === scene).map((n) => n.id);
  }

  resetDailySchedule(): void {
    // NPC 像素位置是派生态（schedule + time 实时算），无需持久化或重置。
  }
}
