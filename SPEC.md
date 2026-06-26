# 星露谷物语类游戏 —— 开发规格说明书 (SPEC) · v2.2.1

> 本文件是交给 **Claude Code** 的唯一权威规格。开发任何功能前，先阅读本文件相关章节；有歧义时，以本文件为准；需要变更约定时，更新本文件并在「决策记录」追加一条。
>
> **v2 说明**：在 v1 多维度评审基础上，补齐了系统通信模型、过夜结算流水线、SaveData 与存储抽象、核心数值/算法基线、对话/烹饪/键位接口与里程碑预算。带 **【v2】** 标记的小节是新增或重写的权威约定。
>
> **v2.1 说明**：对 v2 又做了一轮对抗式验证，修掉了 v2 自身引入的瑕疵——owner 表「唯一 writer」补全且消除多 owner、逻辑层禁 import 扩到 `entities/` 并区分「值 import 禁 / `import type` 放行」、过夜流水线步骤改为委托各 owner 的「编排期结算方法」、掷天气纳入节日强制晴、配方解锁消除双真相源、补水壶水量等运行态字段。带 **【v2.1】** 标记处为本次修订。
>
> **v2.2 说明**：经一轮独立复审，进一步消除"双真相源/软口径/边界未定"——RNG 改 `{seed,state}` 持久化 + 域派生（根除读档后序列重复/漂移）、过夜流水线补 `time.minute=360` 回到 06:00、晕倒恢复按 `faintContext` 分支（消除"先 energy=maxEnergy 再说晕倒"的矛盾）、删 `unlocked.tools`/`unlocked.mineLevel` 双真相源、快捷栏定为背包前 12 格视图（删独立 `hotbar`）、Tauri 探测改 `__TAURI_INTERNALS__`、资源路径硬规范、8 向移动定死、补 `InteractionSystem`、节日 flag 加年份。带 **【v2.2】** 标记处为本次修订。
>
> **v2.2.1 说明**：一轮文档清理补丁——存档版本与迁移口径明确（首版 `version=1`，无需为规格期演进写迁移）、第 16 章历史摘要加"以 v2.2 为准"免责声明消除旧字段残影、`RandomService` 从 `utils` 拆到 `core`（避免"纯函数工具"持有状态）、过夜流水线补步 10 集中广播 `time:newDay`/`weather:changed` 等通知事件（存档顺延步 11）、补 `createNewGame()` 初始 SaveData 默认值、给最小 `EventMap` 形状、整理规则与 M0.5 存储测试口径细化。带 **【v2.2.1】** 标记处为本次修订。变更摘要见第 16 章。

---

## 0. 速览 (TL;DR)

| 维度 | 决策 |
| --- | --- |
| 游戏类型 | 2D 像素农场经营 + 轻度 RPG（星露谷物语 / Stardew Valley 类） |
| 视角 | 俯视 45° 斜视角（top-down），瓦片地图 |
| 目标平台 | **桌面应用**（Windows 优先，兼容 macOS / Linux） |
| 语言 | **TypeScript**（strict 模式） |
| 游戏引擎 | **Phaser 3** |
| 构建工具 | **Vite** |
| 桌面壳 | **Tauri 2**（首选，轻量原生）；Electron 为备选 |
| 测试 | **Vitest**（核心逻辑单测） |
| 代码规范 | ESLint + Prettier |
| 包管理 | npm（统一用 npm，勿混用 pnpm/yarn） |
| 美术/音频 | **CC0 免费开源素材**（Kenney / itch.io / OpenGameArt） |
| 首版范围 | 较完整：核心农场循环 + 经济 + 季节 + 社交 + 矿洞战斗 + 钓鱼 + 节日 |
| 架构核心 | 数据驱动 + 系统解耦 + 单一中央存档状态 + **通信模型权威约定（4.6）** |
| 事件总线 | **【v2】零依赖纯 TS 类型化 emitter（不依赖 Phaser，保证逻辑可无渲染测试）** |
| 关键基线 | **【v2】数值/控制/存档/流水线均已定基线，见第 4.5、附录 A/B** |

**一句话愿景**：玩家继承一座荒废的农场，通过种地、养殖、采矿、钓鱼、与小镇居民建立关系，把农场和生活逐步经营起来，体验四季流转的治愈型慢节奏生活。

---

## 1. 游戏设计概述

### 1.1 核心玩法循环 (Core Loop)

```
起床(恢复体力) → 规划当天 → 农场劳作(耕地/播种/浇水/收获)
   → 外出(进镇社交 / 下矿采矿战斗 / 钓鱼) → 出售产物赚钱
   → 用钱升级工具/买种子/解锁内容 → 体力耗尽或到深夜 → 睡觉(进入下一天)
```

季节循环（每季 28 天）→ 年循环。不同季节可种植不同作物，触发不同节日。

### 1.2 设计支柱 (Design Pillars)

1. **治愈慢节奏**：没有强制失败，玩家自定节奏。
2. **有意义的选择**：今天的时间/体力有限，怎么分配是核心乐趣。**这条支柱要成立，依赖体力/时间/价值的具体数值基线——见附录 A。**
3. **可成长的反馈**：农场、关系、技能、装备持续可见地变好。
4. **数据可扩展**：作物、物品、NPC、鱼、怪物均由数据文件定义，便于持续加内容。

### 1.3 参考与边界

- 玩法参考星露谷物语，但**不复制其美术、文本、音乐、地图、角色等任何受版权保护的素材**。
- 所有名称、剧情、角色均原创；所有素材使用 CC0 或自制。

---

## 2. 技术栈与理由

### 2.1 选型

| 层 | 技术 | 理由 |
| --- | --- | --- |
| 语言 | TypeScript (strict) | 类型安全，利于 AI 生成可维护代码、重构和补全 |
| 引擎 | Phaser 3 (v3.80+) | 成熟 2D 引擎，内置瓦片地图、精灵、动画、输入、音频、相机；纯代码驱动，最适合 Claude Code |
| 构建 | Vite (v5+) | 极快热重载，TS 原生支持，生态成熟 |
| 桌面壳 | Tauri 2 | 体积小（~10MB）、性能好、安全；提供原生文件系统用于存档 |
| 测试 | Vitest | 与 Vite 同源，零额外配置，快 |
| Lint/格式化 | ESLint + Prettier | 统一风格 |
| 状态/事件 | **【v2】自建零依赖 EventBus + 自建轻量 GameState 单例** | 不引入 Redux 等重型库；EventBus 不再封装 Phaser（见 4.2 理由） |

### 2.2 为什么 Tauri 而非 Electron（默认决策）

- **体积**：Tauri 安装包约 10MB 量级，Electron 通常 100MB+。
- **资源占用**：Tauri 用系统 WebView，内存更低。
- **存档**：Tauri 的 `plugin-fs` 提供安全的本地文件读写，适合 JSON 存档。

**备选 Electron 的场景**：若在某平台遇到 WebView 渲染/性能不一致（尤其 Linux WebKitGTK），可切换到 Electron 获得统一 Chromium。切换不影响前端游戏代码（前端与桌面壳通过 **5.12 的 `SaveStorage` 抽象**解耦）。**做出切换时必须在「决策记录」登记。**

### 2.3 运行环境前置

- Node.js LTS（>= 20）
- Rust 工具链（**仅 M0.5 及之后的桌面壳构建需要**：`rustup` + 平台 C 编译器）
- Windows：需安装 WebView2 Runtime（**仅 Tauri 桌面壳 M0.5+ 需要**；M0 浏览器开发无需。Win10/11 通常自带）

> **【v2】环境降级路径**：M0（脚手架与核心玩法）**只需 Node，不需 Rust**。启动时若检测不到 `cargo`/`rustc`，**记录前置提示并继续浏览器开发，不阻塞玩法迭代**（详见第 8 章 M0/M0.5 拆分）。

---

## 3. 项目结构

```
claude_game/
├── index.html                  # Vite 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts            # 复用 vite.config（defineConfig from 'vitest/config'），test.environment='node'
├── eslint.config.js            # 含 no-restricted-imports 规则禁止逻辑层 import 'phaser'（见 4.2）
├── .prettierrc
├── SPEC.md                     # 本规格（权威）
├── CLAUDE.md                   # 给 Claude Code 的精简工作指令（指向本文件）
├── README.md                   # 人类可读的运行/构建说明
│
├── public/
│   └── assets/                 # 静态资源（Vite 原样拷贝）
│       ├── sprites/            # 角色、作物、物品、怪物精灵图（精灵表 + JSON atlas）
│       ├── tilesets/           # 瓦片集图
│       ├── tilemaps/           # Tiled 导出的 .json 地图
│       ├── audio/
│       │   ├── bgm/            # 背景音乐
│       │   └── sfx/            # 音效
│       ├── fonts/              # 位图字体
│       ├── ui/                 # UI 图（面板、图标、按钮）
│       └── CREDITS.md          # 素材来源与协议（见 7.1）
│
├── src/                        # 前端游戏源码
│   ├── main.ts                 # 入口：创建 Phaser.Game，注册场景
│   ├── config/
│   │   ├── gameConfig.ts       # Phaser 配置（分辨率、像素缩放、物理）
│   │   ├── constants.ts        # 全局结构常量（瓦片尺寸、背包/快捷栏格数、每日时段…）
│   │   ├── balance.ts          # 【v2】数值平衡基线（体力/HP/能耗/价格/好感/天气概率…，见附录 A）
│   │   └── controls.ts         # 【v2】默认键位映射（见附录 B）
│   │
│   ├── scenes/                 # Phaser 场景
│   │   ├── BootScene.ts        # 加载 loading 资源
│   │   ├── PreloadScene.ts     # 加载全部资源 + 进度条
│   │   ├── MainMenuScene.ts    # 新游戏/继续/设置
│   │   ├── FarmScene.ts        # 农场（主玩法地图）
│   │   ├── TownScene.ts        # 小镇
│   │   ├── MineScene.ts        # 矿洞（多层）
│   │   ├── BeachScene.ts       # 海滩（钓鱼）
│   │   ├── UIScene.ts          # 常驻 HUD（与玩法场景并行运行）
│   │   └── overlays/           # 弹窗型场景：库存、对话、商店、菜单
│   │       ├── InventoryOverlay.ts
│   │       ├── DialogOverlay.ts
│   │       ├── ShopOverlay.ts
│   │       └── PauseMenuOverlay.ts
│   │
│   ├── systems/                # 游戏系统（单一职责，通信规则见 4.6）
│   │   ├── TimeSystem.ts        # 时间推进 + 过夜结算编排者（processNewDay，见 4.5）
│   │   ├── FarmSystem.ts        # 瓦片耕作/浇水状态
│   │   ├── CropSystem.ts        # 作物生长（纯结算函数 + 过夜推进）
│   │   ├── InventorySystem.ts   # 暴露 addItem/removeItem 等受控同步方法（见 4.6）
│   │   ├── ToolSystem.ts        # 工具使用编排（检查体力→改瓦片→广播）
│   │   ├── InteractionSystem.ts # 【v2.2】"交互键"统一编排者：对话/开箱/手动收获等（见 4.6 编排者模式）
│   │   ├── EnergySystem.ts      # 体力/HP
│   │   ├── EconomySystem.ts     # 金钱、买卖、出货箱结算
│   │   ├── NPCSystem.ts         # NPC 日程与移动（寻路见 5.7）
│   │   ├── RelationshipSystem.ts # 好感度、送礼
│   │   ├── DialogSystem.ts      # 对话节点选取与心事件触发
│   │   ├── CombatSystem.ts      # 矿洞战斗、血量、伤害
│   │   ├── MiningSystem.ts      # 矿层生成、矿石、掉落
│   │   ├── FishingSystem.ts     # 钓鱼小游戏
│   │   ├── FestivalSystem.ts    # 节日日历与触发
│   │   ├── SkillSystem.ts       # 技能等级（务农/采矿/钓鱼/战斗）
│   │   ├── CookingSystem.ts     # 【v2】烹饪：配方→产出（见 5.15）
│   │   └── AudioSystem.ts       # BGM/SFX 统一管理
│   │
│   ├── entities/               # 实体类
│   │   ├── Player.ts
│   │   ├── NPC.ts
│   │   ├── Monster.ts
│   │   └── DroppedItem.ts
│   │
│   ├── data/                   # 数据驱动定义（内容都在这里加）
│   │   ├── crops.ts            # 作物定义
│   │   ├── items.ts            # 物品定义（含价格唯一真相源，见 6.1/6.2）
│   │   ├── tools.ts            # 工具与升级
│   │   ├── npcs.ts             # NPC 定义 + 日程 + 喜好
│   │   ├── fish.ts             # 鱼类定义
│   │   ├── monsters.ts         # 怪物定义
│   │   ├── recipes.ts          # 制作/烹饪配方（接口见 6.10）
│   │   ├── shops.ts            # 商店库存
│   │   ├── festivals.ts        # 节日定义
│   │   └── dialogues/          # 对话脚本（按 NPC 分文件，结构见 6.11）
│   │
│   ├── save/
│   │   ├── SaveSystem.ts       # 序列化/反序列化、读写（通过 SaveStorage）
│   │   ├── SaveStorage.ts      # 【v2】存储抽象接口 + Tauri/Browser 两实现（见 5.12）
│   │   ├── GameState.ts        # 中央游戏状态（唯一真相源）
│   │   └── schema.ts           # 存档数据结构 + 版本号 + 迁移
│   │
│   ├── ui/                     # 可复用 UI 组件（基于 Phaser 容器）
│   │   ├── Button.ts
│   │   ├── Panel.ts
│   │   ├── Hotbar.ts           # 底部快捷栏（仅渲染 inventory 前 12 格视图，不持有数据，见 5.4）
│   │   ├── Clock.ts            # 时间/季节显示
│   │   └── TextBox.ts
│   │
│   ├── core/
│   │   ├── EventBus.ts         # 【v2】零依赖类型化事件总线（不依赖 Phaser）
│   │   ├── events.ts           # 所有事件名常量 + 载荷类型（见 4.2）
│   │   ├── ServiceLocator.ts   # 系统注册与获取（用途受 4.6 限制）
│   │   └── RandomService.ts    # 【v2.2.1】随机服务：持有/推进 GameState.rng.state（包装 utils/random 纯函数，见 6.9 RNG 约定）
│   │
│   ├── utils/                  # 纯函数工具（可被单测覆盖；无状态、不写 GameState）
│   │   ├── grid.ts             # 像素<->瓦片坐标转换
│   │   ├── random.ts           # 【v2.2.1】纯 PRNG 函数：mulberry32 / splitmix32 / derive（无状态，状态由 core/RandomService 持有）
│   │   └── time.ts             # 时间格式化
│   │
│   └── types/                  # 全局 TypeScript 类型
│       └── index.ts
│
├── tests/                      # Vitest 单测（只测纯逻辑层，不 import Phaser）
│   ├── grid.test.ts
│   ├── cropSystem.test.ts
│   ├── inventorySystem.test.ts
│   ├── timeSystem.test.ts       # 含过夜结算流水线顺序测试
│   └── saveSystem.test.ts       # 含存档迁移测试
│
└── src-tauri/                  # Tauri 桌面壳（Rust）—— M0.5 引入
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/
    │   └── default.json        # 【v2】fs 权限声明（见 5.12）
    └── src/
        └── main.rs
```

