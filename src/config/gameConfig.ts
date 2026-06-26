import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ZOOM } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { FarmScene } from '../scenes/FarmScene';
import { TownScene } from '../scenes/TownScene';
import { MineScene } from '../scenes/MineScene';
import { BeachScene } from '../scenes/BeachScene';
import { TownFestivalScene } from '../scenes/TownFestivalScene';
import { UIScene } from '../scenes/UIScene';
import { ShopOverlay } from '../scenes/overlays/ShopOverlay';
import { BlacksmithOverlay } from '../scenes/overlays/BlacksmithOverlay';
import { DialogOverlay } from '../scenes/overlays/DialogOverlay';
import { FishingOverlay } from '../scenes/overlays/FishingOverlay';
import { SettingsOverlay } from '../scenes/overlays/SettingsOverlay';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  zoom: ZOOM,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1d2b3a',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, FarmScene, TownScene, MineScene, BeachScene, TownFestivalScene, UIScene, ShopOverlay, BlacksmithOverlay, DialogOverlay, FishingOverlay, SettingsOverlay],
};
