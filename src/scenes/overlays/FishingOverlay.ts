import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import { GameState } from '../../save/GameState';
import { ServiceLocator } from '../../core/ServiceLocator';
import { EventBus } from '../../core/EventBus';
import { SYS } from '../../systems/keys';
import { getFish } from '../../data/fish';
import {
  FISHING_BAR_FRACTION,
  FISHING_SKILL_BONUS,
  FISHING_PROGRESS_GAIN,
  FISHING_PROGRESS_LOSS,
  FISHING_XP_CATCH,
} from '../../config/balance';
import type { InventorySystem } from '../../systems/InventorySystem';
import type { SkillSystem } from '../../systems/SkillSystem';
import type { TimeSystem } from '../../systems/TimeSystem';

interface FishingData {
  fishId: string;
  fishName: string;
  difficulty: number;
  parentScene: string;
}

// 钓鱼小游戏（SPEC 5.9）：抛竿→等待咬钩→按住空格让绿条对准黄色鱼标，进度满则上钩。
// 绿条长度随钓鱼技能提升；鱼的移动随难度加快/更乱。结果只取决于操作+技能，不动 GameState.rng。
export class FishingOverlay extends Phaser.Scene {
  private parentScene = 'Beach';
  private fishId = '';
  private fishName = '';
  private difficulty = 30;

  // 状态（位置 0=顶 1=底）
  private phase: 'wait' | 'play' = 'wait';
  private barFrac = FISHING_BAR_FRACTION;
  private barPos = 0.5;
  private barVel = 0;
  private fishPos = 0.5;
  private fishTarget = 0.5;
  private fishTimer = 0;
  private progress = 0.4;
  private done = false;

  // 几何
  private gaugeTop = 0;
  private gaugeH = 150;

  // 视图
  private catchBar!: Phaser.GameObjects.Rectangle;
  private fishMarker!: Phaser.GameObjects.Rectangle;
  private progBar!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;
  private space!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('FishingOverlay');
  }

  create(data: FishingData): void {
    this.parentScene = data.parentScene;
    this.fishId = data.fishId;
    this.fishName = data.fishName;
    this.difficulty = data.difficulty;
    this.phase = 'wait';
    this.barPos = 0.5;
    this.barVel = 0;
    this.fishPos = 0.5;
    this.fishTarget = 0.5;
    this.fishTimer = 0;
    this.progress = 0.4;
    this.done = false;

    this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.55).setOrigin(0);
    const panelW = 120;
    const panelH = 210;
    const px = (DESIGN_WIDTH - panelW) / 2;
    const py = (DESIGN_HEIGHT - panelH) / 2;
    this.add.rectangle(px, py, panelW, panelH, 0x183040).setOrigin(0).setStrokeStyle(2, 0x3a86a8);
    this.add.text(px + panelW / 2, py + 8, `钓鱼 · ${this.fishName}`, { fontSize: '10px', color: '#bfe6ff' }).setOrigin(0.5, 0);

    const gx = px + panelW / 2;
    this.gaugeTop = py + 34;
    this.add.rectangle(gx, this.gaugeTop, 18, this.gaugeH, 0x0c1a24).setOrigin(0.5, 0);

    const skill = GameState.data.player.skills.fishing.level;
    this.barFrac = Math.min(0.6, FISHING_BAR_FRACTION + skill * FISHING_SKILL_BONUS);
    this.catchBar = this.add
      .rectangle(gx, this.gaugeTop + this.gaugeH * this.barPos, 14, this.gaugeH * this.barFrac, 0x4caf50)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.55);
    this.fishMarker = this.add.rectangle(gx, this.gaugeTop + this.gaugeH * this.fishPos, 10, 10, 0xffd451);

    // 进度条（量表右侧，自底向上）
    this.add.rectangle(gx + 16, this.gaugeTop, 6, this.gaugeH, 0x0c1a24).setOrigin(0, 0);
    this.progBar = this.add.rectangle(gx + 16, this.gaugeTop + this.gaugeH, 6, 0, 0x8ad24a).setOrigin(0, 1);

    this.hintText = this.add
      .text(gx, py + panelH - 16, '等待咬钩…', { fontSize: '8px', color: '#bfe6ff' })
      .setOrigin(0.5, 0);

    this.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.on('keydown-ESC', () => this.finish(false));

    this.time.delayedCall(700, () => {
      if (this.done) return;
      this.phase = 'play';
      this.hintText.setText('按住空格 让绿条对准黄点');
    });
  }

  update(_t: number, delta: number): void {
    if (this.done || this.phase !== 'play') return;
    const dt = Math.min(delta, 50) / 1000;

    // 鱼标移动：周期性换目标，难度越高越快越频繁
    this.fishTimer -= delta;
    if (this.fishTimer <= 0) {
      this.fishTarget = 0.08 + Math.random() * 0.84;
      this.fishTimer = 300 + Math.random() * Math.max(120, 760 - this.difficulty * 5);
    }
    const fishSpeed = 1.1 + this.difficulty / 40;
    this.fishPos += (this.fishTarget - this.fishPos) * Math.min(1, dt * fishSpeed);
    this.fishPos = Phaser.Math.Clamp(this.fishPos, 0, 1);

    // 绿条物理：按住上升、松开下落，带阻尼
    const held = this.space.isDown;
    this.barVel += (held ? -2.6 : 2.2) * dt;
    this.barVel *= 0.92;
    this.barPos += this.barVel * dt;
    const half = this.barFrac / 2;
    if (this.barPos < half) {
      this.barPos = half;
      this.barVel = 0;
    } else if (this.barPos > 1 - half) {
      this.barPos = 1 - half;
      this.barVel = 0;
    }

    // 命中判定 + 进度
    const overlap = Math.abs(this.fishPos - this.barPos) <= half;
    this.progress += (overlap ? FISHING_PROGRESS_GAIN : -FISHING_PROGRESS_LOSS) * dt;
    this.progress = Phaser.Math.Clamp(this.progress, 0, 1);

    // 视图
    this.catchBar.y = this.gaugeTop + this.gaugeH * this.barPos;
    this.catchBar.setFillStyle(overlap ? 0x6ee06e : 0x4caf50);
    this.fishMarker.y = this.gaugeTop + this.gaugeH * this.fishPos;
    this.progBar.height = this.gaugeH * this.progress;

    if (this.progress >= 1) this.finish(true);
    else if (this.progress <= 0) this.finish(false);
  }

  private finish(success: boolean): void {
    if (this.done) return;
    this.done = true;
    if (success) {
      const fish = getFish(this.fishId);
      ServiceLocator.get<InventorySystem>(SYS.inventory).addItem(fish.itemId, 1);
      ServiceLocator.get<SkillSystem>(SYS.skill).addXp('fishing', FISHING_XP_CATCH);
      EventBus.emit('debug:toast', { text: `钓到了 ${this.fishName}！` });
    } else {
      EventBus.emit('debug:toast', { text: '鱼跑掉了…' });
    }
    ServiceLocator.get<TimeSystem>(SYS.time).setPaused(false);
    this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
