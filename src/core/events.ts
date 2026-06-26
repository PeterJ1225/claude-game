// 所有事件名 + 载荷类型（SPEC 4.2）。禁止裸字符串，新增事件照此扩展 EventMap。
import type { Season, Weather } from '../types';

export interface EventMap {
  'time:tick': { minute: number };
  'time:hourTick': { hour: number };
  'time:newDay': { year: number; season: Season; day: number };
  'time:newSeason': { season: Season };
  'weather:changed': { weather: Weather };
  'inventory:changed': Record<string, never>;
  'player:energyChanged': { energy: number; max: number };
  'player:hpChanged': { hp: number; max: number };
  'economy:goldChanged': { gold: number; delta: number };
  'crop:harvested': { cropId: string; qty: number; overflow: number };
  // M0/M0.5 调试事件（仅供 UIScene 演示事件总线链路）
  'debug:playerMoved': { x: number; y: number };
  'debug:toast': { text: string };
}

export type EventName = keyof EventMap;
