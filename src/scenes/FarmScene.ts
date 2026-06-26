import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { CONTROLS } from '../config/controls';
import { DAY_END_MINUTE, DESIGN_HEIGHT, DESIGN_WIDTH, FARM_SPAWN } from '../config/constants';
import { pixelToTile } from '../utils/grid';
import { GameState } from '../save/GameState';
import { SaveSystem } from '../save/SaveSystem';
import { createSaveStorage } from '../save/storageFactory';
import { setupSystems } from '../systems/setup';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import { FarmView } from './FarmView';
import type { Facing } from '../types';
import type { TimeSystem } from '../systems/TimeSystem';
import type { InventorySystem } from '../systems/InventorySystem';
import type { InteractionSystem } from '../systems/InteractionSystem';

const FACE_OFFSET: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const DIGIT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];

export class FarmScene extends Phaser.Scene {
  private player!: Player;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private saveSystem: SaveSystem | null = null;
  private night!: Phaser.GameObjects.Rectangle;
  private bed!: Phaser.Geom.Rectangle;
  private sleeping = false;

  constructor() {
    super('Farm');
  }

  create(): void {
    setupSystems(); // 幂等，确保系统就绪

    const map = this.make.tilemap({ key: 'farm' });
    const tileset = map.addTilesetImage('tiles', 'tiles', 16, 16);
    if (tileset) map.createLayer('Ground', tileset, 0, 0);

    // Collision 对象层 → 静态碰撞体（x/y 为像素左上角）
    const colliders = this.physics.add.staticGroup();
    map.getObjectLayer('Collision')?.objects.forEach((o) => {
      const w = o.width ?? 16;
      const h = o.height ?? 16;
      const rect = this.add.rectangle((o.x ?? 0) + w / 2, (o.y ?? 0) + h / 2, w, h, 0x35506f, 0.25);
      this.physics.add.existing(rect, true);
      colliders.add(rect);
    });

    new FarmView(this);

    // 床（睡觉点）
    this.bed = new Phaser.Geom.Rectangle(336, 160, 32, 16);
    this.add.rectangle(this.bed.x, this.bed.y, this.bed.width, this.bed.height, 0x7a3b3b).setOrigin(0).setDepth(2);
    this.add.rectangle(this.bed.x, this.bed.y, this.bed.width, 6, 0xd6d2c4).setOrigin(0).setDepth(2);

    // 出生点（读档则用存档位置）
    const saved = GameState.data.player.position;
    const onFarm = saved.scene === 'Farm';
    const spawn = map.findObject('Objects', (o) => o.name === 'spawn');
    const sx = onFarm ? saved.x : typeof spawn?.x === 'number' ? spawn.x : FARM_SPAWN.x;
    const sy = onFarm ? saved.y : typeof spawn?.y === 'number' ? spawn.y : FARM_SPAWN.y;

    this.player = new Player(this, sx, sy);
    this.player.setDepth(5);
    this.player.facing = GameState.data.player.facing;
    this.physics.add.collider(this.player, colliders);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // 昼夜叠加层（相机固定）
    this.night = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x0a0a2a)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(0);

    this.setupInput();
    this.scene.launch('UIScene');

