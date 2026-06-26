// 作物系统（SPEC 4.6 owner: farm.tiles[].crop）。生长/再生语义见 SPEC 6.1。
import { GameState } from '../save/GameState';
import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { RandomService } from '../core/RandomService';
import { tileKey } from '../utils/grid';
import { getCrop, getCropBySeed } from '../data/crops';
import { SYS } from './keys';
import type { Season } from '../types';
import type { InventorySystem } from './InventorySystem';
import type { SkillSystem } from './SkillSystem';

interface TileCrop {
  cropId: string;
  stage: number;
  daysInStage: number;
  regrowReady?: boolean;
}

export class CropSystem {
  private tiles() {
    return GameState.data.farm.tiles;
  }

  plant(tx: number, ty: number, seedItemId: string): boolean {
    const tile = this.tiles()[tileKey(tx, ty)];
    if (!tile || !tile.tilled || tile.crop) return false;
    const crop = getCropBySeed(seedItemId);
    if (!crop) return false;
    if (!crop.seasons.includes(GameState.data.time.season)) return false;
    tile.crop = { cropId: crop.id, stage: 0, daysInStage: 0 };
    EventBus.emit('farm:tileChanged', { tx, ty });
    return true;
  }

  private isHarvestable(c: TileCrop): boolean {
    const def = getCrop(c.cropId);
    if (c.stage < def.growthStages.length) return false;
    if (def.regrowDays === undefined) return true;
    return c.regrowReady !== false;
  }

  isMatureAt(tx: number, ty: number): boolean {
    const c = this.tiles()[tileKey(tx, ty)]?.crop;
    return c ? this.isHarvestable(c) : false;
  }

  harvest(tx: number, ty: number): boolean {
    const tile = this.tiles()[tileKey(tx, ty)];
    const c = tile?.crop;
    if (!c || !this.isHarvestable(c)) return false;
    const def = getCrop(c.cropId);
    const inv = ServiceLocator.get<InventorySystem>(SYS.inventory);
    if (!inv.hasSpaceFor(def.produceItemId, def.yieldMax)) return false; // 背包放不下则不收，避免丢失
    const span = def.yieldMax - def.yieldMin + 1;
    const yieldN = def.yieldMin + RandomService.int(span);
    const { overflow } = inv.addItem(def.produceItemId, yieldN);
    ServiceLocator.get<SkillSystem>(SYS.skill).addXp('farming', 8 * yieldN);
    if (def.regrowDays === undefined) {
      tile.crop = undefined;
    } else {
      c.regrowReady = false;
      c.daysInStage = 0;
    }
    EventBus.emit('crop:harvested', { cropId: def.id, qty: yieldN - overflow, overflow });
    EventBus.emit('farm:tileChanged', { tx, ty });
    return true;
  }

  // 过夜结算方法（SPEC 4.5 步 6 / 6.1）
  growOvernight(): void {
    const tiles = this.tiles();
    for (const k in tiles) {
      const tile = tiles[k];
      if (!tile.crop || !tile.watered) continue;
      const def = getCrop(tile.crop.cropId);
      const c = tile.crop;
      if (c.stage < def.growthStages.length) {
        c.daysInStage += 1;
        if (c.daysInStage >= def.growthStages[c.stage]) {
          c.stage += 1;
          c.daysInStage = 0;
        }
      } else if (def.regrowDays !== undefined && c.regrowReady === false) {
        c.daysInStage += 1;
        if (c.daysInStage >= def.regrowDays) {
          c.regrowReady = true;
          c.daysInStage = 0;
        }
      }
    }
    EventBus.emit('farm:bulkChanged', {});
  }

  // 过夜结算方法（SPEC 4.5 步 3）
  clearOutOfSeasonCrops(season: Season): void {
    const tiles = this.tiles();
    for (const k in tiles) {
      const tile = tiles[k];
      if (tile.crop && !getCrop(tile.crop.cropId).seasons.includes(season)) {
        tile.crop = undefined;
      }
    }
    EventBus.emit('farm:bulkChanged', {});
  }
}
