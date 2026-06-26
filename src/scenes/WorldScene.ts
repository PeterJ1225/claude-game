import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';
import { CONTROLS } from '../config/controls';
import {
  DAY_END_MINUTE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  FARM_BED,
  FARM_SPAWN,
} from '../config/constants';
import { pixelToTile } from '../utils/grid';
import { GameState } from '../save/GameState';
import { SaveSystem } from '../save/SaveSystem';
import { createSaveStorage } from '../save/storageFactory';
import { setupSystems } from '../systems/setup';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import { getNPC } from '../data/npcs';
import { getItem } from '../data/items';
import { AudioManager } from '../audio/AudioManager';
import type { Facing } from '../types';
import type { TimeSystem } from '../systems/TimeSystem';
import type { InventorySystem } from '../systems/InventorySystem';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { NPCSystem } from '../systems/NPCSystem';
import type { DialogSystem } from '../systems/DialogSystem';
import type { RelationshipSystem } from '../systems/RelationshipSystem';

const TASTE_REACT: Record<string, string> = {
  love: '太喜欢了！',
  like: '挺喜欢的，谢谢。',
  neutral: '谢谢。',
  dislike: '…我不太喜欢这个。',
  hate: '我讨厌这个。',
};

const FACE_OFFSET: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const DIGIT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];

interface SpawnData {
  spawnX?: number;
  spawnY?: number;
  facing?: Facing;
}
interface Teleport {
  zone: Phaser.Geom.Rectangle;
  target: string;
  x: number;
  y: number;
}

function readProps(o: Phaser.Types.Tilemaps.TiledObject): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const props = (o as { properties?: { name: string; value: unknown }[] }).properties;
  if (Array.isArray(props)) for (const p of props) out[p.name] = p.value;
  return out;
}

function nightAlpha(minute: number): number {
  if (minute < 18 * 60) return 0;
  if (minute < 20 * 60) return ((minute - 18 * 60) / (2 * 60)) * 0.45;
  return 0.45;
}

// 玩法世界场景基类：地图加载/碰撞/玩家/相机/输入/时间/昼夜/传送/睡觉/存读档。
// 子类提供 mapKey，并可重写 onSetup（场景专属物体）与 onInteract（交互键处理）。
export abstract class WorldScene extends Phaser.Scene {
  protected abstract readonly mapKey: string;
  protected player!: Player;
  protected map!: Phaser.Tilemaps.Tilemap;
  protected saveSystem: SaveSystem | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private night!: Phaser.GameObjects.Rectangle;
  private teleports: Teleport[] = [];
  private teleportCd = 0;
  protected busy = false; // 睡觉/传送过场中
  protected canFarm = false; // 仅农场可锄地/浇水/播种（子类覆盖）
  protected showWeather = true; // 矿洞地下无天气
  protected useDayNight = true; // 矿洞恒暗，不随时间变亮
  private weatherFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly onWeatherChanged = (): void => this.updateWeather();
  private npcViews = new Map<string, Phaser.GameObjects.Container>();

  create(data?: SpawnData): void {
    setupSystems();
    this.teleports = [];
    this.busy = false;

    const map = this.make.tilemap({ key: this.mapKey });
    this.map = map;
    const tileset = map.addTilesetImage('tiles', 'tiles', 16, 16);
    for (const name of ['Ground', 'Paths', 'Buildings', 'AbovePlayer']) {
      if (tileset && map.getLayer(name)) {
        const layer = map.createLayer(name, tileset, 0, 0);
        if (name === 'AbovePlayer') layer?.setDepth(10);
      }
    }

    const colliders = this.physics.add.staticGroup();
    map.getObjectLayer('Collision')?.objects.forEach((o) => {
      const w = o.width ?? 16;
      const h = o.height ?? 16;
      const r = this.add.rectangle((o.x ?? 0) + w / 2, (o.y ?? 0) + h / 2, w, h, 0x35506f, 0.15);
      this.physics.add.existing(r, true);
      colliders.add(r);
    });

    map.getObjectLayer('Objects')?.objects.forEach((o) => {
      if (o.name !== 'teleport') return;
      const props = readProps(o);
      const w = o.width ?? 16;
      const h = o.height ?? 16;
      this.teleports.push({
        zone: new Phaser.Geom.Rectangle(o.x ?? 0, o.y ?? 0, w, h),
        target: String(props.targetScene ?? 'Farm'),
        x: Number(props.targetX ?? FARM_SPAWN.x),
        y: Number(props.targetY ?? FARM_SPAWN.y),
      });
    });

    const spawn = this.resolveSpawn(data, map);
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.setDepth(5);
    this.player.facing = data?.facing ?? GameState.data.player.facing;
    this.physics.add.collider(this.player, colliders);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.night = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x0a0a2a)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(this.useDayNight ? nightAlpha(GameState.data.time.minute) : 0.35);

