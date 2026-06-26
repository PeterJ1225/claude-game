import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import type { FestivalSystem } from '../systems/FestivalSystem';

export class TownScene extends WorldScene {
  protected readonly mapKey = 'town';
  private shopZone!: Phaser.Geom.Rectangle;
  private blacksmithZone!: Phaser.Geom.Rectangle;
  private mineZone!: Phaser.Geom.Rectangle;
  private festivalZone?: Phaser.Geom.Rectangle;

  constructor() {
    super('Town');
  }

  protected onSetup(): void {
    this.shopZone = this.zoneFor('shop', new Phaser.Geom.Rectangle(96, 96, 48, 48), '种子店 (E)', 0x6b4f8a);
    this.blacksmithZone = this.zoneFor('blacksmith', new Phaser.Geom.Rectangle(380, 128, 48, 24), '铁匠铺 (E)', 0xc0612a);
    this.mineZone = this.zoneFor('mine', new Phaser.Geom.Rectangle(450, 108, 48, 24), '矿洞 (E)', 0x4a4a5a);
    // 海滩出口（东侧缺口，走进去自动传送）
    this.add.rectangle(608, 160, 24, 48, 0x2f7ca5, 0.5).setOrigin(0).setDepth(2);
    this.add.text(616, 152, '海滩 →', { fontSize: '8px', color: '#bfe6ff' }).setOrigin(0.5).setDepth(2);

    // 节日当天：广场入口 + 顶部横幅
    const fest = ServiceLocator.get<FestivalSystem>(SYS.festival).festivalToday();
    if (fest) {
      this.festivalZone = new Phaser.Geom.Rectangle(288, 200, 64, 40);
      this.add.rectangle(288, 200, 64, 40, 0xffb347, 0.6).setOrigin(0).setDepth(2);
      this.add.text(320, 192, `🎪 ${fest.name} (E)`, { fontSize: '8px', color: '#5a2d00' }).setOrigin(0.5).setDepth(2);
      this.add
        .text(320, 6, `今天是${fest.name}！到广场参加吧`, { fontSize: '8px', color: '#ffe9a8' })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(70);
    }
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
    if (Phaser.Geom.Rectangle.Contains(this.mineZone, this.player.x, this.player.y)) {
      this.scene.start('Mine', { floor: 1 });
      return true;
    }
    if (this.festivalZone && Phaser.Geom.Rectangle.Contains(this.festivalZone, this.player.x, this.player.y)) {
      this.scene.start('TownFestival');
      return true;
    }
    return false;
  }
}
