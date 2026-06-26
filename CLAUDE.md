# CLAUDE.md —— 给 Claude Code 的精简工作约定

> 本文件是精简版工作指令。**唯一权威规格是 [`SPEC.md`](./SPEC.md)**；动手前先读相关章节，有歧义以 SPEC 为准，做出影响架构/范围的决定要在 SPEC 第 14 章「决策记录」追加一行。

## 核心纪律（详见 SPEC 第 10 章）

1. **先读后写**：改任一系统前，先读它依赖的 `GameState` 字段、相关事件、以及 SPEC 4.6 通信约定。
2. **通信走 4.6**：状态变更通知用 `EventBus`（过去时事件）；同步查询直接读 `GameState`；需返回值/可能失败的操作走受控同步方法。写 `GameState` 字段须是该字段的 owner（见 4.6「字段→owner」表）。
3. **逻辑层禁 Phaser**：`systems / core / save / utils / data` 禁止「值 import」`phaser` 与 `entities/`；如需 Phaser 类型仅允许 `import type`。由 ESLint 强制（`eslint.config.js`）。这保证纯逻辑可被 Vitest 在 node 环境测试。
4. **数据驱动优先**：作物/物品/NPC/鱼等内容只改 `src/data/`，不写死在逻辑里。
5. **类型先行**：新增内容先扩展 `src/types`，再写数据与逻辑。
6. **常量集中**：结构常量进 `config/constants.ts`，可调数值进 `config/balance.ts`，键位进 `config/controls.ts`，禁止魔法数字散落。
7. **随机走 RandomService**：序列随机用 `core/RandomService`（推进 `GameState.rng.state`），可复现内容用 `derive(...)`；禁止 `Math.random()`。
8. **存档改结构**：bump `CURRENT_SAVE_VERSION` + 写 `migrate` 分支 + 迁移测试。

## 每次改动后自检

1. `npm run lint` 通过 2. `npm test` 通过 3. `npm run dev` 能起、相关功能手测可用 4. 若动了 `SaveData` 结构 → 见纪律 8。

## 里程碑

按 SPEC 第 8 章 M0→M8 推进，每个里程碑都是可运行/可玩/可验证的增量，完成后暂停并报告。当前：**M0–M8 全部完成**（打包因本机无 Rust 未做实际 `tauri build`，已文档化；美术/音频为占位与程序化合成，真实 CC0 素材整合为后续工作）。
