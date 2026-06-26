// 程序化音频（M8）：用 Web Audio API 即时合成短音效，无需二进制素材（真实 CC0 音轨待整合，见 CREDITS）。
// 表现层单例：订阅游戏事件触发音效；读 settings 音量。任何不支持/异常一律静默，绝不抛出。
import { EventBus } from '../core/EventBus';
import { GameState } from '../save/GameState';

type SfxName = 'harvest' | 'coin' | 'levelup' | 'newday' | 'ui';

interface SfxSpec {
  type: OscillatorType;
  freq: number;
  freq2?: number;
  dur: number;
  gain: number;
}

const SFX: Record<SfxName, SfxSpec> = {
  harvest: { type: 'triangle', freq: 520, freq2: 780, dur: 0.18, gain: 0.5 },
  coin: { type: 'square', freq: 880, freq2: 1320, dur: 0.12, gain: 0.35 },
  levelup: { type: 'sawtooth', freq: 440, freq2: 880, dur: 0.35, gain: 0.4 },
  newday: { type: 'sine', freq: 330, freq2: 440, dur: 0.4, gain: 0.4 },
  ui: { type: 'sine', freq: 660, dur: 0.05, gain: 0.25 },
};

class AudioManagerClass {
  private ctx: AudioContext | null = null;
  private inited = false;
  private sfxVol = 0.8;
  private bgmVol = 0.7;

  // 由表现层（UIScene）调用一次：建 AudioContext + 订阅事件。
  init(): void {
    if (this.inited) return;
    this.inited = true;
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    EventBus.on('crop:harvested', () => this.play('harvest'));
    EventBus.on('skill:levelUp', () => this.play('levelup'));
    EventBus.on('economy:goldChanged', (p) => {
      if (p.delta > 0) this.play('coin');
    });
    EventBus.on('time:newDay', () => this.play('newday'));
  }

  applyFromSettings(): void {
    if (!GameState.initialized) return;
    this.sfxVol = GameState.data.settings.sfxVolume;
    this.bgmVol = GameState.data.settings.bgmVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVol = Math.max(0, Math.min(1, v));
    this.play('ui'); // 即时反馈
  }

  // BGM 音量已接线；真实 BGM 音轨待 CC0 素材整合后接入。
  setBgmVolume(v: number): void {
    this.bgmVol = Math.max(0, Math.min(1, v));
  }

  get bgmVolume(): number {
    return this.bgmVol;
  }

  private play(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || this.sfxVol <= 0) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const spec = SFX[name];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, now);
      if (spec.freq2) osc.frequency.exponentialRampToValueAtTime(spec.freq2, now + spec.dur);
      gain.gain.setValueAtTime(this.sfxVol * spec.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + spec.dur);
    } catch {
      /* 静默失败 */
    }
  }
}

export const AudioManager = new AudioManagerClass();
