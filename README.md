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

## 操作（截至 M1）

| 动作 | 键位 |
| --- | --- |
| 移动 | `W A S D` / 方向键（8 向，斜向归一化） |
| 用手持工具/种子（对朝向瓦片：锄地/浇水/播种） | `空格` 或 左键 |
| 交互（收获成熟作物；在床上则睡觉） | `E` 或 右键 |
| 选择快捷栏 | 数字键 `1`–`9` `0`，或鼠标滚轮 |
| 快速存档 / 读档 | `K` / `L` |

主菜单：**Enter** 或点击「新游戏」开始；有存档时可点「继续」读档。完整键位见 SPEC 附录 B。

**玩一局核心循环**：选锄头(1) → 空格翻地 → 选种子(5) → 空格播种 → 选水壶(2) → 空格浇水 → 走到床(屏幕中右侧)按 `E` 睡觉 → 重复浇水 4 天 → 防风草成熟，按 `E` 收获进背包。

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

## M1（核心农场循环）

已实现：
- **时间系统**：游戏分钟推进（700ms=10 分钟）、昼夜叠加变暗、06:00→次日 02:00 强制睡。
- **过夜结算流水线**（SPEC 4.5，11 步，由 `TimeSystem.processNewDay()` 编排）：出货箱结算 → 换季清苗 → 掷次日天气 → 雨天自动浇水 → 作物生长 → 工具升级 → 恢复体力 → 每日重置 → 广播通知 → 自动存档。
- **农事**：锄地 / 播种 / 浇水 / 生长 / 收获（防风草一次性、青豆多次收获）；耕地与作物可视化。
- **系统**（按 SPEC 4.6 owner + ServiceLocator）：Time / Energy / Inventory / Farm / Crop / Skill / Economy / Tool / Relationship / Interaction。
- **库存 + 快捷栏**（背包前 12 格视图）、**体力条**、**金钱**、**时钟 HUD**。
- **存读档**：睡觉自动存档；主菜单「继续」读档；`K`/`L` 快速存读。

验证：`tsc` / `eslint` / `vitest`（含过夜流水线顺序、作物 4 天成熟、再生作物、库存、以及「种→浇→4 夜→收获→存→读状态一致」整体循环）/ `vite build` 全绿。

## M2（经济与小镇）

已实现：
- **多场景 + 传送**：抽出 `WorldScene` 基类，`FarmScene`/`TownScene` 为子类；农场右侧门 ↔ 小镇（Tiled `Objects` 层数据驱动传送，带冷却防回弹）。
- **卖出**：农场「出货箱」——选中产物走到箱前按 `E` 投放，**睡觉过夜按 `sellPrice` 结算入金币**（过夜流水线第 2 步）。
- **买入**：小镇「种子店」——走到店前按 `E` 开 `ShopOverlay`（暂停场景与时间），点击购买扣金币、入背包。
- HUD 金钱实时更新；跨场景时间/金钱/背包连续。

**玩法扩展**：新游戏后种几株作物 → 收获 → 出货箱投放 → 睡觉收钱 → 走右门进小镇 → 种子店买更多种子 → 回农场扩种。

验证：`tsc` / `eslint` / `vitest`（**45 测试**，含买种扣钱、出货箱卖出、跨天结算、拒卖工具）/ `vite build` 全绿。

## M3（季节与种植深化）

已实现：
- **多季作物**：春(防风草/青豆)、夏(番茄/甜瓜)、秋(南瓜)、夏秋(玉米)；种子店按季供货，冬季无作物。
- **换季清苗**：换季时清除非当季作物（耕地保留），过夜流水线第 3 步。
- **天气视觉**：雨/暴雨/雪用 Phaser 粒子；**雨天过夜自动浇水**（流水线第 5 步）。
- **铁匠升级**：小镇铁匠铺（走到铁匠点按 `E`）——花金币 + 2 天升级工具（铜→铁→金→铱）；升级期工具取走、过夜归还。
- **工具档位收益**：锄头/水壶升级后**作用范围**沿朝向延长（基础 1 格 → 铱 9 格），水壶容量更大。

验证：`tsc` / `eslint` / `vitest`（**48 测试**，含工具升级倒计时/归还、范围 AoE、季节数据）/ `vite build` 全绿。

## 目录

见 `SPEC.md` 第 3 章。简述：`src/scenes` 场景、`src/entities` 精灵、`src/systems` 游戏系统、`src/core` 事件总线/服务、`src/save` 状态与存档、`src/config` 常量与数值、`src/data` 数据驱动定义、`src/utils` 纯函数工具、`tests` 单测、`public/assets` 资源。

## 素材

正式美术未就位前用运行时生成的纯色块占位（M8 整合 CC0 素材）。素材来源与协议将记入 `public/assets/CREDITS.md`。
