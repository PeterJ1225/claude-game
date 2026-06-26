import Phaser from 'phaser';
import { GameState } from '../save/GameState';
import { setupSystems } from '../systems/setup';
import { SaveSystem } from '../save/SaveSystem';
import { createSaveStorage } from '../save/storageFactory';

export class MainMenuScene extends Phaser.Scene {
  private gameStarted = false;
  private saveSystem: SaveSystem | null = null;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const cx = this.scale.width / 2;
    this.add.text(cx, 56, '星露谷物语类游戏', { fontSize: '16px', color: '#ffe9a8' }).setOrigin(0.5);
    this.add.text(cx, 78, '四季农场 · 种植 · 社交 · 采矿 · 钓鱼 · 节日', { fontSize: '8px', color: '#9fb0c0' }).setOrigin(0.5);

    const start = this.add
      .text(cx, 134, '▶ 新游戏', {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#2e6b3f',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    start.on('pointerover', () => start.setColor('#ffe9a8'));
    start.on('pointerout', () => start.setColor('#ffffff'));
    start.once('pointerdown', () => this.startNew());

    const cont = this.add
      .text(cx, 164, '继续（读档）', { fontSize: '10px', color: '#5f6b78' })
      .setOrigin(0.5);

    this.add
      .text(cx, 238, 'Enter / 点击新游戏开始 · WASD 移动 · 空格用工具 · E 收获/交互 · 床上 E 睡觉 · ESC 设置', {
        fontSize: '8px',
        color: '#7f8b98',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startNew());

    // 探测是否有存档 → 启用「继续」
    void createSaveStorage().then(async (storage) => {
      this.saveSystem = new SaveSystem(storage);
      if (await this.saveSystem.exists()) {
        cont.setColor('#ffffff').setInteractive({ useHandCursor: true });
        cont.on('pointerover', () => cont.setColor('#ffe9a8'));
        cont.on('pointerout', () => cont.setColor('#ffffff'));
        cont.once('pointerdown', () => void this.continueGame());
      }
    });
  }

  private startNew(): void {
    if (this.gameStarted) return;
    this.gameStarted = true;
    GameState.newGame(0x1a2b3c);
    setupSystems();
    this.scene.start('Farm');
  }

  private async continueGame(): Promise<void> {
    if (this.gameStarted || !this.saveSystem) return;
    const ok = await this.saveSystem.load();
    if (!ok) return;
    this.gameStarted = true;
    setupSystems();
    this.scene.start('Farm');
  }
}
