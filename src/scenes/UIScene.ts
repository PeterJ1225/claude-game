import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';

// 常驻 HUD（与玩法场景并行运行）。M0/M0.5 演示「订阅 EventBus → 更新画面」的链路。
export class UIScene extends Phaser.Scene {
  private posText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.posText = this.add
      .text(4, 4, 'M0.5 · WASD 移动 · K 存档 / L 读档', {
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#00000066',
        padding: { x: 2, y: 1 },
      })
      .setScrollFactor(0);

    this.toastText = this.add
      .text(this.scale.width / 2, this.scale.height - 14, '', {
        fontSize: '8px',
        color: '#ffe9a8',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const onMoved = (p: EventMap['debug:playerMoved']): void => {
      this.posText.setText(`M0.5 · pos ${p.x},${p.y} · K 存档 / L 读档`);
    };
    const onToast = (p: EventMap['debug:toast']): void => {
      this.toastText.setText(p.text);
      this.time.delayedCall(1500, () => this.toastText?.setText(''));
    };

    EventBus.on('debug:playerMoved', onMoved);
    EventBus.on('debug:toast', onToast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('debug:playerMoved', onMoved);
      EventBus.off('debug:toast', onToast);
    });
  }
}