> **结构原则**：新增「内容」（一种作物/一条鱼/一个 NPC）只改 `src/data/`；新增「机制」改 `src/systems/`。系统之间的通信遵循 **4.6 的权威约定**（而非笼统的「只用事件」）。

---

## 4. 架构设计

### 4.1 分层

1. **数据层 `src/data/`**：纯静态定义（作物、物品、NPC…），无逻辑。
2. **状态层 `src/save/GameState.ts`**：运行时的唯一真相源（玩家、农场、时间、库存、关系…）。所有系统读它；**写它须遵守 4.6 的「字段→唯一 owner」约定**。
3. **系统层 `src/systems/`**：游戏规则与逻辑，操作 GameState，按 4.6 协作与广播事件。
4. **表现层 `src/scenes/` + `src/ui/` + `src/entities/`**：Phaser 渲染与输入，订阅事件更新画面，不放业务规则。**`entities/`（Player/NPC/Monster/DroppedItem）是 Phaser 精灵包装类，属表现层**，由场景实例化与编排。

> 经验法则：**逻辑可被 Vitest 在无渲染环境下测试**。把规则放系统/工具层，把渲染放场景层。**为保证这一点，逻辑层（`systems`、`core`、`save`、`utils`、`data`）一律禁止以「值 import」引入 `phaser` 与 `entities/`**（二者都会在加载期触碰 Phaser，破坏 node 环境单测）。逻辑层若需 Phaser 类型，仅允许 `import type`（运行期擦除，不进 bundle/不触碰 Phaser）。机器化执行见 4.2 与第 3 章 `eslint.config.js`。
>
> **坐标/范围去 Phaser 化**：逻辑层不直接用 `Phaser.Math.Vector2`/`Phaser.Geom.Rectangle`，改用 `utils` 里自定义的 `Vec2`/`Rect` 纯类型，彻底不依赖 Phaser 类型（最佳实践，连 `import type` 都省去）。

### 4.2 事件总线 (EventBus) 【v2 重写】

- **零依赖、纯 TypeScript** 的类型化事件发射器（约 30 行的 `on/off/once/emit` 泛型类），**不封装 `Phaser.Events.EventEmitter`**。
  - **理由**：v1 让 EventBus 封装 `Phaser.Events.EventEmitter`，会导致单测里 `import 系统 → import EventBus → import Phaser`，而 Phaser 在模块加载期访问 `navigator/window`，在 Vitest 的 node 环境抛 `navigator is not defined`，直接击穿「systems 可无渲染测试」这一核心主张（见 4.1/10.3）。改用零依赖 emitter 后，逻辑层不再触碰 Phaser。
- **ESLint 强制（`eslint.config.js`）**：对逻辑层目录用 `no-restricted-imports`（或 `import/no-restricted-paths`）禁止**值 import** `phaser` 与 `../entities/*`；对 `phaser` 设 `allowTypeImports: true`，即**仅 `import type` 放行**（运行期擦除、不破坏 node 单测），任何进入运行期的值 import 一律报错。`entities/` 只允许被 `scenes`/`ui` import。
- 全局单例。**所有事件名集中在 `src/core/events.ts`，配 TypeScript 载荷类型，禁止裸字符串。**
- **事件命名时态约定**：事件一律表示**「已经发生的状态变更通知」**（过去时），如 `crop:harvested`、`inventory:changed`、`economy:goldChanged`、`player:energyChanged`、`time:newDay`。**事件不用来发起「请求/命令」，也不承载需要返回值或可能失败的操作**（那类走 4.6 的受控同步方法）。
- 示例事件：`time:tick`、`time:hourTick`、`time:newDay`、`time:newSeason`、`crop:harvested`、`inventory:changed`、`player:energyChanged`、`player:hpChanged`、`economy:goldChanged`、`npc:relationshipChanged`、`combat:playerHurt`、`weather:changed`。
- **最小 `EventMap` 示例**【v2.2.1】（M0 建 `events.ts` 时至少给这些载荷形状，禁裸字符串）：`time:tick {minute:number}`、`time:newDay {year:number; season:Season; day:number}`、`time:newSeason {season:Season}`、`weather:changed {weather:Weather}`、`inventory:changed {}`（无载荷）、`player:energyChanged {energy:number; max:number}`、`player:hpChanged {hp:number; max:number}`、`economy:goldChanged {gold:number; delta:number}`、`crop:harvested {cropId:string; qty:number; overflow:number}`。新增事件照此扩展 `EventMap`。
- **解绑纪律**：任何在场景/UI 中 `on` 的订阅，必须在场景 `shutdown`/`destroy` 时 `off`。系统层订阅在 `ServiceLocator` 销毁时统一清理。**HMR 与单测隔离**：EventBus 与 GameState 单例提供 `reset()`，在 `import.meta.hot` 与每个测试 `beforeEach` 调用，避免监听器泄漏与重复绑定。

### 4.3 场景组合

- 玩法地图场景（Farm/Town/Mine/Beach）一次只激活一个。
- `UIScene` 始终并行运行在顶层，显示 HUD（时钟、金钱、体力、快捷栏）。
- 弹窗用 overlay 场景（暂停玩法输入但不卸载）。
- **【v2】暂停语义**：打开 overlay 时，`TimeSystem` 暂停时间推进（置 `paused=true`），并暂停玩法场景的输入与 `update`（`scene.pause(玩法场景key)`）；UIScene 与 overlay 仍接收输入。关闭 overlay 反向恢复。明确定义避免「弹窗里时间还在走 / 输入串台」。

### 4.4 地图与切换

- 地图用 **Tiled** 制作，导出 JSON，放 `public/assets/tilemaps/`。
- 图层约定：`Ground`（地面）、`Paths`、`Buildings`、`Collision`（碰撞，不渲染）、`AbovePlayer`（盖在玩家上方的高物体）、`Objects`（对象层：传送点、出生点、交互点）。
- **碰撞**：从 `Collision` 图层生成静态碰撞体；玩家移动用 Phaser Arcade 物理，瓦片级阻挡。
- 传送：在 `Objects` 层放矩形对象，属性 `targetScene`、`targetX`、`targetY`，玩家进入即切场景。

### 4.5 时间系统模型与「过夜结算流水线」【v2 重写】

- 1 游戏天 = 可玩时段：**06:00 起床 → 次日 02:00 强制睡**（共 20 小时 = 1200 游戏分钟）。
- 时间以「游戏分钟」为单位，**以 10 分钟为步长推进**；**真实毫秒↔游戏分钟基线见附录 A（默认 700ms = 10 游戏分钟）**，可配置。
- 关键节点广播事件：每 10 分钟 `time:tick`、整点 `time:hourTick`、新一天 `time:newDay`、换季 `time:newSeason`、天气变更 `weather:changed`。

#### 过夜结算流水线（强顺序，由编排者串行执行）

**睡觉/晕倒触发结算。由 `TimeSystem.processNewDay()` 作为唯一编排者，按以下编号顺序串行执行。【v2.1 重要】编排者本身只写 `time.*`（它的 owner 字段）；其余每一步都是「调用对应 owner 暴露的纯结算方法」，编排者绝不直接写他系统 owned 的字段。这些方法统称「编排期结算方法」，与 4.6 受控同步方法同属合法耦合点（见 4.6 白名单）。不依赖事件监听顺序，禁止用 `time:newDay` 事件让各系统自由响应来完成结算。**

1. **推进日期与时刻**（编排者写 `time.*`）：**`time.minute = 360`（回到 06:00 起床，`DAY_START_MINUTE`）**；`day++`；若 `day > 28` → `day=1` 且换季（`season` 轮转，必要时 `year++`），**记下"本次是否换季"留待步 10 广播**（结算未完成前不发通知事件）。
2. **出货箱结算**：调 `EconomySystem.settleShippingBin()` —— 总额 = `Σ qty × ItemDef.sellPrice`（售价唯一真相源见 6.2）→ `addGold(总额)` → 清空 `shippingBin`，记录当日收入。
3. **换季清苗**：若刚换季，调 `CropSystem.clearOutOfSeasonCrops(newSeason)` 移除所有不在新季节 `seasons` 内、且非再生（无 `regrowDays`）的作物；耕地保留。
4. **掷次日天气**（编排者写 `time.weather/tomorrowWeather`）：把昨日 `tomorrowWeather` 提升为当日 `time.weather`；再经 `RandomService`（推进持久化 `rng.state`，见 6.9/RNG 约定）按附录 A 概率掷出新的 `tomorrowWeather`。**节日覆盖**：若**新的当日** `(season, day)` 命中某 `FestivalDef`（经 `FestivalSystem.isFestivalDay(season, day)` 查询），强制 `time.weather='sunny'`（节日不下雨、不自动浇水），与 5.2/附录 A 一致。
5. **降水自动浇水**：若**当日** `weather ∈ {rain, storm}`，调 `FarmSystem.waterAllTiles()` 把所有耕地 `watered=true`；`snow/sunny` 不变（雪天不自动浇水）。
6. **作物生长**：调 `CropSystem.growOvernight()` —— 对每块 `watered===true` 的耕地推进 1 天（按 `growthStages`/再生语义，见 6.1）；推进完成后调 `FarmSystem.resetWatered()` 把所有耕地 `watered` 重置为 false。
7. **工具在途升级**：调 `ToolSystem.tickUpgrades()` —— `toolUpgrades` 每项 `daysRemaining--`；归 0 的完成升级（更新 `player.tools[type]` 档位），移出队列。
8. **体力/生命**：调 `EnergySystem.restoreOnSleep(faintContext)`，`faintContext ∈ {'normal','farm','mine'}`，**按附录 A 分支恢复**（不先写死 `energy=maxEnergy`）：`normal` 正常睡觉 → `energy=maxEnergy, hp=maxHp`；`farm` 熬夜/农场晕倒 → `energy=maxEnergy`（+ 扣钱）；`mine` 矿洞晕倒 → `energy=maxEnergy×0.5`（+ 扣钱 + 调 `InventorySystem.removeItem` 丢失若干物品 + 写 `player.position` 为农场屋门口，见 owner 表 position 特例）。`hp` 在晕倒分支按附录 A 处理。
9. **每日/每周重置 + NPC 日程**：调 `RelationshipSystem.dailyReset(isNewWeek)` —— `relationships.*.talkedToday=false`；若进入新一周（`day ∈ {1,8,15,22}`）则 `giftsThisWeek=0`；再调 `NPCSystem.resetDailySchedule()` 重置 NPC 当日日程（像素位置为派生态，不入档，见 5.7）。
10. **广播通知事件**【v2.2.1】（**仅供 UI/音频/表现层响应，回调内禁止再写 GameState**）：结算全部完成后、自动存档前，广播 `time:newDay`；若本次换季则广播 `time:newSeason`；若当日 `weather` 较昨日变化则广播 `weather:changed`。把所有通知事件集中到此处（而非散落在各步），避免 UI 在结算半途读到中间态。
11. **自动存档**：`SaveSystem` 序列化 `GameState` → `SaveStorage.save()`（**放在最后，确保存的是结算后的状态**）。

