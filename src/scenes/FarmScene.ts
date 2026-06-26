import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { CONTROLS } from '../config/controls';
import { FARM_SPAWN } from '../config/constants';
import { GameState } from '../save/GameState';
import { SaveSystem } from '../save/SaveSystem';
import { createSaveStorage } from '../save/storageFactory';

// 农场主玩法场景：加载手写 Tiled 地图，从 Collision 对象层生成静态碰撞体，
// 玩家可 8 向移动且撞墙被挡，相机跟随。
export class FarmScene extends Phaser.Scene {
  private player!: Player;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private saveSystem: SaveSystem | null = null;

  constructor() {
    super('Farm');
  }

  create(): void {
    const map = this.make.tilemap({ key: 'farm' });
    const tileset = map.addTilesetImage('tiles', 'tiles', 16, 16);
    if (tileset) {
      map.createLayer('Ground', tileset, 0, 0);
    }

    // 从 Collision 对象层生成静态碰撞体。
    // Tiled 矩形对象的 x/y 为像素坐标左上角，故中心 = x + w/2、y + h/2。
    const colliders = this.physics.add.staticGroup();
    const collisionLayer = map.getObjectLayer('Collision');
    collisionLayer?.objects.forEach((o) => {
      const w = o.width ?? 16;
      const h = o.height ?? 16;
      const cx = (o.x ?? 0) + w / 2;
      const cy = (o.y ?? 0) + h / 2;
      const rect = this.add.rectangle(cx, cy, w, h, 0x35506f, 0.35);
      this.physics.add.existing(rect, true);
      colliders.add(rect);
    });

    // 出生点
    const spawn = map.findObject('Objects', (o) => o.name === 'spawn');
    const sx = typeof spawn?.x === 'number' ? spawn.x : FARM_SPAWN.x;
    const sy = typeof spawn?.y === 'number' ? spawn.y : FARM_SPAWN.y;

    this.player = new Player(this, sx, sy);
    this.physics.add.collider(this.player, colliders);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // 显式逐个注册按键，避免对 addKeys 字符串拆分键名的隐式假设
    const kb = this.input.keyboard;
    if (kb) {
      const moveKeys = [...CONTROLS.up, ...CONTROLS.down, ...CONTROLS.left, ...CONTROLS.right];
      for (const name of moveKeys) {
        this.keys[name] = kb.addKey(name);
      }
    }

    // UIScene 幂等 launch（防重复进农场时重复启动）
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // M0.5：存档抽象演示（K 存 / L 读，走 SaveStorage：dev=localStorage，Tauri=fs）
    // 用字母键而非 F5（F5 在浏览器会刷新页面）。
    void createSaveStorage().then((storage) => {
      this.saveSystem = new SaveSystem(storage);
    });
    if (kb) {
      kb.on(`keydown-${CONTROLS.quickSave[0]}`, () => {
        void this.quickSave();
      });
      kb.on(`keydown-${CONTROLS.quickLoad[0]}`, () => {
        void this.quickLoad();
      });
    }

    // 离开农场前把玩家精灵位置快照进 GameState（SPEC 4.6 位置特例：切场景时快照）
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.snapshotPlayer());
  }

  // 把玩家精灵的实时位置快照进 GameState（4.6 位置特例：表现层→状态，仅存档/切场景时）
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
    const ok = await this.saveSystem.load();
    if (!ok) {
      EventBus.emit('debug:toast', { text: '无存档' });
      return;
    }
    const pos = GameState.data.player.position;
    this.player.setPosition(pos.x, pos.y);
    EventBus.emit('debug:toast', { text: '已读档' });
  }

  private isDown(actions: readonly string[]): boolean {
    return actions.some((k) => this.keys[k]?.isDown ?? false);
  }

  update(): void {
    let dx = 0;
    let dy = 0;
    if (this.isDown(CONTROLS.up)) dy -= 1;
    if (this.isDown(CONTROLS.down)) dy += 1;
    if (this.isDown(CONTROLS.left)) dx -= 1;
    if (this.isDown(CONTROLS.right)) dx += 1;
    this.player.move(dx, dy);
    EventBus.emit('debug:playerMoved', { x: Math.round(this.player.x), y: Math.round(this.player.y) });
  }
}
