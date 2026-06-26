import { describe, it, expect } from 'vitest';
import { createNewGame, migrate, CURRENT_SAVE_VERSION } from '../src/save/schema';

// 预留迁移测试框架（SPEC 10.4）。M1 起改 SaveData 结构时在此加逐版迁移用例。
describe('saveSystem / migrate', () => {
  it('createNewGame 同 seed 结构确定一致', () => {
    expect(createNewGame(123)).toEqual(createNewGame(123));
  });

  it('migrate 对当前版本存档原样返回', () => {
    const save = createNewGame(5);
    expect(migrate(save)).toBe(save);
    expect(migrate(save).version).toBe(CURRENT_SAVE_VERSION);
  });

  it('migrate 对高于当前实现的版本抛错（容错由 SaveSystem 兜底）', () => {
    const future = { ...createNewGame(5), version: CURRENT_SAVE_VERSION + 1 };
    expect(() => migrate(future)).toThrow();
  });
});
