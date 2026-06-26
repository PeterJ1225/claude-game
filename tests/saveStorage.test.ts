import { describe, it, expect } from 'vitest';
import { BrowserStorage, type StorageLike } from '../src/save/SaveStorage';
import { SaveSystem } from '../src/save/SaveSystem';
import { GameState } from '../src/save/GameState';

// 注入的内存 StorageLike（替代 window.localStorage，使存储逻辑可在 node 单测）。
function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('BrowserStorage + SaveSystem 存读档往返', () => {
  it('save 后 load 能完整还原 GameState', async () => {
    const sys = new SaveSystem(new BrowserStorage(memoryStorage()));
    GameState.newGame(2024);
    GameState.data.player.gold = 777;

    expect(await sys.exists()).toBe(false);
    await sys.save();
    expect(await sys.exists()).toBe(true);

    // 破坏内存态，再读档还原
    GameState.newGame(1);
    expect(GameState.data.player.gold).toBe(500);

    expect(await sys.load()).toBe(true);
    expect(GameState.data.player.gold).toBe(777);
    expect(GameState.data.rng.seed).toBe(2024);
  });

  it('load 不存在的槽位返回 false', async () => {
    const sys = new SaveSystem(new BrowserStorage(memoryStorage()));
    GameState.newGame(1);
    expect(await sys.load('nope')).toBe(false);
  });

  it('load 损坏存档不崩溃、返回 false 且不破坏现有状态（SPEC 10.5 容错）', async () => {
    const store = memoryStorage();
    store.setItem('save:slot1', '{ 这不是合法 JSON');
    const sys = new SaveSystem(new BrowserStorage(store));
    GameState.newGame(9);
    expect(await sys.load()).toBe(false);
    expect(GameState.data.rng.seed).toBe(9);
  });

  it('不同槽位互不干扰', async () => {
    const sys = new SaveSystem(new BrowserStorage(memoryStorage()));
    GameState.newGame(1);
    GameState.data.player.gold = 100;
    await sys.save('a');
    GameState.data.player.gold = 200;
    await sys.save('b');
    await sys.load('a');
    expect(GameState.data.player.gold).toBe(100);
    await sys.load('b');
    expect(GameState.data.player.gold).toBe(200);
  });
});
