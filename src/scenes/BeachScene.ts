import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import type { FishingSystem } from '../systems/FishingSystem';

// 海滩场景：左侧沙地、右侧海水。手持钓竿在水边按主操作键钓鱼。
export class BeachScene extends WorldScene {
  protected readonly mapKey = 'beach';
  protected canFarm = false;
  private waterZone!: Phaser.Geom.Rectangle;

  constructor() {
    super('Beach');
  }

  protected onSetup(): void {
    this.cameras.main.setBackgroundColor('#d8c89a'); // 沙
    this.add.rectangle(352, 0, 640 - 352, 368, 0x2f7ca5).setOrigin(0).setDepth(0); // 海水
    this.add.rectangle(344, 0, 8, 368, 0x57a6c9).setOrigin(0).setDepth(0); // 浪花边
    this.waterZone = new Phaser.Geom.Rectangle(300, 0, 60, 368); // 水边可钓区
    this.add.text(330, 8, '在此面向海水，手持钓竿按空格钓鱼', { fontSize: '7px', color: '#ffffff' }).setScrollFactor(0).setDepth(70);
  }

  protected onUseTool(): boolean {
    const slot = this.inv().selectedSlot();
    if (
      slot?.itemId === 'fishingRod' &&
      Phaser.Geom.Rectangle.Contains(this.waterZone, this.player.x, this.player.y)
    ) {
      this.startFishing();
      return true;
    }
    return false;
  }

  private startFishing(): void {
    const fish = ServiceLocator.get<FishingSystem>(SYS.fishing).rollFish('beach');
    if (!fish) {
      EventBus.emit('debug:toast', { text: '这片水域现在没有鱼…（换个季节/时间试试）' });
      return;
    }
    this.openOverlay('FishingOverlay', {
      fishId: fish.id,
      fishName: fish.name,
      difficulty: fish.difficulty,
      parentScene: 'Beach',
    });
  }
}
