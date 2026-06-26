import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import type { TimeSystem } from '../systems/TimeSystem';

export class TownScene extends WorldScene {
  protected readonly mapKey = 'town';
  private shopZone!: Phaser.Geom.Rectangle;
  private readonly shopId = 'seedShop';

  constructor() {
    super('Town');
  }

  protected onSetup(): void {
    const shop = this.map.findObject('Objects', (o) => o.name === 'shop');
    if (shop && typeof shop.x === 'number' && typeof shop.y === 'number') {
      this.shopZone = new Phaser.Geom.Rectangle(shop.x, shop.y, shop.width ?? 32, shop.height ?? 32);
    } else {
      this.shopZone = new Phaser.Geom.Rectangle(96, 96, 48, 48);
    }
    this.add
      .rectangle(this.shopZone.x, this.shopZone.y, this.shopZone.width, this.shopZone.height, 0x6b4f8a, 0.5)
      .setOrigin(0)
      .setDepth(2);
    this.add
      .text(this.shopZone.centerX, this.shopZone.y - 6, '种子店 (E)', { fontSize: '8px', color: '#ffe9a8' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected onInteract(): boolean {
    if (Phaser.Geom.Rectangle.Contains(this.shopZone, this.player.x, this.player.y)) {
      ServiceLocator.get<TimeSystem>(SYS.time).setPaused(true);
      this.scene.pause();
      this.scene.launch('ShopOverlay', { shopId: this.shopId, parentScene: 'Town' });
      return true;
    }
    return false;
  }
}