    void createSaveStorage().then((storage) => {
      this.saveSystem = new SaveSystem(storage);
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.snapshotPlayer());
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const moveKeys = [...CONTROLS.up, ...CONTROLS.down, ...CONTROLS.left, ...CONTROLS.right];
    for (const name of moveKeys) this.keys[name] = kb.addKey(name);

    kb.on('keydown-SPACE', () => this.useTool());
    kb.on('keydown-E', () => this.interact());
    kb.on(`keydown-${CONTROLS.quickSave[0]}`, () => void this.quickSave());
    kb.on(`keydown-${CONTROLS.quickLoad[0]}`, () => void this.quickLoad());

    DIGIT_KEYS.forEach((name, i) => kb.on(`keydown-${name}`, () => this.inv().setSelectedIndex(i)));

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.interact();
      else this.useTool();
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.inv().setSelectedIndex(GameState.data.player.hotbarSelectedIndex + (dy > 0 ? 1 : -1));
    });
  }

  private inv(): InventorySystem {
    return ServiceLocator.get<InventorySystem>(SYS.inventory);
  }

  private facingTile(): { tx: number; ty: number } {
    const ptx = pixelToTile(this.player.x);
    const pty = pixelToTile(this.player.y);
    const [ox, oy] = FACE_OFFSET[this.player.facing];
    return { tx: ptx + ox, ty: pty + oy };
  }

  private useTool(): void {
    if (this.sleeping) return;
    const { tx, ty } = this.facingTile();
    ServiceLocator.get<InteractionSystem>(SYS.interaction).useSelectedOn(tx, ty);
  }

  private interact(): void {
    if (this.sleeping) return;
    if (Phaser.Geom.Rectangle.Contains(this.bed, this.player.x, this.player.y)) {
      void this.sleep('normal');
      return;
    }
    const { tx, ty } = this.facingTile();
    ServiceLocator.get<InteractionSystem>(SYS.interaction).interactOn(tx, ty);
  }

  private snapshotPlayer(): void {
    const p = GameState.data.player;
    p.position = { scene: 'Farm', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    p.facing = this.player.facing;
  }

  private async quickSave(): Promise<void> {
    if (!this.saveSystem) return;
    this.snapshotPlayer();
    await this.saveSystem.save();
    EventBus.emit('debug:toast', { text: '已存档（L 读档）' });
  }

  private async quickLoad(): Promise<void> {
    if (!this.saveSystem) return;
    if (!(await this.saveSystem.load())) {
      EventBus.emit('debug:toast', { text: '无存档' });
      return;
    }
    const pos = GameState.data.player.position;
    this.player.setPosition(pos.x, pos.y);
    this.player.facing = GameState.data.player.facing;
    EventBus.emit('inventory:changed', {});
    EventBus.emit('farm:bulkChanged', {});
    EventBus.emit('debug:toast', { text: '已读档' });
  }

  private async sleep(faintContext: 'normal' | 'farm'): Promise<void> {
    if (this.sleeping) return;
    this.sleeping = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    await new Promise<void>((r) =>
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => r()),
    );

    ServiceLocator.get<TimeSystem>(SYS.time).processNewDay(faintContext); // 步 1–10
    this.player.setPosition(this.bed.centerX, this.bed.bottom + 6);
    this.player.move(0, 0);
    this.snapshotPlayer();
    if (this.saveSystem) await this.saveSystem.save(); // 步 11 自动存档

    this.cameras.main.fadeIn(350, 0, 0, 0);
    const t = GameState.data.time;
    EventBus.emit('debug:toast', {
      text: faintContext === 'farm' ? `体力透支，醒来已是第 ${t.day} 天` : `第 ${t.day} 天，早安`,
    });
    this.sleeping = false;
  }

  update(_time: number, delta: number): void {
    if (this.sleeping) {
      this.player.move(0, 0);
      return;
    }

    let dx = 0;
    let dy = 0;
    if (this.isDown(CONTROLS.up)) dy -= 1;
    if (this.isDown(CONTROLS.down)) dy += 1;
    if (this.isDown(CONTROLS.left)) dx -= 1;
    if (this.isDown(CONTROLS.right)) dx += 1;
    this.player.move(dx, dy);

    ServiceLocator.get<TimeSystem>(SYS.time).update(delta);
    this.night.setAlpha(nightAlpha(GameState.data.time.minute));

    // 到 02:00 强制睡觉（体力透支/熬夜）
    if (GameState.data.time.minute >= DAY_END_MINUTE) void this.sleep('farm');
  }

  private isDown(actions: readonly string[]): boolean {
    return actions.some((k) => this.keys[k]?.isDown ?? false);
  }
}

// 夜晚叠加 alpha：18:00 起渐暗，20:00 后维持
function nightAlpha(minute: number): number {
  if (minute < 18 * 60) return 0;
  if (minute < 20 * 60) return ((minute - 18 * 60) / (2 * 60)) * 0.4;
  return 0.45;
}