> 该顺序对正确性至关重要（例：必须先掷天气再判自动浇水、先生长再重置 watered、先结算再存档、节日覆盖在掷天气之内）。`tests/timeSystem.test.ts` 必须覆盖此流水线的顺序与边界（跨季、再生作物、晕倒、节日次日）。
>
> **星期换算**（供步 9 与 NPC 日程键 `'monday'` 等共用）：`weekday = (day - 1) mod 7`（`day ∈ {1,8,15,22}` → `'monday'`），实现于 `utils/time.ts`。`NPCDef.schedule` 选取优先级：`weather` 键 &gt; 具体星期键 &gt; `season` 键 &gt; `default`。

### 4.6 系统通信权威约定（唯一标准）【v2 新增 · 解决 v1 三方矛盾】

v1 同时存在三条互斥指引（「系统只走 EventBus 不互调」「ServiceLocator 系统注册与获取」「GameState 所有系统读写」），导致每个跨系统交互无权威可依。**本节给出唯一标准，全项目据此实现与 review：**

**三类交互的归属：**

| 交互意图 | 走哪条通道 | 规则 |
| --- | --- | --- |
| **通知「已发生的状态变更」** | **EventBus**（过去时事件） | 改完 GameState 后 `emit`，供 UI/音频/其他系统响应；fire-and-forget，无返回值 |
| **同步查询 / 读共享态** | **直接读 `GameState`** | 读 GameState 不算耦合；任何系统可读任何字段 |
| **需要返回值/可能失败的高频操作** | **受控同步方法**（合法耦合点） | 通过 `ServiceLocator` 取到目标系统，调用其**明确暴露的、有返回值的薄方法**；调用方据返回值决定后续 |

**`ServiceLocator` 的合法用途**：① 启动期装配**逻辑层系统**单例（**禁止注册 Phaser 场景/实体**，防止经 `core/` 间接耦合 Phaser）；② 取系统以调用其**受控同步方法**或**无副作用查询**。**禁止**在一个系统的方法内 `get` 另一个系统去调用其**业务编排逻辑**（那会绕过 owner 约定造成隐蔽耦合）。

**受控同步方法白名单（示例，需返回值、不发命令事件）：**
- `InventorySystem.addItem(itemId, qty): { added: number; overflow: number }`
- `InventorySystem.removeItem(itemId, qty): boolean`
- `InventorySystem.hasSpaceFor(itemId, qty): boolean`
- `EconomySystem.trySpend(amount): boolean`（不足返回 false，不扣款）
- `EconomySystem.addGold(amount): void`
- `EnergySystem.trySpend(amount): boolean`
> 这些方法内部改完 GameState 后**自行广播对应通知事件**（如 `inventory:changed`）。调用方拿返回值，不监听事件来判断成败。

**编排期结算方法**（过夜流水线 4.5 专用，由 `TimeSystem.processNewDay()` 串行调用，各自只写本系统 owned 字段，亦属合法耦合点）：`EconomySystem.settleShippingBin()`、`CropSystem.clearOutOfSeasonCrops(season)`、`CropSystem.growOvernight()`、`FarmSystem.waterAllTiles()`、`FarmSystem.resetWatered()`、`ToolSystem.tickUpgrades()`、`EnergySystem.restoreOnSleep(faintContext)`、`RelationshipSystem.dailyReset(isNewWeek)`、`NPCSystem.resetDailySchedule()`（仅刷新派生态，不写任何 owned 字段）。此外步 4 经 `FestivalSystem.isFestivalDay(season, day)` 查询节日——属**无副作用查询**（ServiceLocator 合法用途②），非结算方法。

**「字段 → 唯一 writer 系统」表**（其它系统只读；写须经 owner 的方法）：

| GameState 字段 | 唯一 writer |
| --- | --- |
| `time.*`（含内嵌 `time.weather` / `time.tomorrowWeather`） | TimeSystem |
| `player.energy` / `player.hp` / `player.maxEnergy` / `player.maxHp` | EnergySystem |
| `player.gold` / `shippingBin` | EconomySystem |
| `player.skills` | SkillSystem |
| `player.tools` / `toolUpgrades` | ToolSystem |
| `player.wateringCanWater` | FarmSystem |
| `inventory`（含作为前 12 格视图的快捷栏） / `chests` / `player.hotbarSelectedIndex` | InventorySystem |
| `player.position` / `player.facing` | 见下「位置/朝向特例」 |
| `farm.tiles[].tilled` / `.watered` | FarmSystem |
| `farm.tiles[].crop` | CropSystem |
| `relationships` | RelationshipSystem |
| `unlocked.recipes` | **SkillSystem（唯一 owner）**；CookingSystem 如需解锁配方，经 `SkillSystem.unlockRecipe(id)` 写入 |
| `mine`（`deepestLevel`，电梯可达层为派生） | MiningSystem |
| `unlocked.shops` | EconomySystem |
| `flags['festival:*']` | FestivalSystem |
| `flags['event:*']` / `flags['dialogue:*']` / `consumedDialogueNodes` | DialogSystem |
| `relationships[*].met` | DialogSystem 经 `RelationshipSystem.markMet(npcId)` 写（owner 仍 RelationshipSystem） |
| `settings` | SaveSystem（仅设置面板经其写，运行期其余只读） |
| `rng.seed` / `version` / `player.name` | SaveSystem（新游戏/迁移时初始化，运行期只读） |
| `rng.state` | RandomService（`core/RandomService.ts`，包装 `utils/random` 纯函数）—— 所有随机抽取经它就地推进 `GameState.rng.state`，故始终随存档序列化（见下「RNG 约定」） |

> **兜底规则**：上表未列出的 `SaveData` 字段，默认由 `SaveSystem` 在**新游戏/迁移**时初始化、**运行期只读**；若运行期需写，必须先在本表登记 owner。本表与 6.9 SaveData 字段一一对应，是「全项目据此 review」的完备权威。
>
> **owner 粒度到子字段**：owner 精确到所列字段路径。任何系统只能写自己 owned 的子键，**禁止整体替换父容器对象**（`unlocked`/`player`/`time`/`farm` 等），以免误覆盖他系统 owned 的兄弟子键（例：SkillSystem 写 `unlocked.recipes` 时不得整体重赋 `unlocked`，以免抹掉 EconomySystem owned 的 `unlocked.shops`）。
>
> **位置/朝向特例**：游戏过程中玩家的**权威位置在表现层 `Player` 精灵（物理体）**；`GameState.player.position/facing` 是**快照**，由表现层在**场景切换时**与 `SaveSystem` 在**存档序列化时**写入（属表现层→状态的快照同步，不算业务耦合）。NPC 位置同理为派生态（见 5.7）。**唯一例外**：过夜矿洞晕倒时由 `EnergySystem`/编排者把 `player.position` 写为农场屋门口（见 4.5 步 8）。

**✅ 正确示例（收获）**：玩家收获 → `CropSystem` 改 `farm.tiles[k].crop`（自己 owner）→ 调 `InventorySystem.addItem(produceId, n)` 取返回值 → 调 `SkillSystem.addXp('farming', x)` → `CropSystem` 广播 `crop:harvested`（载荷含 `overflow` 数量）。**若 `overflow>0`，由订阅 `crop:harvested` 的表现层场景实例化 `DroppedItem` 落地**（实体属表现层，逻辑层不 `new` 它，见 4.1）。
**❌ 错误示例**：`CropSystem` `emit('inventory:addRequest', …)` 然后**假定**库存一定加成功（无法处理背包满）；或 `CropSystem` 直接写 `gameState.inventory`（侵犯 owner 权）；或 `CropSystem` 直接 `new DroppedItem(...)`（逻辑层触碰 Phaser 实体，破坏单测）。

**单工具操作的多系统连锁（编排者模式）**：用户动作由**一个编排者系统**（如 `ToolSystem` / `InteractionSystem`）按固定顺序**同步**执行：检查体力（`EnergySystem.trySpend`）→ 若成功改本地/相关 owner 状态 → 调用相关 owner 方法 → **最后广播结果通知事件**。Phaser/本 EventBus 派发是同步的，不存在异步竞态；真正要规范的只是「谁来编排、按什么顺序」。**事件回调里禁止再做跨系统的写副作用**（防止隐式连锁）。

---

## 5. 功能规格（首版「较完整」范围）

> 每个功能给出：目标、关键规则、相关数据、验收要点。实现顺序见第 8 章里程碑。具体数值一律取自**附录 A**。

### 5.1 玩家、移动与控制
- **8 向移动（斜向速度归一化，避免斜走比直走更快），Arcade 物理 + Collision 图层瓦片级碰撞**；移动速度见附录 A。
- 朝向（`facing`，存档持久化）决定工具作用的目标瓦片。
- 体力（Energy）与生命（HP）：劳作/战斗消耗体力（每动作能耗见附录 A）。
- **【v2】体力耗尽与晕倒**：体力 ≤ 0 后仍可操作，但**每次动作改为扣 HP**（数值见附录 A），移动变慢；HP 归 0 或时间到 **02:00** 触发**晕倒**：黑屏 → 次日 06:00 醒来，按附录 A 恢复体力并施加惩罚（农场晕倒：损失少量金钱；矿洞晕倒：损失部分金钱 + 随机若干背包物品，并被送回农场）。
- **【v2】控制方案**：默认键位见**附录 B**，存 `controls.ts`，预留重绑定与 i18n。

### 5.2 时间 / 季节 / 天气
- 时间推进、日夜光照（用相机/叠加层调色）。
- 季节：春夏秋冬，各 28 天；换季在过夜流水线第 3 步清除不合季作物（见 4.5）。
- **【v2】天气模型**：取值统一为 `Weather = 'sunny' | 'rain' | 'storm' | 'snow'`（见 6.0）。次日天气在过夜流水线第 4 步经 `RandomService` 推进持久化 `rng.state` 掷定并存档（state 随档序列化，保证读档可复现，属序列随机，详见 4.5 步 4 与 6.9 RNG 约定）；**各季概率见附录 A**。`rain/storm` 自动浇灌作物，`snow`（冬季）不自动浇水。节日当天强制 `sunny`。

### 5.3 农场与作物（数据驱动）
- 工具「锄头」翻地 → 产生可种植耕地瓦片；「水壶」浇水（当天有效，过夜流水线第 6 步后重置）。
- **【v2】水壶补水**：水壶有容量（见附录 A），用尽需在水源（地图 `Objects` 层 `waterSource` 点 / 池塘边）补满。
- 播种后按 `growthStages` 推进；**仅当日已浇水**才在过夜流水线推进生长（语义见 6.1）。
- 成熟后可收获；部分作物**多次收获**（`regrowDays`，语义见 6.1）。
- 作物数据见 6.1。

### 5.4 物品与库存
- **【v2.2】背包 36 格（定值，写入 `constants.ts`）。快捷栏不是独立容器，而是 `inventory` 的前 12 格视图（方案 A）**——杜绝"双容器"导致的物品重复、搬运与存档歧义。物品可堆叠（`stackable`、`maxStack`，见附录 A）。
- `inventory` 为**定长 36 可空数组**（空槽为 `null`）；快捷栏 = `inventory[0..11]`，**只持久化选中下标 `hotbarSelectedIndex`（0–11）**，不另存 `hotbar` 数组。`ui/Hotbar.ts` 仅渲染前 12 格，不持有数据。
- 操作：拾取、丢弃、整理（重排并合并堆叠）、在箱子中存取（「箱子」家具，内容入档 `chests`）。
- **【v2.2.1】整理规则**：「整理」默认作用于**全部 36 格**（含前 12 格快捷栏），合并同类堆叠并重排，**可能改变快捷栏内容**。**M1 可暂不实现整理**（仅拾取/丢弃/手持选择）；做整理时若需保护快捷栏，再加"锁定快捷栏"选项。

### 5.5 工具与升级
- 工具：锄头、水壶、镐、斧、镰刀/剑、钓竿。
- 升级（铜→铁→金→铱）：扩大作用范围或提高效率，需金钱 + 材料 + 等待天数（铁匠）。**升级在途状态入档 `toolUpgrades`，过夜流水线第 7 步倒计时完成**；玩家当前各工具档位入档 `player.tools`（`Record<ToolType, ToolTier>`，唯一档位真相源，无 `unlocked.tools`）。

