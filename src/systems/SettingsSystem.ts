// 设置系统（SPEC 5.12 / 4.6 owner: settings.*）。仅写 GameState.data.settings；
// 音量为 0–1。表现层（AudioManager/全屏）读这些值并据此应用。
import { GameState } from '../save/GameState';

export class SettingsSystem {
  private clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  setBgmVolume(v: number): number {
    GameState.data.settings.bgmVolume = this.clamp01(v);
    return GameState.data.settings.bgmVolume;
  }

  setSfxVolume(v: number): number {
    GameState.data.settings.sfxVolume = this.clamp01(v);
    return GameState.data.settings.sfxVolume;
  }

  setFullscreen(on: boolean): void {
    GameState.data.settings.fullscreen = on;
  }

  setLanguage(lang: string): void {
    GameState.data.settings.language = lang;
  }
}
