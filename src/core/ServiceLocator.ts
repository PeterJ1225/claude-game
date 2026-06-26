// 系统注册与获取（SPEC 4.6）。仅注册逻辑层系统单例，禁止注册 Phaser 场景/实体。
// 仅用于：① 启动期装配单例 ② 取系统调其受控同步方法/无副作用查询。

class ServiceLocatorClass {
  private services = new Map<string, unknown>();

  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  get<T>(key: string): T {
    const s = this.services.get(key);
    if (s === undefined) throw new Error(`ServiceLocator: 未注册的服务 "${key}"`);
    return s as T;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  reset(): void {
    this.services.clear();
  }
}

export const ServiceLocator = new ServiceLocatorClass();