### 5.6 经济与商店
- **【v2】出货箱经济**：把物品放入农场「出货箱」→ 入档 `shippingBin` → **过夜流水线第 2 步**按物品 `sellPrice` 结算入账并清空（白天放入、未睡觉前可取回）。商店为即时买卖。
- 商店：种子店、杂货、铁匠、鱼店等，库存随季节变化（数据见 6.6）；已解锁商店入档 `unlocked.shops`。

### 5.7 NPC、对话与好感度
- NPC 有**日程**（按星期/季节/天气在不同地点移动）。
- **【v2】NPC 寻路与跨场景日程**：当前场景内 NPC 用**网格 A***（或 waypoint 线性插值）从当前点走向日程目标点，遇 `Collision` 绕行；**非当前场景的 NPC 只更新逻辑位置（不渲染、不寻路）**，玩家进入该场景时按当前游戏时间把 NPC「投放」到其日程应在的位置。NPC 当前像素位置是**派生态，不入档**（由 `schedule` + 时间纯函数重算）。寻路策略登记 ADR。
- 对话系统：基于好感度/事件解锁不同台词；对话脚本数据化（结构见 6.11）。
- **【v2】好感度单位**：内部以 `points` 存储，**1 心 = 250 点，上限 10 心 = 2500 点**（换算与各增减值见附录 A）。每日首次对话 +、送礼按喜好增减（每周送礼上限见附录 A，计入 `giftsThisWeek`）；达到心阈值触发心事件（用 `once` 对话节点，见 6.11）。

### 5.8 矿洞与战斗
- 矿洞多层，越深矿石越好、怪物越强；电梯每 5 层设存点。**进度唯一真相源是 `mine.deepestLevel`（最深到达层）；电梯可达层 = `floor(deepestLevel/5)×5` 为派生计算，不再单存 `unlocked.mineLevel`。**
- **【v2】矿层运行态**（本层布局、怪物 HP、矿石节点）**为派生态，按 `rng.seed + 层号` 域派生（`derive(seed,'mine',floor)`，见 6.9 RNG 约定）在进入时生成，离开/晕倒即丢弃，不入档**；只持久化进度（最深层）。
- 战斗：玩家挥剑判定范围，怪物有 HP/攻击/掉落；玩家受击有**无敌帧**（时长见附录 A）。伤害公式见附录 A。
- 采矿：用镐击碎矿石节点，掉落矿石/宝石/材料；数据见 6.7。

### 5.9 钓鱼
- 抛竿 → 等待咬钩 → 触发钓鱼小游戏（控制进度条让「鱼」停留在区域内）→ 成功获得鱼。
- 鱼按季节/地点/天气/时间出现（数据见 6.5）；难度→小游戏参数、钓鱼技能→辅助区域大小，映射见附录 A。

### 5.10 技能与成长
- 四类技能：务农 / 采矿 / 钓鱼 / 战斗。对应行为加经验（各行为 XP 见附录 A），升级解锁配方或被动加成。
- **【v2】技能数据结构**：每个技能有 10 级，**等级 XP 阈值表见附录 A**；每级的被动加成用数据描述：
  ```ts
  export interface SkillPerk {
    skill: 'farming' | 'mining' | 'fishing' | 'combat';
    level: number;
    passive?: { type: string; value: number }; // 如 { type:'sellBonus', value:0.1 }
  }
  ```
  实例放 `src/data/`（如 `skills.ts`）。
  > **配方解锁的唯一真相源是 `RecipeDef.unlockedBy`（6.10）**，不在 `SkillPerk` 重复编码（避免重蹈售价双真相源）。`SkillSystem` 升级时扫描 `recipes` 中 `unlockedBy` 命中当前技能/等级者，写入 `unlocked.recipes`。

### 5.11 节日与事件
- 节日日历（固定日期）；当天小镇变为节日场景，含活动/小游戏/商店。
- 数据见 6.8；节日/心事件进度用 `flags`，**键名规范**：节日 `festival:<id>:<year>`（含年份，标记某年是否参加，跨年可重新触发）、心事件 `event:<npcId>:<n>`（一次性，永久）。

### 5.12 存档 / 读档【v2 重写】
- 单存档槽起步（可扩展多槽）。
- 自动存档：过夜流水线第 11 步（末步）。手动存档：暂停菜单。
- 存档为 JSON，带 `version` 字段与迁移函数（结构见 6.9）。
- **【v2】存储抽象 `SaveStorage`**：解耦「存档逻辑」与「落地介质」，使游戏在**浏览器 dev 与 Tauri 桌面**下都能存读档（解决 v1「M1 重启读档在纯浏览器 dev 无法验收」）。
  ```ts
  export interface SaveStorage {
    save(slot: string, json: string): Promise<void>;
    load(slot: string): Promise<string | null>;
    exists(slot: string): Promise<boolean>;
  }
  ```
  - `BrowserStorage`：基于最小抽象 **`StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }`**——生产注入 `window.localStorage`，Vitest 单测注入内存 `Map` 实现（dev / 无 Tauri 环境；测试口径见 M0.5）。
  - `TauriFsStorage`：用 `@tauri-apps/plugin-fs`，`BaseDirectory.AppData` + 相对子目录（**禁止拼绝对路径**）。
  - 启动时用 `isTauriRuntime()` 选择实现：**检测 `'__TAURI_INTERNALS__' in window`**（Tauri 2 默认注入；`window.__TAURI__` 仅在 `app.withGlobalTauri=true` 时才有，不可依赖）；兜底可 `try { await import('@tauri-apps/api/core') } catch {}`。封装成单一函数，禁止散落裸判断。
- **【v2】Tauri 2 集成事实**（避免 v1 时代 allowlist 踩坑）：
  - 依赖：JS 侧 `@tauri-apps/plugin-fs`，Rust 侧 `tauri-plugin-fs`，在 `main.rs` 注册插件。
  - 权限：Tauri 2 默认 deny，必须在 `src-tauri/capabilities/default.json` 声明细粒度权限，例如：
    ```json
    {
      "identifier": "default",
      "windows": ["main"],
      "permissions": [
        "fs:allow-read-text-file",
        "fs:allow-write-text-file",
        "fs:allow-mkdir",
        "fs:allow-exists",
        { "identifier": "fs:scope", "allow": [{ "path": "$APPDATA" }, { "path": "$APPDATA/**/*" }] }
      ]
    }
    ```
  - `fs:scope` 的 `allow` 是**对象数组**（`{ "path": ... }`），不是裸字符串数组——照抄字符串形式会导致 scope 不生效。
- **【v2.2】资源路径硬规范**（防"浏览器能跑、打包后白屏"）：① `vite.config.ts` 必须设 `base: './'`；② Phaser `load.*` 与 Tiled tileset 的 `image` 路径**一律相对、不以 `/` 开头**（如 `assets/...`，不是 `/assets/...`）；③ 加载清单集中在 `PreloadScene`；④ M0.5 打包后必须烟雾测一次（确认资源在 Tauri WebView 下加载成功）。

### 5.13 音频
- BGM 按场景/季节切换，循环播放，可调音量。
- SFX：脚步、工具、收获、UI、战斗等。
- 设置中可独立调 BGM/SFX 音量并持久化（入档 `settings`）。

### 5.14 设置与无障碍
- 设置：音量、全屏、按键说明（基于附录 B）、语言（先中文，预留 i18n；UI 文案与对话经 key 取用，不硬编码渲染层）。
- 像素完美缩放，支持窗口缩放整数倍；设计分辨率与缩放见附录 A。

### 5.15 烹饪与食物闭环【v2 新增】
- 串联散落的 `recipes`/`cooked`/`edible`/`unlocked.recipes`：玩家在「炉灶」用 `RecipeDef`（6.10）的原料烹饪 → 产出 `category:'cooked'` 的物品 → 食用按各物品 `ItemDef.edible`（6.2）恢复体力/HP。配方解锁的唯一真相源是 `RecipeDef.unlockedBy`（技能等级或 `flag`，见 6.10）；解锁后写入 `unlocked.recipes`（owner=SkillSystem，见 4.6）。

---

## 6. 数据模型（TypeScript 接口示例）

> 这些接口放 `src/types/index.ts`，数据实例放 `src/data/`。Claude Code 新增内容时照此结构扩展，**先加/改类型，再加数据**。

### 6.0 共享类型【v2】
```ts
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'sunny' | 'rain' | 'storm' | 'snow';   // 全项目唯一天气取值域
export interface InventorySlot { itemId: string; qty: number; }
```

### 6.1 作物 Crop【v2 明确语义】
```ts
export interface CropDef {
  id: string;                 // 'parsnip'
  name: string;               // '防风草'
  seedItemId: string;         // 'parsnip_seeds'
  produceItemId: string;      // 'parsnip'（其售价以 ItemDef.sellPrice 为唯一真相源，见 6.2）
  seasons: Season[];          // 可种植季节
  growthStages: number[];     // 见下「生长语义」
  regrowDays?: number;        // 见下「再生语义」；无则一次性
  spriteKey: string;          // 精灵表 key
  yieldMin: number;           // 每次收获数量下限
  yieldMax: number;           // 每次收获数量上限（再生收获同样适用）
}
```
- **生长语义**：`growthStages[i]` = 第 `i` 阶段所需的「已浇水天数」。播种时 `stage=0, daysInStage=0`。每次过夜（当日已浇水）`daysInStage++`；当 `daysInStage === growthStages[stage]` 时 `stage++, daysInStage=0`。当 `stage === growthStages.length` 即**成熟可收获**。成熟所需总天数 = `sum(growthStages)`。例 `[1,1,1,1]` = 4 个阶段、共 4 个浇水日成熟。
- **再生语义**：无 `regrowDays` → 收获后作物消失（耕地保留）。有 `regrowDays` → 收获后作物保持成熟（`stage` 仍 `=== growthStages.length`）但 `regrowReady=false` 且 **`daysInStage=0`**；之后每个已浇水过夜 **`daysInStage++`（复用同一计数字段，不新增字段）**，当 `daysInStage === regrowDays` 时置 `regrowReady=true`，可再次收获（产量同样取 `yieldMin/Max`），收获后再次 `regrowReady=false, daysInStage=0`。故过夜生长函数 `growOvernight()` 按 `stage < length`（未成熟）走生长语义、按 `stage === length && regrowDays`（再生中）走再生累计，对两态都有确定行为。

### 6.2 物品 Item【v2：价格唯一真相源】
```ts
export type ItemCategory =
  | 'seed' | 'crop' | 'tool' | 'ore' | 'fish'
  | 'gift' | 'material' | 'cooked' | 'misc';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  sellPrice: number;          // 唯一售价真相源：出货箱/商店卖出均读此值；CropDef/FishDef 不再各存售价
  stackable: boolean;
  maxStack: number;           // stackable 时生效，如 999
  iconKey: string;
  description: string;
  edible?: { energy: number; health: number }; // 食物恢复（含 cooked）
}
```
> **去重约定**：作物/鱼的售价**不在** `CropDef`/`FishDef` 重复存储，统一查其产出物 `ItemDef.sellPrice`。买入价仍由 `ShopStockEntry.price` 定义。

### 6.3 工具 Tool
```ts
export type ToolType = 'hoe' | 'wateringCan' | 'pickaxe' | 'axe' | 'sword' | 'fishingRod';
export type ToolTier = 'basic' | 'copper' | 'iron' | 'gold' | 'iridium';

export interface ToolDef {
  id: string;
  type: ToolType;
  tier: ToolTier;
  energyCost: number;
  areaOfEffect: { width: number; height: number }; // 作用瓦片范围
  upgradeFrom?: string;       // 上一级工具 id
  upgradeCost?: { gold: number; materialItemId: string; materialQty: number; days: number };
}
```
> 注：`ToolDef` 是工具的静态定义；玩家**当前拥有**的工具及档位存于 `SaveData.player.tools`（见 6.9），二者勿混。

### 6.4 NPC
```ts
export interface NPCScheduleEntry {
  time: number;               // 游戏分钟（如 9*60）
  scene: string;              // 目标场景
  x: number; y: number;       // 目标瓦片
}
export interface NPCDef {
  id: string;
  name: string;
  spriteKey: string;
  birthday: { season: Season; day: number };
  giftTastes: {
    love: string[]; like: string[]; dislike: string[]; hate: string[]; // itemId
  };
  schedule: Record<string, NPCScheduleEntry[]>; // key: 'default' | 'monday' | 'rain' | 'spring' ...
  dialogueFile: string;       // 指向 src/data/dialogues/<file>
}
```

### 6.5 鱼 Fish【v2：天气类型对齐】
```ts
export interface FishDef {
  id: string;
  name: string;
  itemId: string;             // 售价查 ItemDef.sellPrice
  seasons: Season[];
  weather: (Weather | 'any')[]; // 与全局 Weather 对齐（v1 的 'sunny'|'rain'|'any' 已并入）
  locations: string[];        // 场景 key：'farm' | 'town' | 'beach' | 'mine'
  timeRange: [number, number];// 出现时段（分钟）
  difficulty: number;         // 钓鱼小游戏难度 1-100
}
```

