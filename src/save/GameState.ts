// 中央游戏状态（唯一真相源，SPEC 4.1）。所有系统读它；写须遵守 4.6「字段→owner」约定。
import type { SaveData } from '../types';
import { createNewGame } from './schema';

class GameStateClass {
  private _data: SaveData | null = null;

  get data(): SaveData {
    if (!this._data) throw new Error('GameState 未初始化：先调用 newGame() 或 init()');
    return this._data;
  }

  get initialized(): boolean {
    return this._data !== null;
  }

  init(save: SaveData): void {
    this._data = save;
  }

  newGame(seed: number, playerName?: string): void {
    this._data = createNewGame(seed, playerName);
  }

  reset(): void {
    this._data = null;
  }
}

export const GameState = new GameStateClass();
