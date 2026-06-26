import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import type { EventMap } from '../core/events';
import { GameState } from '../save/GameState';
import { getItem, hasItemDef } from '../data/items';
import { formatTime, weekdayName } from '../utils/time';
import { DESIGN_HEIGHT, DESIGN_WIDTH, HOTBAR_SIZE } from '../config/constants';

const SEASON_CN: Record<string, string> = { spring: '春', summer: '夏', fall: '秋', winter: '冬' };
const WEEKDAY_CN: Record<string, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
};
const WEATHER_CN: Record<string, string> = { sunny: '晴', rain: '雨', storm: '暴雨', snow: '雪' };

interface Cell {
  frame: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  qty: Phaser.GameObjects.Text;
}

export class UIScene extends Phaser.Scene {
  private clockText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private energyText!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;
  private cells: Cell[] = [];
  private readonly unsubs: (() => void)[] = [];

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.clockText = this.add.text(4, 4, '', {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#00000066',
      padding: { x: 3, y: 2 },
    });
    this.goldText = this.add
      .text(DESIGN_WIDTH - 4, 4, '', {
        fontSize: '8px',
        color: '#ffe9a8',
        backgroundColor: '#00000066',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(1, 0);

    // 体力条（右下）
    const barW = 70;
    const barX = DESIGN_WIDTH - 4 - barW;
    const barY = DESIGN_HEIGHT - 30;
    this.add.rectangle(barX, barY, barW, 8, 0x222222).setOrigin(0, 0.5);
    this.energyFill = this.add.rectangle(barX, barY, barW, 8, 0x6abe30).setOrigin(0, 0.5);
    this.energyText = this.add
      .text(DESIGN_WIDTH - 4, barY - 8, '', { fontSize: '7px', color: '#ffffff' })
      .setOrigin(1, 1);

    // 血条（体力条上方）
    const hpY = barY - 14;
    this.add.rectangle(barX, hpY, barW, 6, 0x222222).setOrigin(0, 0.5);
    this.hpFill = this.add.rectangle(barX, hpY, barW, 6, 0xd64550).setOrigin(0, 0.5);

    this.buildHotbar();

    this.toastText = this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 34, '', {
        fontSize: '8px',
        color: '#ffe9a8',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5);

    this.on('time:tick', () => this.renderClock());
    this.on('time:newDay', () => this.renderClock());
    this.on('weather:changed', () => this.renderClock());
    this.on('economy:goldChanged', () => this.renderGold());
    this.on('player:energyChanged', () => this.renderEnergy());
    this.on('player:hpChanged', () => this.renderHp());
    this.on('inventory:changed', () => this.renderHotbar());
    this.on('debug:toast', (p: EventMap['debug:toast']) => {
      this.toastText.setText(p.text);
      this.time.delayedCall(1600, () => this.toastText?.setText(''));
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const u of this.unsubs) u();
    });

    this.renderClock();
    this.renderGold();
    this.renderEnergy();
    this.renderHp();
    this.renderHotbar();
  }

  private renderHp(): void {
    const p = GameState.data.player;
    this.hpFill.displayWidth = 70 * Math.max(0, Math.min(1, p.hp / p.maxHp));
  }

  private on<K extends keyof EventMap>(event: K, fn: (p: EventMap[K]) => void): void {
    EventBus.on(event, fn);
    this.unsubs.push(() => EventBus.off(event, fn));
  }

  private buildHotbar(): void {
    const cell = 16;
    const gap = 2;
    const totalW = HOTBAR_SIZE * cell + (HOTBAR_SIZE - 1) * gap;
    const startX = (DESIGN_WIDTH - totalW) / 2;
    const y = DESIGN_HEIGHT - 13;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const x = startX + i * (cell + gap) + cell / 2;
      this.add.rectangle(x, y, cell, cell, 0x000000, 0.4);
      const frame = this.add.rectangle(x, y, cell, cell).setStrokeStyle(1, 0x666666);
      const icon = this.add.image(x, y, 'icon_hoe').setVisible(false);
      const qty = this.add.text(x + cell / 2 - 1, y + cell / 2 - 1, '', {
        fontSize: '7px',
        color: '#ffffff',
      }).setOrigin(1, 1);
      this.cells.push({ frame, icon, qty });
    }
  }

  private renderClock(): void {
    const t = GameState.data.time;
    const season = SEASON_CN[t.season] ?? t.season;
    const wd = WEEKDAY_CN[weekdayName(t.day)] ?? '';
    const weather = WEATHER_CN[t.weather] ?? t.weather;
    this.clockText.setText(`${season} ${t.day} ${wd}  ${formatTime(t.minute)}  ${weather}`);
  }

  private renderGold(): void {
    this.goldText.setText(`金 ${GameState.data.player.gold}`);
  }

  private renderEnergy(): void {
    const p = GameState.data.player;
    this.energyFill.displayWidth = 70 * Math.max(0, Math.min(1, p.energy / p.maxEnergy));
    this.energyText.setText(`体力 ${p.energy}/${p.maxEnergy}`);
  }

  private renderHotbar(): void {
    const inv = GameState.data.inventory;
    const sel = GameState.data.player.hotbarSelectedIndex;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = inv[i];
      const c = this.cells[i];
      if (slot && hasItemDef(slot.itemId)) {
        c.icon.setTexture(getItem(slot.itemId).iconKey).setVisible(true);
        c.qty.setText(slot.qty > 1 ? String(slot.qty) : '');
      } else {
        c.icon.setVisible(false);
        c.qty.setText('');
      }
      c.frame.setStrokeStyle(i === sel ? 2 : 1, i === sel ? 0xffe9a8 : 0x666666);
    }
  }
}