### 6.6 商店 Shop
```ts
export interface ShopStockEntry {
  itemId: string;
  price: number;              // 买入价
  seasons?: Season[];         // 限季供货；不填=全年
  stock?: number;             // 每日限量；不填=无限
}
export interface ShopDef {
  id: string;                 // 'seedShop'
  name: string;
  npcId?: string;             // 店主
  openHours: [number, number];
  stock: ShopStockEntry[];
}
```

### 6.7 怪物 Monster
```ts
export interface MonsterDef {
  id: string;
  name: string;
  spriteKey: string;
  hp: number;
  attack: number;
  speed: number;
  minMineLevel: number;       // 出现的最浅矿层
  drops: { itemId: string; chance: number; min: number; max: number }[];
}
```

### 6.8 节日 Festival
```ts
export interface FestivalDef {
  id: string;
  name: string;
  season: Season;
  day: number;                // 该季第几天
  startTime: number; endTime: number;
  scene: string;              // 节日场景
  description: string;
}
```

### 6.9 中央存档结构 SaveData【v2：补全运行态/在途态】
```ts
export interface SaveData {
  version: number;            // 存档结构版本号；首个实现版 = CURRENT_SAVE_VERSION = 1（见下「存档版本与迁移」）
  rng: { seed: number; state: number };  // 持久化随机：seed=初始种子，state=PRNG 游标（每次抽取就地推进并随存档序列化），保证读档后掉落/天气/钓鱼序列不重复、不漂移；见下「RNG 约定」
  player: {
    name: string; gold: number; energy: number; maxEnergy: number;
    hp: number; maxHp: number;
    position: { scene: string; x: number; y: number };
    facing: 'up' | 'down' | 'left' | 'right';
    skills: Record<'farming' | 'mining' | 'fishing' | 'combat', { level: number; xp: number }>;
    tools: Record<ToolType, ToolTier>;  // 当前各工具档位（唯一真相源；不再有 unlocked.tools）
    wateringCanWater: number;   // 水壶剩余水量（逐日消耗的可变运行态，过夜不自动回满，需到水源补；见 5.3/附录A）
    hotbarSelectedIndex: number; // 0–11，指向 inventory 前 12 格（快捷栏即背包首行）
  };
  time: { year: number; season: Season; day: number; minute: number; weather: Weather; tomorrowWeather: Weather };
  inventory: (InventorySlot | null)[];   // 定长 36；前 12 格即快捷栏（无独立 hotbar 数组，见 5.4）
  farm: {
    tiles: Record<string, {   // key: "x,y"
      tilled: boolean; watered: boolean;
      crop?: { cropId: string; stage: number; daysInStage: number; regrowReady?: boolean };
    }>;
  };
  shippingBin: InventorySlot[];           // 待过夜结算
  toolUpgrades: { fromToolType: ToolType; toTier: ToolTier; daysRemaining: number }[]; // 铁匠在途
  chests: Record<string, (InventorySlot | null)[]>; // key: "scene:x,y"
  relationships: Record<string, { points: number; met: boolean; talkedToday: boolean; giftsThisWeek: number }>; // met 支撑对话 firstMeet 条件
  unlocked: { recipes: string[]; shops: string[] }; // mineLevel→并入 mine.deepestLevel；tools→并入 player.tools
  mine: { deepestLevel: number };         // 矿洞进度唯一真相源；电梯可达层=floor(deepestLevel/5)×5（派生）；层内运行态不入档
  consumedDialogueNodes: string[];        // 已消费的 once 对话节点 id；匹配对话时跳过已记录者，确保 once 节点重载存档后不重复触发（见 6.11）
  flags: Record<string, boolean | number>; // 命名规范：'festival:<id>:<year>'（含年，跨年可重触发）/ 'event:<npcId>:<n>' / 'dialogue:<...>'
  settings: { bgmVolume: number; sfxVolume: number; fullscreen: boolean; language: string };
}
```
> **派生态（不入档，需可由上述持久态重算或为瞬时态）**：NPC 当前像素位置（由 `schedule`+`time`）、玩家精灵实时位置（`player.position` 仅为存档/切场景快照，见 4.6 位置特例）、作物/角色精灵帧、矿洞层内布局与怪物（由 `rng.seed`+层号**域派生**，见下）、地面掉落物 `DroppedItem`（瞬时态，离场即弃，不入档）、商店每日剩余库存（瞬时态，过夜重置为 `ShopStockEntry.stock`）、对话游标。`schema.ts` 顶部用注释列明「持久态 vs 派生态清单」。
>
> **RNG 约定**【v2.2 · RandomService 于 v2.2.1 归位至 core/】：全项目随机统一经 `core/RandomService` 单例（它包装 `utils/random` 的纯 PRNG 函数、并持有/推进 `GameState.rng.state`；`utils/random` 本身无状态），分两类，**禁止直接用 `Math.random()`**：
> - **序列随机（消耗 `rng.state`）**：天气、战斗命中浮动、钓鱼判定、掉落数量等"沿时间推进"的随机。每次抽取读并就地推进 `GameState.rng.state`（PRNG 见附录 A），因 state 始终在 GameState 内，**存档即保存、读档即续上**，根除"读档后序列重复/漂移"。
> - **域派生随机（不消耗 `rng.state`，纯函数）**：对"同一输入须始终复现同一结果"的内容用 `derive(rng.seed, domain, ...keys)`（如矿洞层 = `derive(seed,'mine',floor)`、某日天气兜底 = `derive(seed,'weather',year,season,day)`）。它与 `rng.state` 流相互独立，重进同一层/同一天得到相同布局，且不被序列随机干扰。

> **存档版本与迁移**【v2.2.1】：`schema.ts` 导出 `CURRENT_SAVE_VERSION = 1`。**本规格的 v2→v2.2 演进发生在编码之前，不存在任何历史存档，因此首个实现版本号即为 1，无需为 v2/v2.1 写迁移**（那些版本从未作为真实存档存在）。迁移机制 `migrate(raw): SaveData` 用于**首发之后**的结构变更：读档时若 `raw.version < CURRENT_SAVE_VERSION` 逐版升级，损坏/更高版本走容错降级（见 10.5）。每次改 SaveData 结构 → `CURRENT_SAVE_VERSION++` + 写迁移 + 迁移测试（见 10.4）。

> **新游戏初始 SaveData（`createNewGame(): SaveData` 的必填默认值）**【v2.2.1】：`version=1`；`rng={ seed: <一次性熵>, state: seed }`；`player={ name, gold:500, energy:270, maxEnergy:270, hp:100, maxHp:100, position:农场屋门口, facing:'down', skills:四技能各 {level:1,xp:0}, tools:{ hoe:'basic', wateringCan:'basic', pickaxe:'basic', axe:'basic' }, wateringCanWater:40, hotbarSelectedIndex:0 }`；`time={ year:1, season:'spring', day:1, minute:360, weather:'sunny', tomorrowWeather:<按春季概率掷一次> }`；`inventory=` 长度 36 数组（**M1 起：工具作为不可堆叠物品占前几格** `[0]=hoe,[1]=wateringCan,[2]=pickaxe,[3]=axe`，其后 `[4]=parsnip_seeds×15,[5]=greenbean_seeds×10`），其余 `null`；`shippingBin=[]`；`toolUpgrades=[]`；`chests={}`；`farm.tiles={}`；`relationships=` 各 NPC `{points:0,met:false,talkedToday:false,giftsThisWeek:0}`；`unlocked={recipes:[]（首发无预解锁配方，全部靠 RecipeDef.unlockedBy 在升级/解锁时触发写入）, shops:['seedShop',...首发即可进入的商店 id]}`；`mine={deepestLevel:0}`；`consumedDialogueNodes=[]`；`flags={}`；`settings={bgmVolume,sfxVolume,fullscreen:false,language:'zh'}`。具体数值取附录 A；`tests/saveSystem.test.ts` 覆盖"新游戏存档可被读回且字段完整"。

### 6.10 配方 Recipe【v2 新增】
```ts
export interface RecipeDef {
  id: string;
  name: string;
  producesItemId: string;     // 产出物（category 通常为 'cooked'）
  producesQty: number;
  ingredients: { itemId: string; qty: number }[];
  station: 'stove' | 'none';
  unlockedBy?: { skill: 'farming' | 'mining' | 'fishing' | 'combat'; level: number } | { flag: string };
}
```

### 6.11 对话脚本 Dialogue【v2 新增 · M4 前置数据契约】
```ts
export interface DialogueLine { speaker?: string; text: string; }

export type DialogueCondition =
  | { type: 'minHearts'; hearts: number }       // 与该 NPC 好感 ≥ hearts 心
  | { type: 'flag'; flag: string; equals?: boolean | number }
  | { type: 'season'; season: Season }
  | { type: 'weather'; weather: Weather }
  | { type: 'firstMeet' };                       // 读 SaveData.relationships[npcId].met===false（首次相遇），对话后置 met=true

export interface DialogueNode {
  id: string;
  conditions?: DialogueCondition[];   // 全部满足才可选用
  lines: DialogueLine[];
  setFlags?: Record<string, boolean | number>;  // 结束后写入（心事件用）
  once?: boolean;                      // true=只触发一次（心事件/剧情）
}

export interface DialogueScript {
  npcId: string;
  nodes: DialogueNode[];               // 按数组顺序匹配，取第一个 conditions 全满足且未被 once 消费的节点
  fallbackNodeId: string;              // 无可用节点时的兜底
}
```
> **`once` 消费的持久化**：触发过的 `once` 节点把其 `id` 记入 `SaveData.consumedDialogueNodes`（6.9），匹配时跳过已记录者，确保心事件/剧情节点**重载存档后不重复触发**。若节点带 `setFlags`（如心事件写 `event:<npcId>:<n>`），该 flag 也用于条件判断与剧情门控。
>
> **心事件**即一个 `once:true` 且带 `minHearts`/`flag` 条件、并在 `setFlags` 写 `event:<npcId>:<n>` 的 `DialogueNode`。

---

## 7. 美术与音频资源规范

### 7.1 来源（仅用 CC0 / 明确可商用且无署名要求优先）
- **Kenney.nl**（CC0，大量像素/UI/音效）—— 首选占位与正式皆可。
- **OpenGameArt.org**（筛选 CC0 协议）。
- **itch.io** 免费素材包（务必逐一核对每个包的 license，记录到 `public/assets/CREDITS.md`）。
- 字体：Google Fonts 开源字体或 CC0 位图字体。

> **License 纪律**：每引入一个素材包，在 `public/assets/CREDITS.md` 记录：来源 URL、作者、协议、用途。禁止来源不明素材。禁止使用星露谷或任何商业游戏的原始素材。

### 7.2 规格【v2：定死基础规格】
- **基础瓦片：16×16 px**（定值，写入 `constants.ts`，全项目统一，不再更改）。
- **设计分辨率：480×270**（16:9），`pixelArt: true`、`roundPixels: true`，按窗口整数倍缩放（默认 zoom 见附录 A），关闭抗锯齿。
- 角色精灵：按帧切分的精灵表 + Phaser atlas JSON。
- 命名：`snake_case`，含语义，如 `crop_parsnip_sheet.png`、`sfx_hoe_till.wav`、`bgm_spring.ogg`。
- 音频格式：BGM 用 `.ogg`，SFX 用 `.wav` 或 `.ogg`。
- **【v2】atlas 流水线**：精灵表优先用**固定帧尺寸切分**（`spritesheet`，帧宽高写入加载配置）；不规则图集再用 TexturePacker 导出 Phaser JSON。加载清单集中在 `PreloadScene`。

### 7.3 占位策略
- 正式美术未就位前，用纯色块/Kenney 通用图占位，**保证逻辑可跑通可测试**，不阻塞机制开发。真实素材整合是 **M8** 的显式子任务（见第 8 章）。

---

## 8. 里程碑与迭代计划【v2：拆分 M0/M0.5、修正依赖、量化 DoD、补隐藏工作量】

> 每个里程碑都必须是**可运行、可玩、可验证**的增量。完成一个里程碑 → 自测 + 更新 README + **产出「事件契约 + 本里程碑新增/变更的 SaveData 字段 + 新增地图清单」交接清单** → 再进入下一个。DoD 一律为**可证伪的具体检查**。

