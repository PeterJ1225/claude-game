import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../src/core/EventBus';

// 这个测试本身就是 SPEC 4.2 核心主张的验证：EventBus 零依赖、不触碰 Phaser，
// 可在 Vitest 的 node 环境直接 import 运行。
describe('EventBus', () => {
  beforeEach(() => EventBus.reset());

  it('on/emit 传递类型化载荷', () => {
    let got = 0;
    EventBus.on('player:energyChanged', (p) => {
      got = p.energy;
    });
    EventBus.emit('player:energyChanged', { energy: 42, max: 270 });
    expect(got).toBe(42);
  });

  it('off 取消订阅', () => {
    let calls = 0;
    const fn = (): void => {
      calls++;
    };
    EventBus.on('inventory:changed', fn);
    EventBus.emit('inventory:changed', {});
    EventBus.off('inventory:changed', fn);
    EventBus.emit('inventory:changed', {});
    expect(calls).toBe(1);
  });

  it('once 只触发一次', () => {
    let calls = 0;
    EventBus.once('inventory:changed', () => {
      calls++;
    });
    EventBus.emit('inventory:changed', {});
    EventBus.emit('inventory:changed', {});
    expect(calls).toBe(1);
  });

  it('reset 清空所有订阅', () => {
    let calls = 0;
    EventBus.on('inventory:changed', () => {
      calls++;
    });
    EventBus.reset();
    EventBus.emit('inventory:changed', {});
    expect(calls).toBe(0);
  });
});
