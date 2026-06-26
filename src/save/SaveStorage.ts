// 存储抽象（SPEC 5.12）：解耦「存档逻辑」与「落地介质」，使游戏在浏览器 dev 与
// Tauri 桌面下都能存读档。具体实现：BrowserStorage（localStorage）/ TauriFsStorage（fs）。

export interface SaveStorage {
  save(slot: string, json: string): Promise<void>;
  load(slot: string): Promise<string | null>;
  exists(slot: string): Promise<boolean>;
}

// localStorage 的最小子集抽象：生产注入 window.localStorage，单测注入内存实现。
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class BrowserStorage implements SaveStorage {
  constructor(private readonly store: StorageLike) {}

  private key(slot: string): string {
    return `save:${slot}`;
  }

  async save(slot: string, json: string): Promise<void> {
    this.store.setItem(this.key(slot), json);
  }

  async load(slot: string): Promise<string | null> {
    return this.store.getItem(this.key(slot));
  }

  async exists(slot: string): Promise<boolean> {
    return this.store.getItem(this.key(slot)) !== null;
  }
}
