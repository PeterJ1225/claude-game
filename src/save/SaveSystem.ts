// 存档系统（SPEC 5.12）：序列化/反序列化 GameState，通过注入的 SaveStorage 落地。
// 与介质解耦（构造时注入 BrowserStorage / TauriFsStorage），便于单测。
import type { SaveData } from '../types';
import { GameState } from './GameState';
import { migrate } from './schema';
import type { SaveStorage } from './SaveStorage';

export const DEFAULT_SLOT = 'slot1';

export class SaveSystem {
  constructor(private readonly storage: SaveStorage) {}

  async save(slot: string = DEFAULT_SLOT): Promise<void> {
    await this.storage.save(slot, JSON.stringify(GameState.data));
  }

  // 读档成功返回 true（并写入 GameState）；槽位为空或存档损坏/版本不兼容返回 false（SPEC 10.5 容错）。
  async load(slot: string = DEFAULT_SLOT): Promise<boolean> {
    const json = await this.storage.load(slot);
    if (json === null) return false;
    try {
      const raw = JSON.parse(json) as SaveData;
      GameState.init(migrate(raw));
      return true;
    } catch (e) {
      console.error('存档损坏或版本不兼容，已降级为读取失败：', e);
      return false;
    }
  }

  async exists(slot: string = DEFAULT_SLOT): Promise<boolean> {
    return this.storage.exists(slot);
  }
}
