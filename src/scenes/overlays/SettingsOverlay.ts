import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import { GameState } from '../../save/GameState';
import { ServiceLocator } from '../../core/ServiceLocator';
import { SYS } from '../../systems/keys';
import { AudioManager } from '../../audio/AudioManager';
import type { SettingsSystem } from '../../systems/SettingsSystem';
import type { TimeSystem } from '../../systems/TimeSystem';

interface SettingsData {
  parentScene: string;
}

// 设置浮层（SPEC 5.12）：音量、全屏、语言、键位说明。暂停玩法场景与时间（同其它 overlay）。
export class SettingsOverlay extends Phaser.Scene {
  private parentScene = 'Farm';
  private bgmText!: Phaser.GameObjects.Text;
  private sfxText!: Phaser.GameObjects.Text;
  private fsText!: Phaser.GameObjects.Text;

  constructor() {
    super('SettingsOverlay');
  }

  private settings(): SettingsSystem {
    return ServiceLocator.get<SettingsSystem>(SYS.settings);
  }

  create(data: SettingsData): void {
    this.parentScene = data.parentScene;
    const panelW = 280;
    const panelH = 210;
    const px = (DESIGN_WIDTH - panelW) / 2;
    const py = (DESIGN_HEIGHT - panelH) / 2;

    this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.6).setOrigin(0);
    this.add.rectangle(px, py, panelW, panelH, 0x232530).setOrigin(0).setStrokeStyle(2, 0x5a6b8a);
    this.add.text(px + panelW / 2, py + 8, '设置', { fontSize: '13px', color: '#ffe9a8' }).setOrigin(0.5, 0);

    let y = py + 34;
    // BGM
    this.add.text(px + 16, y, '音乐 BGM', { fontSize: '9px', color: '#ffffff' });
    this.makeBtn(px + 120, y - 2, '−', () => this.changeBgm(-0.1));
    this.bgmText = this.add.text(px + 150, y, '', { fontSize: '9px', color: '#bfe6ff' });
    this.makeBtn(px + 200, y - 2, '＋', () => this.changeBgm(0.1));
    y += 28;
    // SFX
    this.add.text(px + 16, y, '音效 SFX', { fontSize: '9px', color: '#ffffff' });
    this.makeBtn(px + 120, y - 2, '−', () => this.changeSfx(-0.1));
    this.sfxText = this.add.text(px + 150, y, '', { fontSize: '9px', color: '#bfe6ff' });
    this.makeBtn(px + 200, y - 2, '＋', () => this.changeSfx(0.1));
    y += 28;
    // 全屏
    this.add.text(px + 16, y, '全屏', { fontSize: '9px', color: '#ffffff' });
    this.fsText = this.add
      .text(px + 120, y - 2, '', {
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#3a3050',
        padding: { x: 8, y: 3 },
      })
      .setInteractive({ useHandCursor: true });
    this.fsText.on('pointerdown', () => this.toggleFullscreen());
    y += 28;
    // 语言
    this.add.text(px + 16, y, '语言', { fontSize: '9px', color: '#ffffff' });
    this.add.text(px + 120, y, '中文（预留 i18n）', { fontSize: '8px', color: '#9fb0c0' });
    y += 26;

    this.add.text(px + 16, y, '操作：WASD/方向 移动 · 空格 用工具 · E 交互/对话 · 1-0 快捷栏', { fontSize: '7px', color: '#8b97a4' });
    y += 12;
    this.add.text(px + 16, y, '空格(对NPC) 送礼 · K/L 存/读 · 滚轮 切换快捷栏 · ESC 设置', { fontSize: '7px', color: '#8b97a4' });

    const back = this.add
      .text(px + panelW / 2, py + panelH - 18, '返回（ESC）', {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#2e6b3f',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close());

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.close();
    });

    this.refresh();
  }

  private makeBtn(x: number, y: number, label: string, cb: () => void): void {
    const b = this.add
      .text(x, y, label, { fontSize: '11px', color: '#ffffff', backgroundColor: '#3a3050', padding: { x: 6, y: 2 } })
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setColor('#ffe9a8'));
    b.on('pointerout', () => b.setColor('#ffffff'));
    b.on('pointerdown', cb);
  }

  private changeBgm(d: number): void {
    const v = this.settings().setBgmVolume(GameState.data.settings.bgmVolume + d);
    AudioManager.setBgmVolume(v);
    this.refresh();
  }

  private changeSfx(d: number): void {
    const v = this.settings().setSfxVolume(GameState.data.settings.sfxVolume + d);
    AudioManager.setSfxVolume(v);
    this.refresh();
  }

  private toggleFullscreen(): void {
    const next = !GameState.data.settings.fullscreen;
    this.settings().setFullscreen(next);
    try {
      if (next) this.scale.startFullscreen();
      else this.scale.stopFullscreen();
    } catch {
      /* 浏览器可能要求用户手势；状态已存，忽略 */
    }
    this.refresh();
  }

  private refresh(): void {
    const s = GameState.data.settings;
    this.bgmText.setText(`${Math.round(s.bgmVolume * 100)}%`);
    this.sfxText.setText(`${Math.round(s.sfxVolume * 100)}%`);
    this.fsText.setText(s.fullscreen ? '开' : '关');
  }

  private close(): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(false);
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
