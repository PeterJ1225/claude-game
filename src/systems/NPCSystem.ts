// NPC 系统（SPEC 5.7）：按日程 + 时间计算 NPC 当前应在的场景与像素位置（派生态，不入档）。
// M7：节日当天所有居民聚到节日场景的固定点（覆盖普通日程）。
import { GameState } from '../save/GameState';
import { ServiceLocator } from '../core/ServiceLocator';
import { NPCS, getNPC } from '../data/npcs';
import { TILE_SIZE } from '../config/constants';
import { SYS } from './keys';
import type { NPCScheduleEntry } from '../types';
import type { FestivalSystem } from './FestivalSystem';

// 节日场景内各 NPC 的固定聚集点（瓦片坐标）
const FESTIVAL_SPOTS: Record<string, { x: number; y: number }> = {
  mira: { x: 16, y: 11 },
  sam: { x: 23, y: 11 },
};

export class NPCSystem {
  // 当前时间该 NPC 应在的场景与像素中心（M4 用 'default' 日程，取 time≤当前的最后一条）。
  currentTarget(npcId: string): { scene: string; x: number; y: number } {
    const fest = ServiceLocator.get<FestivalSystem>(SYS.festival).festivalToday();
    if (fest) {
      const spot = FESTIVAL_SPOTS[npcId] ?? { x: 20, y: 11 };
      return { scene: fest.scene, x: spot.x * TILE_SIZE + TILE_SIZE / 2, y: spot.y * TILE_SIZE + TILE_SIZE / 2 };
    }
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
