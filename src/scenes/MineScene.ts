import Phaser from 'phaser';
import { WorldScene } from './WorldScene';
import { EventBus } from '../core/EventBus';
import { ServiceLocator } from '../core/ServiceLocator';
import { SYS } from '../systems/keys';
import { GameState } from '../save/GameState';
import { tileKey } from '../utils/grid';
import { getMonster } from '../data/monsters';
import {
  COMBAT_XP_KILL,
  ENERGY_COST,
  FAINT_MINE_ITEM_LOSS_MAX,
  MINING_XP_NODE,
} from '../config/balance';
import { FARM_SPAWN, TILE_SIZE, TOWN_MINE_RETURN } from '../config/constants';
import type { MonsterDef } from '../types';
import type { EnergySystem } from '../systems/EnergySystem';
import type { SkillSystem } from '../systems/SkillSystem';
import type { CombatSystem } from '../systems/CombatSystem';
import type { MiningSystem } from '../systems/MiningSystem';
import type { EconomySystem } from '../systems/EconomySystem';

interface Mob {
  sprite: Phaser.GameObjects.Rectangle;
  hp: number;
  def: MonsterDef;
}

const ORE_COLOR: Record<string, number> = {
  copper_ore: 0xb87333,
  iron_ore: 0xbfc4c9,
  gold_ore: 0xffd451,
  coal: 0x33333a,
  stone: 0x7a7a7a,
};

export class MineScene extends WorldScene {
  protected readonly mapKey = 'mine';
  protected canFarm = false;
  protected showWeather = false;
  protected useDayNight = false;

  private floor = 1;
  private rocks = new Map<string, { go: Phaser.GameObjects.Rectangle; ore: string | null }>();
  private mobs: Mob[] = [];
  private ladder!: Phaser.Geom.Rectangle;
  private exit!: Phaser.Geom.Rectangle;
  private ladderCd = 0;

  constructor() {
    super('Mine');
  }

  protected onSetup(): void {
    this.cameras.main.setBackgroundColor('#171225');
    const data = (this.scene.settings.data ?? {}) as { floor?: number };
    this.floor = data.floor ?? 1;
    this.rocks = new Map();
    this.mobs = [];

    const combat = ServiceLocator.get<CombatSystem>(SYS.combat);
    combat.resetIframe();
    const mining = ServiceLocator.get<MiningSystem>(SYS.mining);
    mining.descend(this.floor);
    const layer = mining.generateLayer(this.floor);

    const rockGroup = this.physics.add.staticGroup();
    for (const r of layer.rocks) {
      const color = r.ore ? (ORE_COLOR[r.ore] ?? 0x8a8a8a) : 0x6b6b6b;
      const go = this.add
        .rectangle(r.tx * TILE_SIZE + 8, r.ty * TILE_SIZE + 8, 14, 14, color)
        .setStrokeStyle(1, 0x2a2a2a)
        .setDepth(1);
      this.physics.add.existing(go, true);
      rockGroup.add(go);
      this.rocks.set(tileKey(r.tx, r.ty), { go, ore: r.ore });
    }
    this.physics.add.collider(this.player, rockGroup);

    const lx = layer.ladder.tx * TILE_SIZE;
    const ly = layer.ladder.ty * TILE_SIZE;
    this.ladder = new Phaser.Geom.Rectangle(lx, ly, TILE_SIZE, TILE_SIZE);
    this.add.rectangle(lx + 8, ly + 8, 14, 14, 0x2a2a3a).setStrokeStyle(1, 0xffd451).setDepth(1);
    this.add.text(lx + 8, ly + 8, '▼', { fontSize: '9px', color: '#ffd451' }).setOrigin(0.5).setDepth(1);

    // 出口（返回小镇）：地图 spawn 处
    const spawn = this.map.findObject('Objects', (o) => o.name === 'spawn');
    const ex = typeof spawn?.x === 'number' ? spawn.x : 320;
    const ey = typeof spawn?.y === 'number' ? spawn.y : 320;
    this.exit = new Phaser.Geom.Rectangle(ex - 12, ey - 12, 24, 24);
    this.add.rectangle(ex, ey, 16, 16, 0x3a3a4a).setStrokeStyle(1, 0x8fd4ff).setDepth(1);
    this.add.text(ex, ey - 10, '出口(E)', { fontSize: '7px', color: '#8fd4ff' }).setOrigin(0.5).setDepth(1);

    for (const m of layer.monsters) {
      const def = getMonster(m.type);
      const color = m.type === 'bat' ? 0x7a5a8a : 0x6abe30;
      const sprite = this.add
        .rectangle(m.tx * TILE_SIZE + 8, m.ty * TILE_SIZE + 8, 12, 12, color)
        .setStrokeStyle(1, 0x222222)
        .setDepth(4);
      this.mobs.push({ sprite, hp: def.hp, def });
    }

    this.add
      .text(4, 16, `矿洞 B${this.floor}`, {
        fontSize: '9px',
        color: '#ffd451',
        backgroundColor: '#00000066',
        padding: { x: 2, y: 1 },
      })
      .setScrollFactor(0)
      .setDepth(70);

    const p = GameState.data.player;
    EventBus.emit('player:hpChanged', { hp: p.hp, max: p.maxHp });
    this.ladderCd = 600;
  }