| 里程碑 | 名称 | 内容 | 完成定义 (DoD，可证伪) |
| --- | --- | --- | --- |
| **M0** | 脚手架（纯前端，免 Rust） | Vite+TS+Phaser；Boot/Preload/MainMenu/Farm 空场景；**EventBus(纯TS)/GameState/ServiceLocator/constants/balance/controls**；ESLint(含禁 import phaser 规则)/Prettier/Vitest | `npm run dev` 出主菜单，进农场用 WASD 可走动且撞墙被挡；`npm test` 通过（含 `grid.test.ts`）；`npm run lint` 0 error |
| **M0.5** | 桌面壳与存储 | 集成 Tauri 2 + `capabilities/default.json` + `plugin-fs`；实现 `SaveStorage`（Browser + TauriFs）+ 环境探测 | `npm run tauri:dev` 出窗口并显示同一游戏；**`BrowserStorage` 用 fake `StorageLike`（注入的内存实现）做 Vitest 单测：写后读回一致**；**`TauriFsStorage` 用 `tauri:dev`/打包做烟雾测：写后读回一致**（不在 node 环境单测真实 localStorage/fs）；缺 Rust 工具链时有明确前置提示且 `npm run dev` 不受影响 |
| **M1** | 核心农场循环 | 移动+碰撞、时间日夜、锄地/播种/浇水/生长/收获、库存+快捷栏、体力、睡觉过夜（**按 4.5 流水线**）、存读档 | 种 1 株防风草，浇水 → 过夜按流水线推进 1 个生长阶段 → 4 个浇水日后成熟、收获进背包；手动存档后**关闭再开**，对比 `time/inventory/farm.tiles` 字段完全一致；`timeSystem.test.ts` 覆盖流水线顺序 |
| **M2** | 经济与小镇 | 小镇地图+场景切换、**出货箱过夜结算**、种子店买种、金钱 HUD | 把作物放出货箱 → 过夜后金币按 `ItemDef.sellPrice` 准确增加且箱清空；花钱买种使金币准确减少；买卖各有 1 条 Vitest |
| **M3** | 季节与种植深化 | 四季+换季清苗、天气（雨自动浇水）、多作物多季、**工具升级（最小铁匠占位）** | 切季后非当季非再生作物被清、耕地保留；雨天过夜免浇水仍生长；锄头交铁匠升级、过夜倒计时 N 天后档位提升、范围扩大。**依赖说明见下** |
| **M4** | 社交 | NPC 日程移动+**寻路**、对话系统（**按 6.11**）、好感度（点/心换算）、送礼、生日、首个心事件 | 与 NPC 对话当日加好感（再对话不再加）；送「爱」礼大幅加、「讨厌」礼减；NPC 按日程在场景内寻路移动且不穿墙；好感达阈值触发 1 个 `once` 心事件 |
| **M5** | 矿洞与战斗 | 矿洞分层（按种子生成）、镐采矿掉落、剑战斗、怪物 AI、HP/受击无敌帧/晕倒送回 | 下矿生成可走的层；打怪掉矿入背包；玩家受击扣 HP 且无敌帧内不再受击；HP 归零按附录 A 惩罚并送回农场 |
| **M6** | 钓鱼 | 海滩场景、抛竿、钓鱼小游戏、鱼数据 | 在符合 `FishDef` 的季节/地点/天气/时段能咬钩；小游戏成功后对应鱼入库、失败不入库 |
| **M7** | 节日与事件 | 节日日历、节日场景、更多心事件 | 到 `FestivalDef.day` 进入节日场景；好感达标触发对应心事件并写 `event:*` flag（重载存档不重复触发） |
| **M8** | 打磨与发布 | **真实 CC0 素材整合 + atlas**、UI 美化、设置菜单、数值平衡、性能优化、打包 | `tauri build` 产出 Windows 安装包，冷启动可玩完整循环；农场场景常见负载下稳定 ≥ 55 FPS；连续游玩 10 个游戏日无监听器泄漏（订阅数不随天数增长）；CREDITS.md 完整 |

> **范围控制**：M1–M3 是「必须扎实」的地基；M4–M7 是「较完整」的扩展；M8 收尾。若时间紧，可按里程碑顺序裁剪尾部，但**不可跳过 M0.5 存储抽象与 M1 的存档/时间系统**（后续都依赖它）。
>
> **【v2】里程碑依赖修正**：v1 中「M3 工具升级」依赖铁匠 NPC（M4）与采矿材料（M5），构成倒序依赖。处置：**M3 引入「最小铁匠」**——一个仅提供升级界面的占位交互点（非完整 NPC），完整社交留 M4；**升级所需材料在 M5 前由商店购买或调试给予替代，M5 后改为采矿掉落**。该取舍登记 ADR。
>
> **【v2】隐藏工作量已计入**：① 每个里程碑的「新增地图清单」把手写最小 Tiled JSON 列为子任务；② 对话脚本 schema（6.11）是 **M4 的前置交付物**，须先定稿再写 `dialogues/*`；③ NPC 寻路是 M4 的显式子任务；④ atlas/真实素材整合是 **M8** 的显式子 DoD。

#### 里程碑 → 新增 tilemap 文件清单（可勾验交付物）

| 里程碑 | 需新增的 `public/assets/tilemaps/*.json` |
| --- | --- |
| M0 | `farm.json`（最小可走农场，含 Collision/Objects） |
| M2 | `town.json`（小镇 + 种子店/出货箱出生点与传送点） |
| M5 | `mine_template.json`（矿层模板，运行时按种子程序化填充） |
| M6 | `beach.json`（海滩 + 钓点） |
| M7 | `town_festival.json`（节日变体场景，可复用 town 底图叠加节日 Objects） |

> 其余里程碑（M0.5/M1/M3/M4/M8）不强制新增地图，复用既有地图并补 `Objects`（铁匠点、NPC 出生点等）。每里程碑交接清单须勾选本表对应行是否完成。

---

## 9. 期望输出 / 交付物 (Deliverables)

> 这是用户最关心的「期望输出」。Claude Code 在每个阶段须交付如下内容。

### 9.1 工程级交付（贯穿始终）
1. **可一键运行的开发环境**：`npm install` 后 `npm run dev`（浏览器调试）与 `npm run tauri:dev`（桌面窗口，M0.5 起）。
2. **可打包的桌面应用**：`npm run tauri:build` 产出 Windows 安装包（`.msi`/`.exe`），后续兼容 macOS/Linux。
3. **通过的测试**：`npm test` 绿；核心逻辑（作物生长、库存、时间流水线、存档迁移、好感度结算）有 Vitest 覆盖。
4. **干净的代码**：`npm run lint` 与 `npm run format:check` 通过；TS strict 无报错。
5. **文档**：
   - `README.md`：如何安装依赖、运行、测试、打包；目录说明；**操作键位（附录 B）**。
   - `CLAUDE.md`：给 Claude Code 的精简约定（指向本 SPEC）。
   - `public/assets/CREDITS.md`：素材来源与协议。
   - 本 `SPEC.md`：随决策更新。

### 9.2 每个里程碑交付
- 该里程碑的**可玩增量**（按第 8 章 DoD 验收）。
- 对应**单元测试**与**手动验收清单**（写进 README 或 `docs/`）。
- 必要的**数据文件**（新作物/NPC/鱼等放 `src/data/`）。
- **「事件契约 + SaveData 字段 + 新增地图」交接清单**（见第 8 章）。
- 在 SPEC「决策记录」登记重要技术决策。

### 9.3 最终交付（M8 完成时）
- 一份可安装、可玩通核心到进阶循环的桌面游戏。
- 完整四季、至少：**8+ 作物、5+ NPC、6+ 鱼、4+ 怪物、3+ 节日、4 类工具且各可升一级、3+ 烹饪配方、每 NPC 至少 1 个心事件**（作为「较完整」的内容下限，可超出）。
- 稳定 ≥ 55 FPS（典型 PC 农场场景），无明显卡顿/内存泄漏。
- 安装包 + 简短发布说明（操作键位、玩法介绍）。

---

## 10. Claude Code 工作约定

> 这些规则让 AI 协作产出可维护的代码。也会精简版放进 `CLAUDE.md`。

### 10.1 通用纪律
- **先读后写**：改任一系统前，先读该系统与其依赖的 GameState 字段、相关事件、以及 **4.6 通信约定**。
- **小步提交**：一个提交/一次改动只做一件事（一个功能或一处修复），附清晰说明。
- **数据驱动优先**：能用数据表达的内容（作物/物品/NPC…）一律进 `src/data/`，不写死在逻辑里。
- **遵守 4.6**：系统协作严格按「通知走事件 / 查询读 GameState / 需结果走受控同步方法」，写 GameState 字段须是该字段的 owner（见 4.6 表）。
- **常量集中**：结构常量进 `constants.ts`，**可调数值进 `balance.ts`**，键位进 `controls.ts`，禁止魔法数字散落。
- **类型先行**：新增内容先定义/扩展 `src/types`，再写数据与逻辑。

### 10.2 代码质量
- TypeScript `strict: true`；**业务代码不使用 `any`**（确需时 `unknown` + 收窄并注释原因）。面对 Phaser/Tauri 等第三方类型缺口，允许**局部 `as` 断言或 `@ts-expect-error` 并注释原因**，不得为遵守纪律而大面积写 `unknown` 样板或关闭 lint。
- 函数短、单一职责；纯逻辑与渲染分离，纯逻辑可被 Vitest 直接测。
- **逻辑层（`systems`/`core`/`save`/`utils`/`data`）禁止以「值 import」引入 `phaser` 与 `entities/`**；如需 Phaser 类型仅允许 `import type`（运行期擦除，不破坏 node 单测）。由 ESLint 强制（`allowTypeImports`，详见 4.2）。
- 命名：类 `PascalCase`，变量/函数 `camelCase`，常量 `UPPER_SNAKE_CASE`，文件名与默认导出同名。
- 不留无用代码/被注释掉的死代码；不引入未使用依赖。
- **不要一次性批量创建第 3 章里的全部空文件**；按里程碑需要逐步创建真正用到的文件。

### 10.3 测试
- 新增或修改核心**逻辑**（生长、库存增删、过夜流水线、存档迁移、好感度结算）→ 配套 Vitest 用例。
- 测试只 import 逻辑层，不得 import Phaser/场景。
- 渲染/输入类不强制单测，但要有手动验收步骤写进 README/`docs/`。

### 10.4 验证清单（每次改动后自检）
1. `npm run lint` 通过 2. `npm test` 通过 3. `npm run dev` 能起、相关功能手测可用 4. 若动了存档结构 → bump `SaveData.version` 并写迁移 + 测试。

### 10.5 安全与合规
- 不引入未知来源/不可商用素材；License 记入 `CREDITS.md`。
- 存档读取要容错（损坏/旧版本不崩溃，给出降级处理）。
- Tauri 文件访问只用 `BaseDirectory.AppData` + 相对路径，遵守 `capabilities` scope。
- 不在仓库提交大体积二进制以外的敏感信息；`node_modules`、构建产物、`src-tauri/target` 进 `.gitignore`。

---

## 11. 关键 NPM 脚本（package.json 约定）

