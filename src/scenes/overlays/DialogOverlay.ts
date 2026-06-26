import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import { ServiceLocator } from '../../core/ServiceLocator';
import { SYS } from '../../systems/keys';
import type { TimeSystem } from '../../systems/TimeSystem';

interface DialogData {
  name: string;
  lines: string[];
  parentScene: string;
}

// 对话浮层（SPEC 4.3）：底部对话框，逐句推进，关闭恢复场景与时间。
export class DialogOverlay extends Phaser.Scene {
  private lines: string[] = [];
  private idx = 0;
  private bodyText!: Phaser.GameObjects.Text;
  private parentScene = 'Town';

  constructor() {
    super('DialogOverlay');
  }

  create(data: DialogData): void {
    this.parentScene = data.parentScene;
    this.lines = data.lines.length ? data.lines : ['…'];
    this.idx = 0;

    this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.3).setOrigin(0);
    const ph = 64;
    const py = DESIGN_HEIGHT - ph - 6;
    this.add.rectangle(8, py, DESIGN_WIDTH - 16, ph, 0x1e2433).setOrigin(0).setStrokeStyle(2, 0x6b87a8);
    this.add.text(16, py + 6, data.name, { fontSize: '10px', color: '#ffe9a8' });
    this.bodyText = this.add.text(16, py + 24, '', {
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: DESIGN_WIDTH - 40 },
    });
    this.add
      .text(DESIGN_WIDTH - 16, py + ph - 11, '空格 / E / 点击 继续', { fontSize: '8px', color: '#7f8b98' })
      .setOrigin(1, 1);

    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-E', () => this.next());
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.on('pointerdown', () => this.next());

    this.render();
  }

  private render(): void {
    this.bodyText.setText(this.lines[this.idx] ?? '');
  }

  private next(): void {
    this.idx += 1;
    if (this.idx >= this.lines.length) this.close();
    else this.render();
  }

  private close(): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(false);
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
