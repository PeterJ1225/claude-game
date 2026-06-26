// 采矿系统（SPEC 4.6 owner: mine.deepestLevel）。矿层布局为派生态：
// 由 rng.seed + 层号确定性生成（重进同层布局相同，不入档）。
import { GameState } from '../save/GameState';
import { RandomService } from '../core/RandomService';
import { deriveInt, nextRandom } from '../utils/random';
import { MAP_TILES_H, MAP_TILES_W } from '../config/constants';
import { monstersForLevel } from '../data/monsters';
import type { MonsterDef } from '../types';

export interface MineRock {
  tx: number;
  ty: number;
  ore: string | null;
}
export interface MineMonster {
  tx: number;
  ty: number;
  type: string;
}
export interface MineLayer {
  rocks: MineRock[];
  ladder: { tx: number; ty: number };
  monsters: MineMonster[];
}

function oresForDepth(floor: number): string[] {
  if (floor < 4) return ['copper_ore', 'copper_ore', 'coal', 'stone'];
  if (floor < 8) return ['copper_ore', 'iron_ore', 'coal'];
  return ['iron_ore', 'gold_ore', 'coal'];
}

export class MiningSystem {
  generateLayer(floor: number): MineLayer {
    let s = deriveInt(GameState.data.rng.seed, 'mine', floor);
    const rnd = (): number => {
      const [v, ns] = nextRandom(s);
      s = ns;
      return v;
    };
    const occupied = new Set<string>(['20,20', '20,21', '19,20', '21,20', '20,19']); // 出生点附近留空
    const place = (): { tx: number; ty: number } => {
      let tx = 2;
      let ty = 2;
      let tries = 0;
      do {
        tx = 2 + Math.floor(rnd() * (MAP_TILES_W - 4));
        ty = 2 + Math.floor(rnd() * (MAP_TILES_H - 4));
        tries++;
      } while (occupied.has(`${tx},${ty}`) && tries < 50);
      occupied.add(`${tx},${ty}`);
      return { tx, ty };
    };

    const ores = oresForDepth(floor);
    const rocks: MineRock[] = [];
    const rockCount = 24 + Math.floor(rnd() * 12);
    for (let i = 0; i < rockCount; i++) {
      const p = place();
      const ore = rnd() < 0.28 ? ores[Math.floor(rnd() * ores.length)] : null;
      rocks.push({ tx: p.tx, ty: p.ty, ore });
    }

    const ladder = place();

    const pool = monstersForLevel(floor);
    const monsters: MineMonster[] = [];
    const monCount = pool.length ? 2 + Math.floor(rnd() * 3) : 0;
    for (let i = 0; i < monCount; i++) {
      const p = place();
      monsters.push({ tx: p.tx, ty: p.ty, type: pool[Math.floor(rnd() * pool.length)] });
    }

    return { rocks, ladder, monsters };
  }

  // 怪物掉落（序列随机，消耗 rng.state）
  rollMonsterDrops(def: MonsterDef): { itemId: string; qty: number }[] {
    const out: { itemId: string; qty: number }[] = [];
    for (const d of def.drops) {
      if (RandomService.next() < d.chance) {
        out.push({ itemId: d.itemId, qty: d.min + RandomService.int(d.max - d.min + 1) });
      }
    }
    return out;
  }

  // 下到某层，更新最深进度（owner: mine.deepestLevel）
  descend(toFloor: number): void {
    if (toFloor > GameState.data.mine.deepestLevel) {
      GameState.data.mine.deepestLevel = toFloor;
    }
  }
}
