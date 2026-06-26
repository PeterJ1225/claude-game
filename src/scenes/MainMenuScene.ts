import Phaser from 'phaser';
import { GameState } from '../save/GameState';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const cx = this.scale.width / 2;
    this.add
      .text(cx, 56, '星露谷物语类游戏', { fontSize: '16px', color: '#ffe9a8' })
      .setOrigin(0.5);
    this.add.text(cx, 78, '（M0 脚手架占位）', { fontSize: '8px', color: '#9fb0c0' }).setOrigin(0.5);

    const start = this.add
      .text(cx, 140, '▶ 新游戏', {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#2e6b3f',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    start.on('pointerover', () => start.setColor('#ffe9a8'));
    start.on('pointerout', () => start.setColor('#ffffff'));
    start.once('pointerdown', () => this.startGame());

    this.add.text(cx, 166, '继续 / 设置（未实现）', { fontSize: '8px', color: '#5f6b78' }).setOrigin(0.5);
    this.add
      .text(cx, 244, '按 Enter 或点击「新游戏」开始 · WASD / 方向键移动', {
        fontSize: '8px',
        color: '#7f8b98',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
  }

  private gameStarted = false;

  private startGame(): void {
    if (this.gameStarted) return; // 防重入：快速点击 / 同时按 Enter
    this.gameStarted = true;
    GameState.newGame(0x1a2b3c); // M0：固定种子占位
    this.scene.start('Farm');
  }
}