  protected onInteract(): boolean {
    if (Phaser.Geom.Rectangle.Contains(this.exit, this.player.x, this.player.y)) {
      this.leaveMine();
      return true;
    }
    return false;
  }

  // 矿洞内 02:00 强制晕倒 = 矿洞晕倒（送回农场 + 矿洞口径惩罚）
  protected onDayTimeout(): void {
    void this.faint();
  }

  protected onUseTool(): boolean {
    const slot = this.inv().selectedSlot();
    if (!slot) return false;
    if (slot.itemId === 'pickaxe') {
      this.minePick();
      return true;
    }
    if (slot.itemId === 'sword') {
      this.swingSword();
      return true;
    }
    return false;
  }

  private minePick(): void {
    const { tx, ty } = this.facingTile();
    const rock = this.rocks.get(tileKey(tx, ty));
    if (!rock) return;
    ServiceLocator.get<EnergySystem>(SYS.energy).trySpend(ENERGY_COST.pickaxe);
    const inv = this.inv();
    inv.addItem(rock.ore ?? 'stone', 1);
    ServiceLocator.get<SkillSystem>(SYS.skill).addXp('mining', MINING_XP_NODE);
    rock.go.destroy();
    this.rocks.delete(tileKey(tx, ty));
  }

  private swingSword(): void {
    ServiceLocator.get<EnergySystem>(SYS.energy).trySpend(ENERGY_COST.sword);
    const dmg = ServiceLocator.get<CombatSystem>(SYS.combat).swordDamage();
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(m.sprite.x, m.sprite.y, this.player.x, this.player.y) < 30) {
        m.hp -= dmg;
        m.sprite.setFillStyle(0xffffff);
        this.time.delayedCall(60, () => {
          if (m.hp > 0) m.sprite.setFillStyle(m.def.id === 'bat' ? 0x7a5a8a : 0x6abe30);
        });
        if (m.hp <= 0) this.killMob(m);
      }
    }
  }

  private killMob(m: Mob): void {
    const drops = ServiceLocator.get<MiningSystem>(SYS.mining).rollMonsterDrops(m.def);
    const inv = this.inv();
    for (const d of drops) inv.addItem(d.itemId, d.qty);
    ServiceLocator.get<SkillSystem>(SYS.skill).addXp('combat', COMBAT_XP_KILL);
    m.sprite.destroy();
    m.hp = 0;
  }

  private leaveMine(): void {
    this.busy = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Town', { spawnX: TOWN_MINE_RETURN.x, spawnY: TOWN_MINE_RETURN.y });
    });
  }

  private descendLadder(): void {
    this.busy = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ floor: this.floor + 1 });
    });
  }

  private async faint(): Promise<void> {
    this.busy = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    await new Promise<void>((r) =>
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => r()),
    );
    ServiceLocator.get<EconomySystem>(SYS.economy).applyFaintPenalty('mine');
    this.inv().loseRandom(FAINT_MINE_ITEM_LOSS_MAX);
    ServiceLocator.get<EnergySystem>(SYS.energy).faintMine();
    GameState.data.player.position = { scene: 'Farm', x: FARM_SPAWN.x, y: FARM_SPAWN.y };
    if (this.saveSystem) await this.saveSystem.save();
    this.scene.start('Farm', { spawnX: FARM_SPAWN.x, spawnY: FARM_SPAWN.y, facing: 'down' });
    EventBus.emit('debug:toast', { text: '你在矿洞昏倒了…在农场醒来（损失了一些东西）' });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.busy) return;

    const combat = ServiceLocator.get<CombatSystem>(SYS.combat);
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const dx = this.player.x - m.sprite.x;
      const dy = this.player.y - m.sprite.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 10) {
        const sp = (m.def.speed * delta) / 1000;
        m.sprite.x += (dx / dist) * sp;
        m.sprite.y += (dy / dist) * sp;
      }
      if (dist < 13) {
        const res = combat.hitPlayer(m.def.attack, time);
        if (res === 'hit') {
          this.player.setTint(0xff5555);
          this.time.delayedCall(140, () => this.player.clearTint());
        } else if (res === 'fainted') {
          void this.faint();
          return;
        }
      }
    }

    if (this.ladderCd > 0) this.ladderCd -= delta;
    else if (Phaser.Geom.Rectangle.Contains(this.ladder, this.player.x, this.player.y)) {
      this.descendLadder();
    }
  }
}
