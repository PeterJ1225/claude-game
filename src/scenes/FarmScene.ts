import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { FarmView } from './FarmView';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import { FARM_BED, FARM_SHIPPING_BIN } from '../config/constants';
import type { InteractionSystem } from '../systems/InteractionSystem';

export class FarmScene extends WorldScene {
  protected readonly mapKey = 'farm';
  protected canFarm = true;
  private bed!: Phaser.Geom.Rectangle;
  private bin!: Phaser.Geom.Rectangle;

  constructor() {
    super('Farm');
  }

  protected onSetup(): void {
    new FarmView(this);

    // 床（睡觉）
    this.bed = new Phaser.Geom.Rectangle(FARM_BED.x, FARM_BED.y, FARM_BED.w, FARM_BED.h);
    this.add.rectangle(FARM_BED.x, FARM_BED.y, FARM_BED.w, FARM_BED.h, 0x7a3b3b).setOrigin(0).setDepth(2);
    this.add.rectangle(FARM_BED.x, FARM_BED.y, FARM_BED.w, 6, 0xd6d2c4).setOrigin(0).setDepth(2);
    this.add.text(FARM_BED.x + FARM_BED.w / 2, FARM_BED.y - 6, '床(E)', { fontSize: '7px', color: '#ffd9d9' }).setOrigin(0.5).setDepth(2);

    // 出货箱（投放产物，睡觉后结算）
    this.bin = new Phaser.Geom.Rectangle(FARM_SHIPPING_BIN.x, FARM_SHIPPING_BIN.y, FARM_SHIPPING_BIN.w, FARM_SHIPPING_BIN.h);
    this.add.rectangle(FARM_SHIPPING_BIN.x, FARM_SHIPPING_BIN.y, FARM_SHIPPING_BIN.w, FARM_SHIPPING_BIN.h, 0x6b4a2a).setOrigin(0).setDepth(2);
    this.add.rectangle(FARM_SHIPPING_BIN.x, FARM_SHIPPING_BIN.y, FARM_SHIPPING_BIN.w, 4, 0x4a3320).setOrigin(0).setDepth(2);
    this.add.text(FARM_SHIPPING_BIN.x + FARM_SHIPPING_BIN.w / 2, FARM_SHIPPING_BIN.y - 6, '出货箱(E)', { fontSize: '7px', color: '#e8c98a' }).setOrigin(0.5).setDepth(2);
  }

  protected onInteract(): boolean {
    if (Phaser.Geom.Rectangle.Contains(this.bed, this.player.x, this.player.y)) {
      void this.sleep('normal');
      return true;
    }
    if (Phaser.Geom.Rectangle.Contains(this.bin, this.player.x, this.player.y)) {
      const ok = ServiceLocator.get<InteractionSystem>(SYS.interaction).shipSelected();
      EventBus.emit('debug:toast', { text: ok ? '已放入出货箱（睡觉后结算）' : '先选中可出售的物品' });
      return true;
    }
    return false;
  }
}
