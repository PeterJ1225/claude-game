import Phaser from 'phaser';

// 加载资源 + 生成占位纹理（M0 用纯色块占位，正式美术在 M8 整合）。
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // 相对路径加载（base:'./'，SPEC 资源路径硬规范）
    this.load.tilemapTiledJSON('farm', 'assets/tilemaps/farm.json');

    const t = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '加载中…', {
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => t.destroy());
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.scene.start('MainMenu');
  }

  private generatePlaceholderTextures(): void {
    const g = this.add.graphics();
    // 草地瓦片 16×16
    g.fillStyle(0x4a8a4a, 1).fillRect(0, 0, 16, 16);
    g.fillStyle(0x3f7d40, 1).fillRect(2, 2, 3, 3).fillRect(9, 7, 3, 3).fillRect(5, 11, 3, 3);
    g.generateTexture('tiles', 16, 16);
    g.clear();
    // 玩家 12×16
    g.fillStyle(0x222222, 1).fillRect(0, 0, 12, 16);
    g.fillStyle(0xe8c170, 1).fillRect(1, 1, 10, 14);
    g.fillStyle(0x3a2a18, 1).fillRect(1, 1, 10, 4);
    g.generateTexture('player', 12, 16);
    g.destroy();
  }
}
