// 零依赖、纯 TypeScript 的类型化事件总线（SPEC 4.2）。
// 不依赖 Phaser，故逻辑层与单测可在 node 环境使用。
import type { EventMap } from './events';

type AnyHandler = (payload: never) => void;

class EventBusClass {
  private handlers = new Map<keyof EventMap, Set<AnyHandler>>();

  on<K extends keyof EventMap>(event: K, fn: (payload: EventMap[K]) => void): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn as AnyHandler);
  }

  off<K extends keyof EventMap>(event: K, fn: (payload: EventMap[K]) => void): void {
    this.handlers.get(event)?.delete(fn as AnyHandler);
  }

  once<K extends keyof EventMap>(event: K, fn: (payload: EventMap[K]) => void): void {
    const wrap = (payload: EventMap[K]): void => {
      this.off(event, wrap);
      fn(payload);
    };
    this.on(event, wrap);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // 复制一份避免回调内增删监听导致迭代异常
    for (const fn of [...set]) {
      (fn as (p: EventMap[K]) => void)(payload);
    }
  }

  // 监听器计数（性能/泄漏检查用：订阅数不应随天数增长）
  listenerCount(event?: keyof EventMap): number {
    if (event) return this.handlers.get(event)?.size ?? 0;
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }

  // HMR / 单测隔离用
  reset(): void {
    this.handlers.clear();
  }
}

export const EventBus = new EventBusClass();
