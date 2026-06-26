// 运行时探测 + 存储工厂（SPEC 5.12 / v2.2.1）。
import { BrowserStorage, type SaveStorage } from './SaveStorage';

// Tauri 2 默认注入 __TAURI_INTERNALS__；window.__TAURI__ 仅在 withGlobalTauri 时才有，不可依赖。
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// 按运行环境选择实现。Tauri 实现走动态 import，避免把 @tauri-apps/plugin-fs 拉进浏览器主包。
export async function createSaveStorage(): Promise<SaveStorage> {
  if (isTauriRuntime()) {
    const { TauriFsStorage } = await import('./TauriFsStorage');
    return new TauriFsStorage();
  }
  return new BrowserStorage(window.localStorage);
}
