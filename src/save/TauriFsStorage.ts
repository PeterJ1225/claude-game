// Tauri 桌面存储实现（SPEC 5.12）。用 @tauri-apps/plugin-fs，BaseDirectory.AppData +
// 相对子目录（禁止拼绝对路径）。仅在 Tauri 运行时由 storageFactory 动态加载。
import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import type { SaveStorage } from './SaveStorage';

const SAVE_DIR = 'saves';

export class TauriFsStorage implements SaveStorage {
  private path(slot: string): string {
    return `${SAVE_DIR}/${slot}.json`;
  }

  async save(slot: string, json: string): Promise<void> {
    const dirExists = await exists(SAVE_DIR, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(SAVE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    await writeTextFile(this.path(slot), json, { baseDir: BaseDirectory.AppData });
  }

  async load(slot: string): Promise<string | null> {
    if (!(await this.exists(slot))) return null;
    return readTextFile(this.path(slot), { baseDir: BaseDirectory.AppData });
  }

  async exists(slot: string): Promise<boolean> {
    return exists(this.path(slot), { baseDir: BaseDirectory.AppData });
  }
}