```jsonc
{
  "scripts": {
    "dev": "vite",                         // 浏览器开发（最快迭代）
    "build": "tsc --noEmit && vite build", // 前端类型检查 + 产物
    "preview": "vite preview",
    "tauri:dev": "tauri dev",              // 桌面窗口开发（M0.5 起）
    "tauri:build": "tauri build",          // 产出桌面安装包
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

## 12. 验收标准（整体）

游戏视为达到「首版较完整」需满足：
1. 能从主菜单新建游戏并连续游玩多天，跨季无崩溃。
2. 完整跑通核心循环：种地→浇水→过夜生长→收获→出售→买种/升级。
3. 经济、时间、季节、天气逻辑自洽（雨天免浇水、换季清苗、过夜流水线顺序正确）。
4. 社交可用：对话、好感度、送礼、至少一个心事件。
5. 矿洞可下、可采矿、可战斗、晕倒惩罚生效。
6. 钓鱼小游戏可玩、按规则产出鱼。
7. 至少 3 个节日可触发并进入节日场景。
8. 存读档稳定（浏览器与 Tauri 均可），旧版本存档有迁移路径。
9. `tauri build` 产出可安装运行的桌面应用，达成第 9.3 的内容下限与性能目标。
10. 所有交付物（第 9 章）齐备，CI 检查（lint/test/typecheck）全绿。

---

## 13. 风险与开放问题

| 项 | 说明 | 处置 |
| --- | --- | --- |
| WebView 性能差异 | Tauri 在不同平台 WebView 渲染/性能不一 | 优先 Windows；前端经 `SaveStorage` 解耦，若严重则评估切 Electron（登记决策） |
| 资源加载路径 | dev / Tauri WebView / 生产构建 base URL 不一致，易「浏览器能跑、打包后白屏」 | 用相对路径加载 `assets`；`tauri.conf.json` 配 `frontendDist`/`devUrl`；M0.5 打包后烟雾测一次 |
| 美术工作量 | 像素素材量大 | 全程 CC0 + 占位优先，逻辑不被美术阻塞；真实整合压到 M8 |
| 范围蔓延 | 「较完整」易膨胀 | 严格按里程碑，先地基后扩展，超出下限即可裁剪 |
| 存档兼容 | 迭代中结构频繁变 | 强制 `version` + 迁移 + 迁移测试 |
| Tiled 依赖 | 需要外部地图编辑器 | 地图 JSON 可手写小样起步，后续用 Tiled 完善；每里程碑列地图清单 |
| 数值平衡 | 附录 A 为基线，未必好玩 | 先用基线打通闭环，M8 集中调；改动登记 ADR |

---

## 14. 决策记录 (ADR Log)

> 每次做出影响架构/技术栈/范围的决定，在此**追加一行**（不删旧记录）。

| 日期 | 决策 | 理由 |
| --- | --- | --- |
| 初始 | 选用 TypeScript + Phaser 3 + Vite | 纯代码驱动，最适合 Claude Code 维护 |
| 初始 | 桌面壳用 Tauri 2（Electron 备选） | 体积小、性能好、原生文件系统利于存档 |
| 初始 | 数据驱动 + 事件总线解耦架构 | 便于持续加内容、利于单测与维护 |
| 初始 | 首版范围「较完整」，分 M0–M8 里程碑 | 地基扎实、扩展可控、尾部可裁剪 |
| v2 | EventBus 改为零依赖纯 TS emitter，逻辑层禁 import phaser | 修复「systems 在 Vitest 无渲染测试」被 Phaser 加载期击穿的问题 |
| v2 | 确立 4.6 通信权威约定（事件/读 GameState/受控同步方法三分 + 字段→owner 表） | 消除 v1 EventBus/ServiceLocator/GameState 三方矛盾 |
| v2 | 定义 4.5 过夜结算有序流水线 + 单一编排者 | 消除顺序敏感结算在纯事件架构下的不确定性 |
| v2 | 补全 SaveData（出货箱/工具在途/RNG 种子/settings 等）+ SaveStorage 抽象 | 修复存档遗漏与丢数据，使 dev/Tauri 均可验收读档 |
| v2 | 拆分 M0（免 Rust）/ M0.5（桌面壳）；M3 用最小铁匠占位 | 降低起步门槛，修正里程碑倒序依赖 |
| v2 | 物品售价以 ItemDef.sellPrice 为唯一真相源；天气统一 Weather 类型 | 消除价格双真相源与天气类型三处不一致 |
| v2 | 数值集中 balance.ts、键位集中 controls.ts，给出基线（附录 A/B） | 消除核心数值留白，避免实现臆测 |
| v2.1 | owner 表补全至覆盖全部 SaveData 可写字段 + 加兜底规则；多 owner 字段拆为单一 owner（recipes→SkillSystem、flags 按前缀分） | 兑现「字段→唯一 writer」承诺，消除 review 无据 |
| v2.1 | 逻辑层禁 import 扩到 `entities/`；区分「值 import 禁 / `import type` 放行」，ESLint `allowTypeImports` | 堵住「系统→实体→Phaser」传递断链，保住 node 单测 |
| v2.1 | 过夜流水线各步改为调用 owner 的「编排期结算方法」，编排者不越权写他系统字段 | 让流水线与 4.6 owner 约定自洽 |
| v2.1 | 掷次日天气纳入「节日强制 sunny」覆盖；定义 day→weekday 映射与日程优先级 | 消除天气与节日规则冲突、补周/星期定义 |
| v2.1 | 配方解锁唯一真相源定为 `RecipeDef.unlockedBy`，删 `SkillPerk.unlockRecipeIds` | 消除配方解锁双真相源 |
| v2.1 | 补 `wateringCanWater`/`relationships.met`/`consumedDialogueNodes` 等运行态字段；fs:scope 改对象数组 | 补丢失运行态、修 Tauri 权限事实错误 |
| v2.2 | RNG 改 `{seed,state}` 持久化 + 域派生（mulberry32/splitmix32） | 根除读档后随机序列重复/漂移；区分"序列随机"与"可复现域派生" |
| v2.2 | 过夜流水线第 1 步补 `time.minute=360`；晕倒恢复按 `faintContext` 分支 | 修睡醒时刻未重置、晕倒恢复自相矛盾 |
| v2.2 | 删 `unlocked.tools`（并入 `player.tools: Record`）、删 `unlocked.mineLevel`（并入 `mine.deepestLevel`，电梯层派生） | 消除工具/矿洞双真相源 |
| v2.2 | 快捷栏定为 `inventory` 前 12 格视图（删独立 `hotbar` 数组，只存 `hotbarSelectedIndex`） | 消除双容器导致的物品重复/搬运歧义 |
| v2.2 | Tauri 运行期探测改 `__TAURI_INTERNALS__` + 资源路径硬规范（base:'./'、相对加载） | 修 `__TAURI__` 误判、防打包后白屏 |
| v2.2 | 8 向移动定死（斜向归一化）；补 `InteractionSystem` 到系统目录；节日 flag 加 `:<year>` | 去除实现期二义；补缺失系统；节日跨年可重触发 |
| v2.2.1 | `CURRENT_SAVE_VERSION=1`（规格期演进无需迁移）；第 16 章历史摘要加免责声明 | 明确版本口径；消除旧字段残影误读 |
| v2.2.1 | `RandomService` 从 `utils` 移到 `core`（纯 PRNG 留 utils） | 消除"纯函数工具持有状态"的架构冲突 |
| v2.2.1 | 过夜流水线补步 10 集中广播 `time:newDay`/`weather:changed` 等通知事件（存档顺延为步 11） | 明确 UI/音频通知时机，避免读到结算中间态 |
| v2.2.1 | 补 `createNewGame()` 初始 SaveData 默认值、最小 `EventMap`、整理规则、M0.5 存储测试口径 | 补 M0/M1 实现精确性，减少代理臆测 |
| M0 | 占位纹理在运行时由 `PreloadScene` 用 Graphics 生成（草地/玩家），不引入二进制素材 | M0 不被美术阻塞；逻辑/碰撞可跑通可验证 |
| M0 | `farm.json` 用单瓦片 tileset + Collision 对象层（矩形→静态体），而非 tile 碰撞 | 手写最小地图更简单稳健；与 SPEC 4.4「从 Collision 生成静态碰撞体」一致 |
| M0 | RandomService 序列随机用 mulberry32（单一 uint32 state），域派生用 splitmix32 | 满足 6.9「state 可完整序列化」与「域派生确定性」 |
| M0 | M0 用固定种子 `0x1a2b3c` 新建游戏；存读档（SaveStorage/SaveSystem）留 M0.5/M1 | 按 SPEC 里程碑拆分，M0 只验证脚手架与可走动农场 |
| M0.5 | TauriFsStorage 走 `createSaveStorage()` 动态 import，按 `__TAURI_INTERNALS__` 探测 | 浏览器主包不打入 @tauri-apps/plugin-fs（已验证代码分割）；探测比 `__TAURI__` 可靠 |
| M0.5 | Tauri 用 lib.rs(`run()`)+main.rs 形态；`tauri:dev/build` 前置 `check-rust.mjs` | Tauri 2 推荐形态、移动端可复用；缺 Rust 时给清晰提示不阻塞浏览器开发 |
| M0.5 | 存档演示用 `K`/`L` 键（非 F5，F5 在浏览器会刷新） | 避免与浏览器快捷键冲突 |
| M1 | 工具(锄/壶/镐/斧)作为不可堆叠背包物品(itemId=ToolType)占快捷栏格，档位仍查 `player.tools` | 保持"快捷栏=inventory 前12格"模型,又能 Stardew 式选用工具;`player.tools` 仍为档位唯一真相源 |
| M1 | 各系统按 4.6 owner 实现为 ServiceLocator 注册的无状态单例,跨系统走 ServiceLocator + 受控同步/编排期结算方法 | 落地 4.6 通信模型;状态全在 GameState,系统可单测 |
| M1 | 过夜结算的步 11 自动存档由睡觉编排者(FarmScene.sleep)在 processNewDay 后 await SaveSystem.save 完成 | save 是异步+注入存储,放场景编排;processNewDay 保持同步(步1–10) |
| M1 | M1 农场无水源,水壶初始 40 次足够 DoD;补水(refillWateringCan 已备)留到有水源地图 | 不阻塞 M1 DoD,按里程碑推进 |
| M2 | 抽 `WorldScene` 基类承载玩法逻辑(地图/玩家/输入/时间/昼夜/传送/睡觉/存档),Farm/Town 为薄子类 | 多场景复用,避免 FarmScene 逻辑重复;子类只填 onSetup/onInteract |
| M2 | 传送数据驱动:Tiled `Objects` 层 `teleport` 矩形带 `targetScene/targetX/targetY` 属性,回程出生点避开对方传送区 + 400ms 冷却 | 符合 SPEC 4.4;防传送回弹 |
| M2 | 卖出经"出货箱"(站箱前 E 投放选中堆→过夜第2步结算);买入经种子店浮层(`ShopOverlay`,暂停场景+时间) | 落地经济循环;overlay 暂停语义符合 4.3 |
| M2 | 商店 `openHours` 字段 M2 暂不强制(随时可买);季节限定 stock 生效 | DoD 只需买卖跑通,营业时间约束留后续 |
| M3 | 工具升级 = 金币 + 2 天(M3 不要材料,材料 M5 采矿后补);升级期工具从背包取走、过夜归还且档位提升 | 自包含可玩;铁匠在小镇,符合 ADR「M3 最小铁匠」 |
| M3 | 工具档位影响**作用范围**(朝向直线:basic1/copper3/iron5/gold7/iridium9)与水壶容量 | 升级有可见收益(SPEC 5.5「扩大范围/提高效率」) |
| M3 | 天气视觉用 Phaser 粒子(雨/雪);雨天自动浇水沿用 M1 过夜流水线步5 | 低成本天气表现;逻辑无变 |
| M3 | 冬季无作物(换季全清),种子店冬季空 stock;6 种作物(春2/夏2/秋1/夏秋1) | 季节差异化;不阻塞(冬季空店不报错) |
| M3 | AoE 一次挥动 = 一次动作 = 扣一次体力(非逐格);锄地/浇水限农场内、瓦片限地图边界内 | 防高档工具低体力暴扣 HP;防越界写幽灵瓦片、防农场外耕作污染 farm.tiles |
| M3 | 换季清苗严格按 SPEC 4.5 步3:仅清「非当季 且 非再生」作物,再生作物即使离季也豁免保留 | 对齐 SPEC/DoD(审查发现原实现误清再生作物) |
| M4 | NPC 寻路用**线性插值(lerp)**向日程 waypoint 移动(非 A*);NPC 像素位置派生态(schedule+time 实时算,不入档) | M4 DoD 只需「按日程移动」;A* 留有 Collision 复杂场景再上 |
| M4 | 对 NPC:`E`=对话(优先于开店/收获/睡觉),`空格`+手持非工具物=送礼;靠近 24px 判定 | 复用现有键,交互直观 |
| M4 | 2 个 NPC(米拉/山姆),对话单文件 `data/dialogues.ts`;心事件 = `once` 节点(2 心触发、写 `event:*` flag、入 `consumedDialogueNodes` 防重触发) | M4 范围足够;对话量大再拆按 NPC 分文件 |
| M5 | 矿层用 `deriveInt(seed,'mine',floor)` 域派生(重进同层布局相同);层内运行态(石/矿/怪)不入档,只持久 `mine.deepestLevel` | 符合 SPEC 5.8/RNG 约定 |
| M5 | 矿洞晕倒(HP=0 或矿洞内 02:00)=**立即**送回农场(非过夜):扣钱 min(gold×0.1,500)+丢≤3 非工具物+恢复满血/半体力(按附录A);经 EnergySystem.faintMine() 不越权写 hp;补齐并删除 M3/M4 遗留的过夜 mine faint TODO/死分支 | 落地 DoD「HP 归零被送回并惩罚」;owner 合规 |
| M5 | `mine.json` 无 Ground 层(暗相机背景);矿洞 `showWeather=false`/`useDayNight=false`(地下无天气、恒暗) | 复用 WorldScene,少建资源;矿洞氛围 |
| M5 | 战斗:剑伤 base8+档位×6 ±15%,接触伤害 + 700ms 无敌帧;镐采矿单格(石→stone,矿脉→ore) | 符合附录 A;电梯/存点(每5层)留后续打磨 |

---

## 15. 启动指令（给 Claude Code 的第一步）

请从 **M0** 开始（**M0 只需 Node，不集成 Tauri**）：

1. 初始化工程：Vite + TypeScript + Phaser 3，按第 3 章建立**当前需要的**目录骨架（勿一次性铺满空文件）。
2. 配置 ESLint（含逻辑层禁 `import 'phaser'` 的 `no-restricted-imports`）+ Prettier + Vitest（node 环境，复用 vite.config）与第 11 章脚本。
3. 建立基础设施：`EventBus`（零依赖纯 TS，见 4.2）、`GameState`、`ServiceLocator`、`constants.ts`、`balance.ts`、`controls.ts`。
4. 实现 `BootScene → PreloadScene → MainMenuScene → FarmScene` 流程：农场放一张手写的小 Tiled JSON 地图，玩家（占位精灵）用附录 B 键位可移动且有 `Collision` 碰撞。
5. 写最小 Vitest（如 `grid.ts` 坐标转换）确保测试链路通且不触碰 Phaser。
6. 产出 `README.md` 与 `CLAUDE.md`，更新本 SPEC 的「决策记录」。

完成 M0 的 DoD 后，请暂停并报告：已实现内容、如何运行验证、下一步（**M0.5：集成 Tauri 与 SaveStorage**）计划。**此后每完成一个里程碑都暂停报告一次**。

---

## 16. 变更摘要（按版本累积）

> **阅读须知**【v2.2.1】：以下为按版本累积的历史变更摘要（ADR 惯例，不删旧记录）。**若某条与 v2.2/v2.2.1 当前规格或 6.9 当前 SaveData 冲突，一律以后者为准**。摘要里出现的 `rngSeed`/`hotbar`/`unlocked.tools`/`unlocked.mineLevel` 是"当时字段"，v2.2 已分别改名为 `rng:{seed,state}`、并入 `inventory` 前 12 格视图、并入 `player.tools`、并入 `mine.deepestLevel`——当前权威字段一律以 6.9 为准。

本版相对 v1 的实质变更（详见各小节 **【v2】** 标记与第 14 章 ADR）：
1. **通信模型**（4.6 新增）：三分法 + 字段→owner 表 + ✅/❌ 例，解决 EventBus/ServiceLocator/GameState 矛盾。
2. **过夜结算流水线**（4.5 重写）：10 步有序流程 + 单一编排者 `TimeSystem.processNewDay()`。
3. **EventBus**（4.2 重写）：零依赖纯 TS，逻辑层禁 import phaser（ESLint 强制），保住可测性。
4. **存档**（5.12/6.9 重写）：补 `shippingBin/toolUpgrades/rngSeed/settings/chests/tools/hotbar` 等；新增 `SaveStorage` 抽象（Browser+TauriFs）；划清持久态/派生态。
5. **Tauri 集成事实**（5.12）：plugin-fs 包名、`capabilities` 权限、AppData scope。
6. **数值/控制基线**（附录 A/B、balance.ts/controls.ts）：体力/HP/能耗/价格/好感/天气概率/键位等全部定基线。
7. **数据模型一致性**（6.x）：售价唯一真相源、`Weather` 统一、`growthStages`/再生语义明确、新增 `RecipeDef`/`DialogueScript`/`SkillPerk`、好感点↔心换算。
8. **里程碑**（第 8 章）：拆 M0/M0.5、修正 M3 倒序依赖、DoD 改为可证伪、补对话/寻路/地图/atlas 隐藏工作量与交接清单。
9. **新增机制规格**：烹饪闭环（5.15）、水壶补水（5.3）、晕倒惩罚（5.1）、NPC 寻路（5.7）、overlay 暂停语义（4.3）。

**v2.1 修订**（对 v2 的对抗式验证后修补，详见 **【v2.1】** 标记与 ADR）：
1. **owner 表完备化**（4.6）：补全 `maxEnergy/maxHp/wateringCanWater/hotbarSelectedIndex/unlocked.shops/position/facing/rngSeed/version/name` 等的 owner，加「未列字段默认 SaveSystem 初始化、运行期只读」兜底规则；`unlocked.recipes` 唯一 owner=SkillSystem，`flags` 按 `festival:*`/`event:*`/`dialogue:*` 前缀分给 FestivalSystem/DialogSystem。
2. **逻辑层隔离加固**（4.1/4.2/10.2）：禁 import 扩到 `entities/`；明确「值 import 禁、`import type` 放行（ESLint `allowTypeImports`）」；建议逻辑层用自定义 `Vec2/Rect` 彻底去 Phaser 类型；✅ 示例改为「逻辑层发 `crop:harvested` 事件、表现层实例化 `DroppedItem`」。
3. **流水线与 owner 自洽**（4.5/4.6）：10 步改为调用各 owner 的「编排期结算方法」（`settleShippingBin`/`growOvernight`/`tickUpgrades`/`restoreOnSleep` 等），编排者只写 `time.*`。
4. **天气×节日**（4.5 步4）：掷天气后若次日为节日则强制 `sunny`；并定义 `weekday=(day-1)mod7` 与 `schedule` 选取优先级。
5. **配方解锁单一真相源**（5.10/6.10）：删 `SkillPerk.unlockRecipeIds`，以 `RecipeDef.unlockedBy` 为唯一来源。
6. **运行态补全**（6.9）：`player.wateringCanWater`、`relationships.met`、`consumedDialogueNodes`；派生态清单补 `DroppedItem`/商店每日库存/玩家实时位置；再生作物复用 `daysInStage`（6.1）。
7. **事实修正**（5.12/2.3）：`fs:scope` 改对象数组形式；WebView2/Rust 标注「仅 M0.5+ 需要」。

**v2.2 修订**（独立复审后消除"双真相源/软口径/边界未定"，详见 **【v2.2】** 标记与 ADR）：
1. **RNG 自洽**（6.9/附录A/4.5/5.8）：`rngSeed`→`rng:{seed,state}`，序列随机就地推进 `state`（随存档序列化，根除读档后重复/漂移），可复现内容用域派生 `derive(seed,domain,...keys)`；矿洞层改域派生；统一 `RandomService`，禁 `Math.random()`。
2. **过夜流水线**（4.5）：第 1 步补 `time.minute=360`（回 06:00）；第 8 步 `restoreOnSleep(faintContext)` 按 `normal/farm/mine` 分支恢复，不再"先 `energy=maxEnergy` 再说晕倒"。
3. **消除双真相源**（6.9/4.6/5.5/5.8）：删 `unlocked.tools`（`player.tools` 改 `Record<ToolType,ToolTier>` 为唯一档位源）、删 `unlocked.mineLevel`（`mine.deepestLevel` 唯一进度源、电梯可达层派生）。
4. **库存模型定死**（5.4/6.9/附录A）：快捷栏 = `inventory[0..11]` 视图，删独立 `hotbar` 数组，只存 `hotbarSelectedIndex`。
5. **Tauri 与资源**（5.12）：运行期探测改 `'__TAURI_INTERNALS__' in window` 封装为 `isTauriRuntime()`；新增资源路径硬规范（`base:'./'`、相对加载、M0.5 打包烟雾测）。
6. **边界硬口径**（5.1/3 系统目录/5.11）：8 向移动定死（斜向归一化）；补 `InteractionSystem.ts`；节日 flag 改 `festival:<id>:<year>`。
7. **错别字**（M3）：「铁匷」→「铁匠」。

**v2.2.1 修订**（文档清理 + 实现精确性，详见 **【v2.2.1】** 标记与 ADR）：
1. **存档版本**（6.9/10.4）：`CURRENT_SAVE_VERSION = 1`；明确规格期演进（v2→v2.2）无历史存档、无需迁移，迁移机制仅用于首发后的结构变更。
2. **历史摘要免责**（第 16 章）：加"与 v2.2 冲突以 6.9 为准"声明，消除 `rngSeed`/`hotbar` 等旧字段残影的误读。
3. **RandomService 归位**（第 3 章/4.6/RNG 约定）：纯 PRNG 留 `utils/random`（无状态），状态服务 `RandomService` 移到 `core/`，消除"纯函数工具持有状态"的架构冲突。
4. **过夜通知事件**（4.5）：步 1 不再中途广播 `time:newSeason`；新增步 10 在结算后、存档前集中广播 `time:newDay`/`time:newSeason`/`weather:changed`（仅 UI/音频用，禁写 GameState），自动存档顺延为步 11。
5. **新游戏初始存档**（6.9）：补 `createNewGame(): SaveData` 全字段默认值（含 `rng`/`time.weather`/`inventory` 长度/`player.tools` Record 形状/`mine.deepestLevel` 初值）。
6. **事件载荷**（4.2）：给最小 `EventMap` 载荷形状示例。
7. **库存整理 + 存储测试**（5.4/M0.5）：明确整理作用于全部 36 格、M1 可暂不做；`BrowserStorage` 用 fake `StorageLike` 单测、`TauriFs` 走烟雾测。

---

## 附录 A：数值平衡基线（`src/config/balance.ts`）【v2】

> 以下为**实现基线**：实现时以此为准，跑通闭环后可在 M8 调整；**改动须登记 ADR**。单位：energy/HP 为点，时间为游戏分钟，价格为金币。

**时间**
- 真实↔游戏：`700ms = 10 游戏分钟`（推进步长 10 分钟）。
- 可玩时段：`06:00 (=360) → 次日 02:00 (=1560)`，强制睡 `02:00`。

**玩家**
- `maxEnergy = 270`，`maxHp = 100`。
- 移动速度：`基础 80 px/s`（体力 ≤0 时 ×0.6）。
- 初始：`gold = 500`，工具 `hoe/wateringCan/pickaxe/axe`（basic 档），种子 `parsnip_seeds ×15`，出生于农场屋门口。
- 水壶容量：`basic = 40 次`，每档 +20；空需到水源补满。

**能耗（每次动作）**
- 锄地 2、浇水 2、采矿 2、砍树 2、挥剑 2、镰刀收割 0。
- 体力 ≤0 后每次动作改扣 `HP 4`。

**晕倒惩罚**（`hp` 处理：晕倒醒来一律 `hp = maxHp`，惩罚只作用于 energy/金钱/物品，不再扣血）
- 农场/熬夜晕倒（`faintContext='farm'`）：次日醒来 `energy = maxEnergy`、`hp = maxHp`，扣 `min(gold×0.1, 100)`。
- 矿洞晕倒（`faintContext='mine'`）：`energy = maxEnergy×0.5`、`hp = maxHp`，扣 `min(gold×0.1, 500)` + 随机丢失 ≤3 个背包物品，送回农场。
- 正常睡觉（`faintContext='normal'`）：`energy = maxEnergy`、`hp = maxHp`，无惩罚。

**库存**：背包 36 格；快捷栏 = `inventory` 前 12 格视图（不另存数组，见 5.4）；`maxStack = 999`。

**随机 (RNG)**：序列随机 PRNG 用 **mulberry32**（32-bit，单一 `state:number` 即可完整序列化）；域派生 `derive(seed, domain, ...keys)` 用 **splitmix32** 对 `seed` 与 key 哈希。新游戏 `seed` 取一次性熵（如启动时间戳）写入存档后即固定。禁止直接 `Math.random()`。

**经济**：出货箱按 `ItemDef.sellPrice` 全额结算；商店买入用 `ShopStockEntry.price`。防风草示例：种子买价 20，产出 `parsnip` 售价 35。

**天气概率（按季，过夜掷次日）**
- 春：sunny 0.78 / rain 0.22 / storm 0 / snow 0
- 夏：sunny 0.80 / rain 0.10 / storm 0.10 / snow 0
- 秋：sunny 0.78 / rain 0.22 / storm 0 / snow 0
- 冬：sunny 0.70 / rain 0 / storm 0 / snow 0.30（雪不自动浇水）
- 节日当天强制 sunny。

**好感度**：`1 心 = 250 点`，上限 `10 心 = 2500`。每日首次对话 `+20`；送礼/周上限 2 次，喜好增减：love `+80` / like `+45` / neutral `+20` / dislike `-20` / hate `-40`；生日当天送礼 ×8 倍率。

**技能**：每技能 10 级；升到 `L` 级所需累计 XP = `L×L×100`（即 L1=100, L2=400, …, L10=10000）。示例 XP：收获作物 +8/个、采矿击碎节点 +6、钓到鱼 +10、击杀怪物 +6。

**战斗**：玩家剑基础伤害 basic 8 / 每档 +6；命中怪物伤害 = 基础 ±15% 随机；玩家受击扣 `monster.attack` 点 HP；无敌帧 `700ms`。

**钓鱼**：小游戏「绿条」随鱼上下移动，玩家按住上浮；`difficulty` 越高鱼移动越快越乱；钓鱼技能每级使绿条加长 `+4%`。

**渲染**：设计分辨率 `480×270`，默认相机 `zoom = 3`，整数倍缩放。

---

## 附录 B：默认键位（`src/config/controls.ts`）【v2】

> 可重绑定，预留 i18n；README 的「操作键位」据此生成。

| 动作 | 默认键 |
| --- | --- |
| 移动 | `W A S D` / 方向键 |
| 使用手持工具/主操作（对朝向瓦片） | 左键 / `空格` |
| 交互（对话、开门、开箱、上床睡觉） | 右键 / `E` |
| 选择快捷栏 1–10 | `1 2 3 4 5 6 7 8 9 0` |
| 选择快捷栏 11–12 | `-` `=` |
| 快捷栏滚动选择 | 鼠标滚轮 |
| 打开背包 | `I` / `Tab` |
| 打开菜单 / 暂停 | `Esc` |
