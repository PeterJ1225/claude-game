# 星露谷物语类游戏（占位）

一款 2D 像素农场经营 + 轻度 RPG 游戏。本仓库的**唯一权威规格**是 [`SPEC.md`](./SPEC.md)；本文件只讲怎么运行/测试/构建。

## 环境前置

- Node.js LTS（>= 20）
- （M0.5 起，桌面壳）Rust 工具链 + Windows WebView2 Runtime

## 安装与运行

```bash
npm install        # 安装依赖
npm run dev        # 浏览器开发（最快迭代），默认 http://localhost:5173
npm test           # 运行单元测试（Vitest，纯逻辑）
npm run lint       # ESLint 检查
npm run format     # Prettier 格式化
npm run build      # 类型检查 + 产物构建
npm run tauri:dev  # 桌面窗口开发（M0.5 起，需 Rust 工具链）
npm run tauri:build # 产出桌面安装包（需 Rust + WebView2）
```

> 桌面壳（Tauri）已在 **M0.5** 接入；`tauri:dev` / `tauri:build` 需先装 **Rust 工具链 + Windows Build Tools + WebView2**（脚本在缺失时会给出前置提示）。浏览器开发仅需 Node。

## 操作（M0 / M0.5）

| 动作 | 键位 |
| --- | --- |
| 移动 | `W A S D` / 方向键（8 向，斜向归一化） |
| 存档 / 读档（M0.5 演示） | `K` / `L` |

主菜单按 **Enter** 或点击「新游戏」进入农场。完整键位见 SPEC 附录 B。

## 当前进度：M0（脚手架）

已实现：
- Vite + TypeScript(strict) + Phaser 3 工程，ESLint / Prettier / Vitest。
- 场景流程 `Boot → Preload → MainMenu → Farm`，并行 `UIScene`。
- 农场加载手写 Tiled 地图（`public/assets/tilemaps/farm.json`），玩家占位精灵可 8 向移动、撞墙被挡，相机跟随。
- 基础设施：零依赖 `EventBus`、中央 `GameState`、`ServiceLocator`、`RandomService`，以及 `constants/balance/controls`。
- 单测覆盖 `grid` 坐标、`EventBus`、`RandomService`（读档不漂移）、`createNewGame`。

### M0 验收（DoD）

```bash
npm run dev    # 出主菜单 → 进农场，WASD 可走动且撞墙被挡
npm test       # 全绿
npm run lint   # 0 error
```

## M0.5（桌面壳与存储）

已实现：
- **存储抽象** `SaveStorage`：`BrowserStorage`（localStorage，基于注入的 `StorageLike`）+ `TauriFsStorage`（`@tauri-apps/plugin-fs`，AppData）；`isTauriRuntime()`(`__TAURI_INTERNALS__`) 探测、`createSaveStorage()` 工厂（Tauri 实现走动态 import，不进浏览器主包）。
- `SaveSystem`（序列化 GameState ↔ 存储）；农场内 `K` 存 / `L` 读演示（浏览器走 localStorage）。
- **Tauri 2 脚手架** `src-tauri/`（Cargo.toml、tauri.conf.json、capabilities/default.json、main/lib.rs、占位图标）+ `tauri:dev/tauri:build` 脚本 + Rust 前置检查脚本。

验证：`tsc` / `eslint` / `vitest`（23 测试，含存读档往返）/ `vite build` 全绿，`TauriFsStorage` 已代码分割出主包。

> ⚠️ 本机未装 Rust，故 `npm run tauri:dev` 开窗这一步未在此验证；装好 Rust 工具链后即可运行。`npm run dev` 不受影响。

## 目录

见 `SPEC.md` 第 3 章。简述：`src/scenes` 场景、`src/entities` 精灵、`src/systems` 游戏系统、`src/core` 事件总线/服务、`src/save` 状态与存档、`src/config` 常量与数值、`src/data` 数据驱动定义、`src/utils` 纯函数工具、`tests` 单测、`public/assets` 资源。

## 素材

正式美术未就位前用运行时生成的纯色块占位（M8 整合 CC0 素材）。素材来源与协议将记入 `public/assets/CREDITS.md`。
