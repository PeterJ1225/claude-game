import { describe, it, expect } from 'vitest';
import { nextRandom, deriveValue } from '../src/utils/random';
import { GameState } from '../src/save/GameState';
import { RandomService } from '../src/core/RandomService';

describe('utils/random（纯 PRNG）', () => {
  it('nextRandom 确定性：同 state 同结果', () => {
    expect(nextRandom(12345)).toEqual(nextRandom(12345));
  });

  it('nextRandom 值域 [0,1)', () => {
    let s = 1;
    for (let i = 0; i < 1000; i++) {
      const [v, ns] = nextRandom(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      s = ns;
    }
  });

  it('deriveValue 确定性、对不同 key/seed 不同、不依赖序列 state', () => {
    expect(deriveValue(999, 'mine', 5)).toBe(deriveValue(999, 'mine', 5));
    expect(deriveValue(999, 'mine', 5)).not.toBe(deriveValue(999, 'mine', 6));
    expect(deriveValue(999, 'mine', 5)).not.toBe(deriveValue(1000, 'mine', 5));
  });
});

describe('RandomService（序列随机随 GameState.rng.state 持久化，读档不漂移）', () => {
  it('从保存的 state 续跑得到相同后续序列', () => {
    GameState.newGame(777);
    const a = [RandomService.next(), RandomService.next(), RandomService.next()];
    const savedState = GameState.data.rng.state;

    // 模拟读档：恢复 state 后续两个
    GameState.data.rng.state = savedState;
    const b = [RandomService.next(), RandomService.next()];

    // 从头连续跑 5 个作为基准
    GameState.newGame(777);
    const full = [
      RandomService.next(),
      RandomService.next(),
      RandomService.next(),
      RandomService.next(),
      RandomService.next(),
    ];

    expect(a).toEqual([full[0], full[1], full[2]]);
    expect(b).toEqual([full[3], full[4]]);
  });
});
