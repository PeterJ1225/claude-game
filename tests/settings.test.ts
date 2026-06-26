import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/save/GameState';
import { setupSystems } from '../src/systems/setup';
import { ServiceLocator } from '../src/core/ServiceLocator';
import { EventBus } from '../src/core/EventBus';
import { SYS } from '../src/systems/keys';
import type { SettingsSystem } from '../src/systems/SettingsSystem';
import type { TimeSystem } from '../src/systems/TimeSystem';

const settings = (): SettingsSystem => ServiceLocator.get<SettingsSystem>(SYS.settings);

beforeEach(() => {
  ServiceLocator.reset();
  EventBus.reset();
  GameState.newGame(99);
  setupSystems();
});

describe('M8 设置系统', () => {
  it('音量被 clamp 到 0–1 并写入 settings', () => {
    expect(settings().setBgmVolume(1.5)).toBe(1);
    expect(settings().setSfxVolume(-0.2)).toBe(0);
    expect(GameState.data.settings.bgmVolume).toBe(1);
    expect(GameState.data.settings.sfxVolume).toBe(0);
    expect(settings().setSfxVolume(0.45)).toBe(0.45);
  });

  it('全屏/语言写入 settings', () => {
    settings().setFullscreen(true);
    expect(GameState.data.settings.fullscreen).toBe(true);
    settings().setLanguage('en');
    expect(GameState.data.settings.language).toBe('en');
  });
});

describe('M8 性能：无监听器泄漏', () => {
  it('连续过夜 10 天 EventBus 订阅数不增长（系统不按天订阅）', () => {
    const before = EventBus.listenerCount();
    const time = ServiceLocator.get<TimeSystem>(SYS.time);
    for (let i = 0; i < 10; i++) time.processNewDay();
    expect(EventBus.listenerCount()).toBe(before);
    // 推进到第 11 天后日期正确（流水线本身仍正常）
    expect(GameState.data.time.day).toBe(11);
  });
});
