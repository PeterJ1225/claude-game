import Phaser from 'phaser';
import { MOVE_SPEED } from '../config/balance';
import type { Facing } from '../types';

// 玩家精灵（表现层）。8 向移动、斜向速度归一化。逻辑状态的权威位置在此精灵，
// GameState.player.position 仅为存档/切场景快照（SPEC 4.6 位置特例）。
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Facing = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 12).setOffset(1, 4);
  }

  // dx/dy ∈ {-1,0,1}；斜向归一化避免比直走更快
  move(dx: number, dy: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (dx === 0 && dy === 0) {
      body.setVelocity(0, 0);
      return;
    }
    const len = Math.hypot(dx, dy);
    body.setVelocity((dx / len) * MOVE_SPEED, (dy / len) * MOVE_SPEED);
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dy < 0 ? 'up' : 'down';
    }
  }
}
