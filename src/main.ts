import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// 入口：创建 Phaser.Game，注册场景（见 gameConfig）。
new Phaser.Game(gameConfig);
