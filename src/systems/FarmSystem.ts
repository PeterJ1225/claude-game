// 农田系统（SPEC 4.6 owner: farm.tiles[].tilled/.watered, player.wateringCanWater）。
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { tileKey } from '../utils/grid';
import { WATERING_CAN_CAPACITY } from '../config/balance';

export class FarmSystem {
  private tiles() {
    return GameState.data.farm.tiles;
  }

  getTile(tx: number, ty: number) {
    return this.tiles()[tileKey(tx, ty)];
  }

  till(tx: number, ty: number): boolean {
    const k = tileKey(tx, ty);
    const tiles = this.tiles();
    const existing = tiles[k];
    if (existing?.tilled) return false;
    tiles[k] = { tilled: true, watered: existing?.watered ?? false, crop: existing?.crop };
    EventBus.emit('farm:tileChanged', { tx, ty });
    return true;
  }

  water(tx: number, ty: number): boolean {
    const tile = this.getTile(tx, ty);
    if (!tile || !tile.tilled || tile.watered) return false;
    const p = GameState.data.player;
    if (p.wateringCanWater <= 0) return false;
    tile.watered = true;
    p.wateringCanWater -= 1;
    EventBus.emit('farm:tileChanged', { tx, ty });
    return true;
  }

  // 过夜结算方法（SPEC 4.5 步 5）
  waterAllTiles(): void {
    const tiles = this.tiles();
    for (const k in tiles) if (tiles[k].tilled) tiles[k].watered = true;
    EventBus.emit('farm:bulkChanged', {});
  }

  // 过夜结算方法（SPEC 4.5 步 6 尾）
  resetWatered(): void {
    const tiles = this.tiles();
    for (const k in tiles) tiles[k].watered = false;
    EventBus.emit('farm:bulkChanged', {});
  }

  refillWateringCan(): void {
    const p = GameState.data.player;
    p.wateringCanWater = WATERING_CAN_CAPACITY[p.tools.wateringCan];
  }
}
