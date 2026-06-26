// 纯 PRNG 函数（SPEC 附录 A / 6.9 RNG 约定）。无状态：状态由 core/RandomService 持有。
// - 序列随机：mulberry32（单一 uint32 state，可完整序列化）
// - 域派生：splitmix32 对 seed + 域 + key 哈希，纯函数、不消耗序列 state

// mulberry32 一步：返回 [value in [0,1), nextState]
export function nextRandom(state: number): [number, number] {
  let s = state | 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

// splitmix32 混合一个 uint32
function splitmix32(a: number): number {
  let x = a | 0;
  x = (x + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

// 把字符串域名哈希为 uint32
function hashDomain(domain: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < domain.length; i++) {
    h ^= domain.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// 域派生：(seed, domain, ...keys) -> [0,1)，纯函数、确定性、不依赖序列 state
export function deriveValue(seed: number, domain: string, ...keys: number[]): number {
  let h = splitmix32(seed ^ hashDomain(domain));
  for (const k of keys) {
    h = splitmix32(h ^ (k | 0));
  }
  return h / 4294967296;
}
