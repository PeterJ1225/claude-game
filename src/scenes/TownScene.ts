import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import type { TimeSystem } from '../systems/TimeSystem';

export class TownScene extends WorldScene {
  protected readonly mapKey = 'town';
  private shopZone!: Phaser.Geom.Rectangle;
  private blacksmithZone!: Phaser.Geom.Rectangle;

  constructor() {
    super('Town');
  }

  protected onSetup(): void {
    this.shopZone = this.zoneFor('shop', new Phaser.Geom.Rectangle(96, 96, 48, 48), '种子店 (E)', 0x6b4f8a);
    this.blacksmithZone = this.zoneFor('blacksmith', new Phaser.Geom.Rectangle(380, 128, 48, 24), '铁匠铺 (E)', 0xc0612a);
  }

  private zoneFor(name: string, fallback: Phaser.Geom.Rectangle, label: string, color: number): Phaser.Geom.Rectangle {
    const o = this.map.findObject('Objects', (x) => x.name === name);
    const zone =
      o && typeof o.x === 'number' && typeof o.y === 'number'
        ? new Phaser.Geom.Rectangle(o.x, o.y, o.width ?? 32, o.height ?? 32)
        : fallback;
    this.add.rectangle(zone.x, zone.y, zone.width, zone.height, color, 0.5).setOrigin(0).setDepth(2);
    this.add.text(zone.centerX, zone.y - 6, label, { fontSize: '8px', color: '#ffe9a8' }).setOrigin(0.5).setDepth(2);
    return zone;
  }

  protected onInteract(): boolean {
    if (Phaser.Geom.Rectangle.Contains(this.shopZone, this.player.x, this.player.y)) {
      this.openOverlay('ShopOverlay', { shopId: 'seedShop', parentScene: 'Town' });
      return true;
    }
    if (Phaser.Geom.Rectangle.Contains(this.blacksmithZone, this.player.x, this.player.y)) {
      this.openOverlay('BlacksmithOverlay', { parentScene: 'Town' });
      return true;
    }
    return false;
  }

  private openOverlay(key: string, data: object): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(true);
    this.input.enabled = false; // 确保暂停期父场景不响应输入
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      this.input.enabled = true;
    });
    this.scene.pause();
    this.scene.launch(key, data);
  }
}
