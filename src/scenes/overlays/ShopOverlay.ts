import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import { GameState } from '../../save/GameState';
import { ServiceLocator } from '../../core/ServiceLocator';
import { SYS } from '../../systems/keys';
import { getShop } from '../../data/shops';
import { getItem } from '../../data/items';
import type { EconomySystem } from '../../systems/EconomySystem';
import type { TimeSystem } from '../../systems/TimeSystem';

interface ShopData {
  shopId: string;
  parentScene: string;
}

// 商店浮层（SPEC 4.3 overlay）：暂停玩法场景与时间，点击购买，Esc/右键关闭。
export class ShopOverlay extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private parentScene = 'Town';

  constructor() {
    super('ShopOverlay');
  }

  create(data: ShopData): void {
    this.parentScene = data.parentScene;
    const shop = getShop(data.shopId);
    const season = GameState.data.time.season;
    const stock = shop.stock.filter((s) => !s.seasons || s.seasons.includes(season));

    this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.55).setOrigin(0);
    const panelW = 240;
    const panelH = 170;
    const px = (DESIGN_WIDTH - panelW) / 2;
    const py = (DESIGN_HEIGHT - panelH) / 2;
    this.add.rectangle(px, py, panelW, panelH, 0x2b2438).setOrigin(0).setStrokeStyle(2, 0x6b4f8a);
    this.add.text(px + 8, py + 6, shop.name, { fontSize: '12px', color: '#ffe9a8' });
    this.goldText = this.add
      .text(px + panelW - 8, py + 7, '', { fontSize: '10px', color: '#ffe9a8' })
      .setOrigin(1, 0);

    let y = py + 30;
    for (const entry of stock) {
      const item = getItem(entry.itemId);
      const row = this.add
        .text(px + 12, y, `购买  ${item.name}   ${entry.price} 金`, {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#3a3050',
          padding: { x: 6, y: 3 },
        })
        .setInteractive({ useHandCursor: true });
      row.on('pointerover', () => row.setColor('#ffe9a8'));
      row.on('pointerout', () => row.setColor('#ffffff'));
      row.on('pointerdown', () => this.buy(entry.itemId, entry.price, item.name));
      y += 24;
    }

    this.statusText = this.add.text(px + 12, py + panelH - 30, '', { fontSize: '8px', color: '#9fb0c0' });
    this.add.text(px + 12, py + panelH - 16, '点击购买 · Esc / 右键 关闭', { fontSize: '8px', color: '#7f8b98' });

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.close();
    });

    this.refreshGold();
  }

  private buy(itemId: string, price: number, name: string): void {
    const ok = ServiceLocator.get<EconomySystem>(SYS.economy).buyItem(itemId, price);
    this.statusText.setText(ok ? `买了 1 个 ${name}` : '金币不足或背包已满');
    this.refreshGold();
  }

  private refreshGold(): void {
    this.goldText.setText(`金 ${GameState.data.player.gold}`);
  }

  private close(): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(false);
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
