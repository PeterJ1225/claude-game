import Phaser from 'phaser';
import { GameState } from '../save/GameState';
import { EventBus } from '../core/EventBus';
import { getCrop } from '../data/crops';
import { parseTileKey } from '../utils/grid';
import { TILE_SIZE } from '../config/constants';

// 农田表现层：订阅农田变更事件，用一个 Graphics 重绘耕地/浇水/作物（M1 占位画法）。
export class FarmView {
  private g: Phaser.GameObjects.Graphics;
  private readonly onChange = (): void => this.redraw();

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.g.setDepth(1);
    EventBus.on('farm:tileChanged', this.onChange);
    EventBus.on('farm:bulkChanged', this.onChange);
    EventBus.on('time:newDay', this.onChange);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.redraw();
  }

  private redraw(): void {
    const g = this.g;
    g.clear();
    const tiles = GameState.data.farm.tiles;
    for (const key in tiles) {
      const t = tiles[key];
      const { tx, ty } = parseTileKey(key);
      const px = tx * TILE_SIZE;
      const py = ty * TILE_SIZE;
      if (t.tilled) {
        g.fillStyle(t.watered ? 0x5a3a1e : 0x7a5230, 1).fillRect(px, py, TILE_SIZE, TILE_SIZE);
        g.lineStyle(1, 0x000000, 0.12).strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
      if (t.crop) {
        const def = getCrop(t.crop.cropId);
        const atFinal = t.crop.stage >= def.growthStages.length;
        const mature = atFinal && (def.regrowDays === undefined || t.crop.regrowReady !== false);
        const prog = Math.min(1, t.crop.stage / def.growthStages.length);
        const h = 3 + Math.round(prog * 11);
        g.fillStyle(mature ? 0xffcc33 : 0x3fa34d, 1).fillRect(px + 6, py + (TILE_SIZE - h), 4, h);
      }
    }
  }

  private destroy(): void {
    EventBus.off('farm:tileChanged', this.onChange);
    EventBus.off('farm:bulkChanged', this.onChange);
    EventBus.off('time:newDay', this.onChange);
    this.g.destroy();
  }
}
