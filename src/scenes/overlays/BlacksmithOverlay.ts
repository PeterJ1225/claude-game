import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import { GameState } from '../../save/GameState';
import { ServiceLocator } from '../../core/ServiceLocator';
import { SYS } from '../../systems/keys';
import { getItem } from '../../data/items';
import type { ToolSystem } from '../../systems/ToolSystem';
import type { TimeSystem } from '../../systems/TimeSystem';
import type { ToolType } from '../../types';

const TIER_CN: Record<string, string> = {
  basic: '基础',
  copper: '铜',
  iron: '铁',
  gold: '金',
  iridium: '铱',
};
const UPGRADABLE: ToolType[] = ['hoe', 'wateringCan', 'pickaxe', 'axe'];

// 铁匠铺浮层（SPEC 4.3 / M3）：升级工具（金币 + 2 天，工具暂交铁匠）。
export class BlacksmithOverlay extends Phaser.Scene {
  private parentScene = 'Town';
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private rows: { type: ToolType; text: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('BlacksmithOverlay');
  }

  create(data: { parentScene: string }): void {
    this.parentScene = data.parentScene;
    this.rows = [];

    this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.55).setOrigin(0);
    const panelW = 280;
    const panelH = 170;
    const px = (DESIGN_WIDTH - panelW) / 2;
    const py = (DESIGN_HEIGHT - panelH) / 2;
    this.add.rectangle(px, py, panelW, panelH, 0x33291f).setOrigin(0).setStrokeStyle(2, 0xc0612a);
    this.add.text(px + 8, py + 6, '铁匠铺', { fontSize: '12px', color: '#ffcf9a' });
    this.goldText = this.add
      .text(px + panelW - 8, py + 7, '', { fontSize: '10px', color: '#ffe9a8' })
      .setOrigin(1, 0);

    let y = py + 30;
    for (const type of UPGRADABLE) {
      const text = this.add
        .text(px + 12, y, '', {
          fontSize: '9px',
          color: '#ffffff',
          backgroundColor: '#4a3826',
          padding: { x: 5, y: 3 },
        })
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setColor('#ffe9a8'));
      text.on('pointerout', () => text.setColor('#ffffff'));
      text.on('pointerdown', () => this.tryUpgrade(type));
      this.rows.push({ type, text });
      y += 22;
    }

    this.statusText = this.add.text(px + 12, py + panelH - 30, '', { fontSize: '8px', color: '#9fb0c0' });
    this.add.text(px + 12, py + panelH - 16, '点击升级（工具会被取走 2 天） · Esc / 右键 关闭', { fontSize: '8px', color: '#7f8b98' });

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.close();
    });

    this.refresh();
  }

  private refresh(): void {
    const tool = ServiceLocator.get<ToolSystem>(SYS.tool);
    this.goldText.setText(`金 ${GameState.data.player.gold}`);
    for (const r of this.rows) {
      const name = getItem(r.type).name;
      const cur = TIER_CN[GameState.data.player.tools[r.type]];
      if (tool.isUpgrading(r.type)) {
        r.text.setText(`${name}（${cur}）  升级中…`);
        continue;
      }
      const next = tool.nextTier(r.type);
      if (!next) {
        r.text.setText(`${name}（${cur}）  已满级`);
      } else {
        r.text.setText(`升级 ${name}  ${cur}→${TIER_CN[next]}   ${tool.upgradeCost(r.type)} 金 / 2 天`);
      }
    }
  }

  private tryUpgrade(type: ToolType): void {
    const ok = ServiceLocator.get<ToolSystem>(SYS.tool).startUpgrade(type);
    this.statusText.setText(
      ok ? `${getItem(type).name} 已交给铁匠，2 天后取回` : '无法升级（金币不足 / 已在升级 / 已满级 / 工具不在背包）',
    );
    this.refresh();
  }

  private close(): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(false);
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