    if (this.showWeather) {
      this.updateWeather();
      EventBus.on('weather:changed', this.onWeatherChanged);
    }

    this.setupInput();
    AudioManager.applyFromSettings(); // 按存档音量设置音频
    this.onSetup();
    this.updateNPCs();

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    void createSaveStorage().then((s) => {
      this.saveSystem = new SaveSystem(s);
    });
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('weather:changed', this.onWeatherChanged);
      this.weatherFx?.destroy();
      this.npcViews.forEach((v) => v.destroy());
      this.npcViews.clear();
      // 主动切场景（传送/睡觉/跨场景读档）已把权威 position 写入 GameState，过场期跳过二次快照
      if (!this.busy) this.snapshotPlayer();
    });

    this.teleportCd = 400;
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  // 子类钩子
  protected onSetup(): void {}
  protected onInteract(): boolean {
    return false;
  }
  // 子类自定义「主操作键」用途（矿洞：镐采矿/剑战斗）。返回 true 表示已处理。
  protected onUseTool(): boolean {
    return false;
  }
  // 到 02:00 强制晕倒：默认农场口径；子类（矿洞）可覆写。
  protected onDayTimeout(): void {
    void this.sleep('farm');
  }

  private resolveSpawn(data: SpawnData | undefined, map: Phaser.Tilemaps.Tilemap): { x: number; y: number } {
    if (data?.spawnX !== undefined && data.spawnY !== undefined) {
      return { x: data.spawnX, y: data.spawnY };
    }
    const pos = GameState.data.player.position;
    if (pos.scene === this.scene.key) return { x: pos.x, y: pos.y };
    const obj = map.findObject('Objects', (o) => o.name === 'spawn');
    if (obj && typeof obj.x === 'number' && typeof obj.y === 'number') return { x: obj.x, y: obj.y };
    return { x: FARM_SPAWN.x, y: FARM_SPAWN.y };
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const moveKeys = [...CONTROLS.up, ...CONTROLS.down, ...CONTROLS.left, ...CONTROLS.right];
    for (const name of moveKeys) this.keys[name] = kb.addKey(name);

    kb.on('keydown-SPACE', () => this.useTool());
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-ESC', () => this.openSettings());
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

  protected inv(): InventorySystem {
    return ServiceLocator.get<InventorySystem>(SYS.inventory);
  }

  protected facing(): Facing {
    return this.player.facing;
  }

  protected facingTile(): { tx: number; ty: number } {
    const [ox, oy] = FACE_OFFSET[this.player.facing];
    return { tx: pixelToTile(this.player.x) + ox, ty: pixelToTile(this.player.y) + oy };
  }

  private useTool(): void {
    if (this.busy) return;
    const npcId = this.nearestNPC();
    const slot = this.inv().selectedSlot();
    if (npcId && slot && getItem(slot.itemId).category !== 'tool') {
      this.giftTo(npcId, slot.itemId); // 对 NPC 用手持物 = 送礼
      return;
    }
    if (this.onUseTool()) return; // 子类自定义工具用途（矿洞：镐采矿/剑战斗）
    if (!this.canFarm) return; // 农场外不耕作
    const { tx, ty } = this.facingTile();
    ServiceLocator.get<InteractionSystem>(SYS.interaction).useSelectedOn(tx, ty, this.player.facing);
  }

  private interact(): void {
    if (this.busy) return;
    const npcId = this.nearestNPC();
    if (npcId) {
      this.talkTo(npcId); // 靠近 NPC 按 E = 对话
      return;
    }
    if (this.onInteract()) return;
    const { tx, ty } = this.facingTile();
    ServiceLocator.get<InteractionSystem>(SYS.interaction).interactOn(tx, ty);
  }

  private openSettings(): void {
    if (this.busy) return;
    this.openOverlay('SettingsOverlay', { parentScene: this.scene.key });
  }

  protected snapshotPlayer(): void {
    const p = GameState.data.player;
    p.position = { scene: this.scene.key, x: Math.round(this.player.x), y: Math.round(this.player.y) };
    p.facing = this.player.facing;
  }

  protected async quickSave(): Promise<void> {
    if (!this.saveSystem) return;
    this.snapshotPlayer();
    await this.saveSystem.save();
    EventBus.emit('debug:toast', { text: '已存档（L 读档）' });
  }

  protected async quickLoad(): Promise<void> {
    if (!this.saveSystem) return;
    if (!(await this.saveSystem.load())) {
      EventBus.emit('debug:toast', { text: '无存档' });
      return;
    }
    const pos = GameState.data.player.position;
    if (pos.scene !== this.scene.key) {
      this.busy = true; // 已写权威 position，切场景时 SHUTDOWN 不再覆写
      this.scene.start(pos.scene, { spawnX: pos.x, spawnY: pos.y, facing: GameState.data.player.facing });
      return;
    }
    this.player.setPosition(pos.x, pos.y);
    this.player.facing = GameState.data.player.facing;
    EventBus.emit('inventory:changed', {});
    EventBus.emit('farm:bulkChanged', {});
    EventBus.emit('debug:toast', { text: '已读档' });
  }

  // 睡觉：过夜结算 → 回农场床 → 自动存档（步 11）。可从任意场景触发。
  protected async sleep(faintContext: 'normal' | 'farm'): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    await new Promise<void>((r) =>
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => r()),
    );

    ServiceLocator.get<TimeSystem>(SYS.time).processNewDay(faintContext);
    const bedX = FARM_BED.x + FARM_BED.w / 2;
    const bedY = FARM_BED.y + FARM_BED.h + 6;
    GameState.data.player.position = { scene: 'Farm', x: bedX, y: bedY };
    GameState.data.player.facing = 'down';
    if (this.saveSystem) await this.saveSystem.save();

    const t = GameState.data.time;
    const msg = faintContext === 'farm' ? `体力透支，醒来已是第 ${t.day} 天` : `第 ${t.day} 天，早安`;
    if (this.scene.key !== 'Farm') {
      this.scene.start('Farm', { spawnX: bedX, spawnY: bedY, facing: 'down' });
      EventBus.emit('debug:toast', { text: msg });
      return;
    }
    this.player.setPosition(bedX, bedY);
    this.player.move(0, 0);
    EventBus.emit('inventory:changed', {});
    EventBus.emit('farm:bulkChanged', {});
    this.cameras.main.fadeIn(350, 0, 0, 0);
    EventBus.emit('debug:toast', { text: msg });
    this.busy = false;
  }

  private doTeleport(t: Teleport): void {
    if (this.busy) return;
    this.busy = true;
    this.snapshotPlayer();
    this.scene.start(t.target, { spawnX: t.x, spawnY: t.y, facing: this.player.facing });
  }

  update(_time: number, delta: number): void {
    if (this.busy) {
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
    if (this.useDayNight) this.night.setAlpha(nightAlpha(GameState.data.time.minute));
    this.updateNPCs();

    if (this.teleportCd > 0) this.teleportCd -= delta;
    else {
      for (const tp of this.teleports) {
        if (Phaser.Geom.Rectangle.Contains(tp.zone, this.player.x, this.player.y)) {
          this.doTeleport(tp);
          return;
        }
      }
    }

    if (GameState.data.time.minute >= DAY_END_MINUTE) this.onDayTimeout();
  }

  private isDown(actions: readonly string[]): boolean {
    return actions.some((k) => this.keys[k]?.isDown ?? false);
  }

  // 打开浮层（商店/铁匠/对话）：暂停玩法场景与时间（SPEC 4.3）
  protected openOverlay(key: string, data: object): void {
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(true);
    this.input.enabled = false;
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      this.input.enabled = true;
    });
    this.scene.pause();
    this.scene.launch(key, data);
  }

  private updateNPCs(): void {
    const npcSys = ServiceLocator.get<NPCSystem>(SYS.npc);
    const here = new Set(npcSys.idsInScene(this.scene.key));
    for (const [id, v] of this.npcViews) {
      if (!here.has(id)) {
        v.destroy();
        this.npcViews.delete(id);
      }
    }
    for (const id of here) {
      const t = npcSys.currentTarget(id);
      const v = this.npcViews.get(id);
      if (!v) {
        this.npcViews.set(id, this.createNPCView(id, t.x, t.y));
      } else {
        v.x = Phaser.Math.Linear(v.x, t.x, 0.06);
        v.y = Phaser.Math.Linear(v.y, t.y, 0.06);
      }
    }
  }

  private createNPCView(npcId: string, x: number, y: number): Phaser.GameObjects.Container {
    const color = npcId === 'mira' ? 0xd987c0 : 0x6fa8dc;
    const body = this.add.rectangle(0, 0, 12, 16, color).setStrokeStyle(1, 0x222222);
    const label = this.add.text(0, -13, getNPC(npcId).name, { fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
    return this.add.container(x, y, [body, label]).setDepth(4);
  }

  private nearestNPC(): string | null {
    for (const [id, v] of this.npcViews) {
      if (Phaser.Math.Distance.Between(v.x, v.y, this.player.x, this.player.y) < 24) return id;
    }
    return null;
  }

  private talkTo(npcId: string): void {
    const dialog = ServiceLocator.get<DialogSystem>(SYS.dialog);
    const node = dialog.pickNode(npcId);
    ServiceLocator.get<RelationshipSystem>(SYS.relationship).talk(npcId);
    dialog.consume(npcId, node);
    this.openOverlay('DialogOverlay', {
      name: getNPC(npcId).name,
      lines: node.lines.map((l) => l.text),
      parentScene: this.scene.key,
    });
  }

  private giftTo(npcId: string, itemId: string): void {
    const rel = ServiceLocator.get<RelationshipSystem>(SYS.relationship);
    if (!rel.canGift(npcId)) {
      EventBus.emit('debug:toast', { text: `${getNPC(npcId).name} 这周已经收过礼物了` });
      return;
    }
    const taste = rel.gift(npcId, itemId);
    if (taste === null) return;
    this.inv().consumeSelectedOne(); // 扣掉选中格 1 个（即送出的那件，避免误扣他格同名物）
    EventBus.emit('debug:toast', { text: `${getNPC(npcId).name}：${TASTE_REACT[taste]}` });
  }

  private updateWeather(): void {
    this.weatherFx?.destroy();
    this.weatherFx = undefined;
    const w = GameState.data.time.weather;
    if (w === 'rain' || w === 'storm') {
      this.weatherFx = this.add.particles(0, 0, 'raindrop', {
        x: { min: 0, max: DESIGN_WIDTH },
        y: -6,
        lifespan: 800,
        speedY: { min: 300, max: 380 },
        speedX: { min: -60, max: -30 },
        quantity: w === 'storm' ? 6 : 3,
        frequency: 22,
        alpha: 0.6,
      });
    } else if (w === 'snow') {
      this.weatherFx = this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: DESIGN_WIDTH },
        y: -6,
        lifespan: 4000,
        speedY: { min: 25, max: 55 },
        speedX: { min: -15, max: 15 },
        quantity: 2,
        frequency: 60,
        alpha: 0.85,
      });
    }
    this.weatherFx?.setScrollFactor(0).setDepth(60);
  }
}
