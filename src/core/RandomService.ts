// 随机服务（SPEC 6.9 RNG 约定）：持有/推进 GameState.rng.state（序列随机），
// 并提供不消耗 state 的域派生。包装 utils/random 的纯函数。禁止直接用 Math.random()。
import { GameState } from '../save/GameState';
import { deriveValue, nextRandom } from '../utils/random';

class RandomServiceClass {
  // 序列随机：就地推进 GameState.rng.state，返回 [0,1)
  next(): number {
    const rng = GameState.data.rng;
    const [value, state] = nextRandom(rng.state);
    rng.state = state;
    return value;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // 域派生：对「同一输入须始终复现」的内容（矿洞层、某日天气兜底等），不消耗 state
  derive(domain: string, ...keys: number[]): number {
    return deriveValue(GameState.data.rng.seed, domain, ...keys);
  }
}

export const RandomService = new RandomServiceClass();
