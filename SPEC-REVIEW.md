# SPEC.md 评审报告(多智能体 + 对抗式验证)

> 生成方式:7 维度并行审查 → 每条发现回查 SPEC 对抗式验证 → 综合去重。共 89 个 agent、81 条原始发现,验证后保留 79 条、驳回 2 条。
>
> **交付就绪度: yes-with-fixes**(可交付,但开工前需打一轮规格补丁)

## 一、总体评估

整体可交付,但需要在开工前打一轮「规格补丁」。SPEC 的骨架(技术栈、目录、分层、里程碑、TS 接口范式、工程纪律)做得扎实,体现了对 AI 协作模式的真实理解,这是它最大的价值。它的系统性弱点在于「海拔失衡」:低风险的脚手架部分(目录树、接口形状、纪律)写得极详尽,而真正决定可玩性与正确性的部分(跨系统通信的唯一权威模式、过夜结算的精确顺序、SaveData 对运行时态的完整覆盖、核心机制的数值与算法地基)却停在一句话或留白,把最难、最易出错的判断推给了实现代理。三类根因彼此关联:通信模型矛盾会让 AI 在第一个跨系统写操作处自由发挥;SaveData 遗漏会在白天手动存档时静默丢数据;数值/语义留白会让单测期望与实现各写各的。好消息是几乎所有 finding 的修复都是局部、低成本、且 finding 自身已给出可直接采纳的方案。若按主题集中修一轮(尤其 topRisks 列出的几条),这份 SPEC 完全能支撑单一 AI 代理稳定地从 M0 推进到一个较完整的首版。

## 二、执行摘要

这份 SPEC 是一份高质量、可直接交给 AI 代理执行的星露谷类游戏开发规格：技术栈选型清晰、目录结构完整、分层架构与数据驱动原则明确、TS 接口与里程碑齐备，并自带「先读后写 / 类型先行 / 常量集中 / 决策记录」等利于 AI 协作的工程纪律。经过对抗式验证后保留的 60 条 finding 中,无一条被判定为会彻底阻断项目的 critical;问题集中在四个根因主题:(1) 通信架构自相矛盾(EventBus 解耦 vs ServiceLocator/GameState 共享态 vs 需返回值的跨系统协作);(2) SaveData 系统性遗漏多处运行时/在途状态(出货箱、工具在途升级、矿洞、RNG 种子、settings 等),叠加「浏览器 dev 无 Tauri FS」的存储抽象缺失,危及「重启能读档」这一核心验收;(3) 大量核心机制只给数据接口不给数值/算法/语义(growthStages、好感点数、战斗/钓鱼公式、天气概率、键位、初始状态、对话脚本 schema、寻路),代理被迫臆测;(4) 里程碑与范围层面的隐藏工作量与依赖错配(M3 工具升级反依赖 M4/M5、对话/寻路/地图/atlas 大工作量未计预算、DoD 措辞不可证伪、过夜结算顺序未定义)。这些大多是「补一段约定/一张数值表/一个字段」即可消除的规格缺口,而非架构推倒重来,但若不修,AI 在 M1 存档、第一个跨系统交互、过夜结算这三处极易反复试错或掏空测试。建议在动工前优先消解通信模型矛盾、补全 SaveData 字段与浏览器存储抽象、为过夜结算定义有序流水线、并拍死 M0-M1 关键路径上的待定数值。

## 三、做得好的地方

- 技术栈选型成熟且高度适配 AI 代码生成:TypeScript strict + Phaser 3(纯代码驱动)+ Vite + Vitest + Tauri 2,并对每项给出了理由(2.1),桌面壳与前端解耦、Electron 备选路径也已预案(2.2)。
- 架构分层清晰、数据驱动原则贯彻到位:数据层/状态层/系统层/表现层四层职责分明(4.1),并确立「逻辑可被 Vitest 在无渲染环境测试」「新增内容只改 data/」「类型先行、常量集中」等利于 AI 落地与测试的工程原则(4.1/10.1/10.2)。
- 面向 AI 协作的工程纪律完备:事件名集中 events.ts 并禁裸字符串、强制配 TS 载荷类型(4.2);要求改系统前先读相关 GameState 字段与事件(10.1);存档改结构须 bump version + 写迁移 + 迁移测试(10.4);重要决策登记 ADR(14);M0 后暂停报告(15)。
- 里程碑增量推进且自带可裁剪边界:M0-M8 每个里程碑都是可运行/可玩/可验证的增量,并明确「M1-M3 是必须扎实的地基,M4-M7 可按顺序裁剪尾部,不可跳过 M1」(8/520 行),配合第 13 章风险表对「范围蔓延」的处置,给了代理清晰的优先级。
- 数据模型接口范式统一、可扩展:第 6 章为 Crop/Item/Tool/NPC/Fish/Shop/Monster/Festival 八类内容给出一致的 TS 接口示例,SaveData 带 version 与迁移意识,Season 等共享类型有正确复用先例,整体为「加内容只改数据文件」提供了可照搬的模板。
- 版权与素材边界处理得当:明确只参考玩法、不复制星露谷任何受版权保护素材,全部使用 CC0/自制,并配占位优先策略(1.3/7.3),降低了法律与素材阻塞风险。
- 核心验收要求务实:要求 npm test 全绿、核心逻辑(生长/库存/时间/存档迁移/好感度结算)有 Vitest 覆盖、tauri build 产出可安装运行的应用(9/10.3/12),为「能否成功交付」设了可操作的门槛。

## 四、最高优先级风险(动工前先修)

### TR1 [high] 跨系统通信模型三方矛盾:EventBus 解耦 vs ServiceLocator/GameState 共享态 vs 需返回值的协作,代理在第一个跨系统写操作处无权威可依

**为何关键:** SPEC 一边强制「系统间只通过 EventBus 通信、不直接互调」(3 结构原则/10.1),一边在 core 提供 ServiceLocator(「系统注册与获取」)又规定 GameState「所有系统读写它」(4.1),且 fire-and-forget 事件无法表达「收获入库/买卖/升级」这类需返回值、可能失败的事务。三条规则给出三条互斥/含糊的实现路径,SPEC 从未界定哪种交互走哪条。这是地基级架构留白,几乎每一个跨系统交互(收获、买卖、用工具、晕倒惩罚)都会撞到,review 也缺客观标准,导致模式混杂与隐蔽顺序 bug。

**修复:** 在 4.1/4.2/10.1 写死唯一权威二分法:状态变更通知走 EventBus(过去时事件);同步查询/读共享态直接读 GameState(读它不算耦合);ServiceLocator 仅用于启动期装配单例与无副作用查询,严禁在系统方法内 get 另一系统调其业务方法。为 GameState 各子树指定唯一 writer 系统并列「字段→owner」表;库存增删/金币增减等需结果的高频操作走受控同步方法,事件仅作 UI 通知。给 1-2 个 ✅/❌ 反例。

### TR2 [high] 过夜结算缺少有序流水线与编排者,纯事件架构下顺序敏感的多系统协同会产出错误结果

**为何关键:** 4.5 把睡觉结算(作物生长、NPC 重置、随机天气、体力回满、自动存档)并列罗列,叠加 5.2 雨天自动浇水、5.3 浇水才推进生长、5.2 换季清苗,这些步骤有强顺序依赖却未定义执行序;而「系统只发事件不互调」+「newDay 是广播事件」会诱导各系统按监听顺序自由响应,顺序不可控。顺序错(先存档后生长→重复结算/丢钱、天气未定就判浇水、清苗与生长先后)直接破坏 M1/M2/M3 核心 DoD 与第 12 章「天气逻辑自洽」验收,且这类 bug 跨季才暴露、极难定位。

**修复:** 在 4.5 写死编号「过夜结算流水线」1→N(推进日期/判换季→换季清苗→掷新天气→雨天置 watered→对已浇水地推进生长并清空 watered→体力/HP/NPC 日程→最后自动存档),并约定由显式编排者(TimeSystem.processNewDay() 串行调用各系统纯结算函数)执行而非依赖事件监听顺序;补全 watered/talkedToday/giftsThisWeek 重置与周界定;在 timeSystem/cropSystem 测试覆盖。

### TR3 [high] SaveData 系统性遗漏多处运行时/在途状态,叠加浏览器无 Tauri FS 的存储抽象缺失,危及「重启能读档」核心验收并会静默丢数据

**为何关键:** 6.9 SaveData 缺出货箱内容(5.6 过夜结算)、工具在途升级倒计时(5.5/6.3 days)、矿洞层/怪物/掉落运行时态(5.8)、RNG 种子、settings(5.13 音量须持久化)、hotbar 选中、NPC 位置等;而 5.12 允许白天暂停菜单手动存档,玩家把作物放进出货箱/把工具交给铁匠后中途存档退出,这些「在途」物品与倒计时会凭空消失。同时 5.12/2.2 把存档绑死 Tauri plugin-fs,而 9.1/M1 自检大量依赖纯浏览器 npm run dev(无 window.__TAURI__、无 plugin-fs),M1 DoD「重启能读档」在 dev 模式下根本无法落地,造成验收口径歧义与反复试错。

**修复:** 在 6.9 增补 shippingBin、toolUpgrades(在途数组)、必要的矿洞/RNG 字段并 bump version;明确派生态 vs 持久态清单(NPC 位置等可由 schedule+时间纯函数重算,不入档)。为 SaveSystem 定义 SaveStorage 存储抽象接口,提供 TauriFsStorage(plugin-fs+BaseDirectory.AppData) 与 BrowserStorage(localStorage),启动时探测 window.__TAURI__ 选择实现,使 M1 在浏览器可验收。

### TR4 [high] Tauri 2 集成事实缺失(plugin-fs 包名/capabilities/scope)且 M0 硬绑 Rust 工具链,AI 易写出权限被拒的存档代码或在起步被阻塞

**为何关键:** 5.12/2.2 只说「用 plugin-fs 写 JSON 到 app data」,但第 3 章 src-tauri 结构没有 capabilities/ 目录,而 Tauri 2 默认 deny、须在 capabilities/*.json 声明 fs:allow-write-text-file 等细粒度权限 + $APPDATA scope 否则运行时静默失败;AI 训练数据中 v1(allowlist、@tauri-apps/api/fs)占比高,极易迁移踩坑。同时 M0 DoD 硬性要求 npm run tauri:dev 出桌面窗口、15 章第 2 步即集成 Tauri,需本机 Rust 工具链 + 首次较长编译,且 tauri dev 是长驻 GUI 进程,无头/CLI 代理难自证「窗口已出现」,把最重的原生集成放在第一个里程碑门槛上。

**修复:** 在 5.12 补全包名(@tauri-apps/plugin-fs + tauri-plugin-fs)、注册代码与版本;第 3 章 src-tauri 结构加入 capabilities/default.json 示例(fs read/write/mkdir/exists + scope:[$APPDATA/*,$APPDATA/**]);存档统一用 BaseDirectory.AppData + 相对子目录禁拼绝对路径;把 Tauri 集成从 M0 硬 DoD 降级为 M0.5(M0 只需 npm run dev + 测试链路绿),并加 cargo/rustc 环境自检,缺工具链则记录前置、继续浏览器开发不阻塞玩法。

### TR5 [high] 对话脚本 schema、NPC 寻路、Tiled 地图制作、atlas 流水线四类隐藏大工作量未计入任何里程碑,AI 会在 M4/M8 撞上无规格可依的大坑

**为何关键:** 第 6 章为八类内容都给了 TS 接口,唯独对话脚本只有一个 dialogueFile: string 指针,分支/条件/变量插值/心事件触发格式全未定义——这是 M4 的数据契约,定晚了所有 dialogues/*.ts 要重写;6.4 NPCScheduleEntry 只给目标瓦片,NPC 如何从 A 走到 B(寻路)、跨场景日程如何模拟全未定义,直线移动会卡墙;Farm/Town/Mine/Beach/节日多张可玩地图的手写 Tiled JSON 工作量、从 CC0 散图到符合命名规范的 atlas 切图打包流水线,都被压在数据接口与占位口号后,没有任何里程碑为之留预算。

**修复:** 在第 6 章补 DialogueDef/DialogueNode 接口(节点/条件/分支/心事件触发/变量插值)作为 M4 前置交付物;在 5.7/6.4 指定 NPC 寻路策略(网格 A* 或 waypoint 线性插值,非当前场景只更新逻辑位置、玩家进入时按当前时间投放)并写入 ADR;在第 8 章为每个里程碑显式列「需新增地图清单」并把手写最小 Tiled JSON 列为子任务;在第 7 章补 atlas 生成约定(spritesheet 固定帧切分 vs TexturePacker)并把真实素材整合作为 M8 显式子 DoD。

### TR6 [high] EventBus 封装 Phaser.Events.EventEmitter 与「systems 可在无渲染环境被 Vitest 测试」的核心主张工程冲突

**为何关键:** 4.2 规定 EventBus 封装 Phaser.Events.EventEmitter,而 4.1/10.3/2.1 反复承诺 systems 可纯逻辑测试。系统单测必然 import 系统→import EventBus→import Phaser(barrel),Phaser 在模块加载期执行 navigator/window 检测,Vitest 默认 node 环境下抛 navigator is not defined,导致测试起不来。这直接击穿 9.3/12.10「npm test 全绿且核心逻辑有覆盖」的硬验收,且 AI 照 4.2 字面实现极可能撞墙,继而被诱导掏空测试。

**修复:** 在 SPEC 写死二选一(强烈建议 A):(A) EventBus 改用零依赖纯 TS emitter(mitt/eventemitter3 或手写约 30 行类型化 emitter),使 import EventBus 不拉进 Phaser;(B) 坚持用则从子路径精确导入并禁止 systems/core/utils/save 层 import Phaser(barrel)。用 ESLint no-restricted-imports 机器化执行,并在 ADR 登记。

## 五、全部确认发现(按主题归类)

### 通信架构与系统耦合(architecture / tech-stack / ai-readiness 合并)

#### [high] EventBus 解耦、ServiceLocator 系统获取、GameState 共享读写三方通信模型自相矛盾,代理无所适从
- **章节:** 3 结构原则, 3 core/ServiceLocator.ts, 4.1, 4.2, 10.1
- **问题:** 跨维度重复出现的同一根因(architecture 与 ai-readiness 各报一次):SPEC 强制「系统间只走 EventBus、不直接互调」(208/561 行),却又提供 ServiceLocator(「系统注册与获取」,184 行)——其本质即获取另一系统引用并调其方法,正是被禁止的行为;同时 4.1 规定 GameState「所有系统读写它」,使任何系统通过共享可变状态形成比 import 更隐蔽的耦合,且未规定任一状态子树的唯一 writer。三条规则给出互斥/含糊路径,SPEC 从未界定哪些交互走事件、哪些走 ServiceLocator、哪些直接读 GameState。
- **修复:** 写死唯一权威二分法:状态变更通知走 EventBus(过去时事件);同步查询/读共享态直接读 GameState;ServiceLocator 仅用于启动期装配单例与无副作用查询,严禁在系统方法内 get 另一系统调业务方法。为 GameState 各子树指定唯一 writer 并列「字段→owner 系统」表;把「不直接 import」精确为「不直接调用彼此业务方法」,给 ✅/❌ 反例。

#### [low] 纯 fire-and-forget 事件无法表达「需返回值/可能失败」的跨系统协作(收获入库、买卖、升级)
- **章节:** 4.2, 5.3, 5.4, 5.6, 6.9 inventory
- **问题:** EventBus 的 emit 无返回值,但收获入库(背包可能满需溢出)、买入(需校验空位/金币并回滚)、工具升级(扣金币+材料+排期的事务)本质是「请求-可能失败」,4.2 只给了已发生通知事件,无请求/应答或失败回执。但共享 GameState 已消解大半矛盾(系统可同步读写 inventory 再发通知),故残留的仅是「需结果的高频操作走受控同步方法、事件仅作 UI 通知」这一约定未显式化。
- **修复:** 在 4.2 显式约定:库存增删/金币增减等需结果的高频操作走受控同步方法(如 addItem 返回 {added,overflow}),事件仅用于 UI 刷新通知,并正式承认这是合法耦合点。

#### [medium] 单工具操作触发多系统连锁(Farm+Crop+Energy)缺原子性/顺序编排约定
- **章节:** 4.2, 5.1, 5.3, 5.5, 6.3
- **问题:** 翻地/收获横跨 Tool+Energy+Farm+Crop+Inventory:需先查体力够不够(条件分支)→扣体力→改瓦片→移除作物+入库。「系统间不直接调用」与「需先拿到布尔结果再决定是否继续」存在真实歧义,SPEC 无多系统写操作的编排模式。注:Phaser EventEmitter 是同步派发,不存在异步竞态,真正问题只是缺编排约定。
- **修复:** 在 4.2/10.1 确立「用户动作→一个编排者(ToolSystem/InteractionSystem)按固定顺序同步执行检查→改 GameState→最后只广播结果通知事件」的模式,明确事件回调内禁止再做改 GameState 的跨系统副作用。

#### [low] 事件集中在 events.ts 但缺「请求/命令/结果」分类与失败事件约定,失败路径(钱不够/背包满/体力不足)无承载
- **章节:** 4.2, 5.6, 10.5
- **问题:** 4.2 示例事件全是过去时通知,无表示「操作被拒/失败」的事件类别,而买卖/送礼/用工具等失败场景需向 UI 反馈。4.2 是开放式样例非闭集,可按同约定追加,故属约定细化而非硬约束。
- **修复:** 在 events.ts 把事件分为通知/命令/结果三类各给命名前缀,或在载荷带 success/reason(如 economy:purchaseResult { ok; reason? }),让失败可被 UI 订阅展示。

#### [low] UIScene 并行 + overlay「暂停玩法输入但不卸载」缺暂停机制定义,时间推进与输入路由会打架
- **章节:** 4.3, 4.5, 5.4
- **问题:** 4.3 规定 overlay 暂停玩法输入但不卸载,但未界定打开 overlay 时 TimeSystem 是否暂停推进(治愈类通常应暂停)、Phaser 并行场景默认都收输入如何实现「暂停玩法输入」、overlay 相对 UIScene 的输入优先级。其中唯一真正空白是 TimeSystem 暂停决策。
- **修复:** 在 4.3/4.5 补一句:打开 overlay 时暂停玩法输入并暂停 TimeSystem 推进(或显式区分哪些 overlay 暂停时间);TimeSystem 提供 pause()/resume() 且暂停态不入档。

#### [high] EventBus 封装 Phaser.Events.EventEmitter 会把整包 Phaser 拖进 Vitest,击穿「systems 可无渲染测试」主张
- **章节:** 4.1, 4.2, 4.3, 10.2, 10.3, 6.x systems
- **问题:** 系统单测必然 import EventBus→import Phaser(barrel),Phaser 加载期执行 navigator/window 检测,Vitest node 环境抛 navigator is not defined,测试起不来,直接威胁 9.3/12.10「npm test 全绿且核心逻辑有覆盖」。
- **修复:** 强烈建议 EventBus 改用零依赖纯 TS emitter(mitt/eventemitter3 或手写约 30 行类型化 emitter);或子路径精确导入并用 ESLint no-restricted-imports 禁止 systems/core/utils/save 层 import Phaser(barrel)。ADR 登记。

#### [medium] GameState/EventBus 全局单例在 HMR 下监听器泄漏与重复绑定,且单例与单测隔离的张力未给 reset 约定
- **章节:** 2.1, 4.1, 4.2, 6.9 SaveData, 10.3
- **问题:** 模块级单例 EventBus 在 Vite HMR 下旧监听器不清理会重复绑定(此支较弱,Phaser 游戏多走整页 reload);更实的是 Vitest 测试间共享模块实例,一个测试改了 GameState 会污染下一个,直接威胁 CI 全绿,而 SPEC 未给 reset 约定。
- **修复:** GameState 提供 reset()/load(SaveData)/createInitial() 工厂,测试 beforeEach 重置;系统经依赖注入/ServiceLocator 取 GameState 而非直接 import 单例;事件订阅在场景 shutdown 配对解绑,SPEC 明令「订阅必须配对解绑」。

#### [low] M8「无内存泄漏」缺解绑纪律且推迟到最后:全局 EventBus 订阅未解绑会在前 7 个里程碑积累泄漏
- **章节:** 8 (M8), 9.3, 12 (第9项)
- **问题:** 全局单例 EventBus + 场景反复进出 + overlay 不卸载是典型泄漏温床,但 SPEC 无任何 shutdown/destroy 时 off 解绑的约定,且「无内存泄漏/帧率稳定」仅在 M8 出现,缺可测基线(地图/实体/时长/工具)。
- **修复:** 从 M0 起强制「每个 Scene shutdown/destroy 时解绑其 EventBus 订阅(on/off 配对或 once)」;把 M8 帧率改为可测断言(指定地图+实体数+运行时长,监听器数量不随场景切换单调增长);数值平衡声明为贯穿 M1-M8 的持续项。

### 存档与状态持久化(data-model / architecture / spec-gaps 合并)

#### [high] SaveData 缺出货箱内容,过夜卖钱结算无法跨存档恢复(白天手动存档会丢物品)
- **章节:** 6.9, 5.6, 5.12
- **问题:** 5.6「卖出在出货箱过夜结算」,但 6.9 无任何字段存待结算物品。玩家放入出货箱后白天手动存档退出(5.12),重读时物品凭空消失、钱也拿不到。这是接口可补全的真实数据丢失路径。
- **修复:** 在 SaveData 增 shippingBin: { itemId; qty }[],并在 5.6/4.5 明确「放入→过夜结算计入 gold→清空」的时序,使存档发生在放入后结算前时数据不丢。

#### [medium] SaveData 缺工具在途升级状态,5.5 按天升级中途态会丢失
- **章节:** 6.9, 5.5, 6.3
- **问题:** 5.5/6.3 升级需等待 days,玩家把工具交给铁匠后存在「在途升级、还差 N 天、手里暂无该工具」中间态,但 SaveData.unlocked.tools 只是 string[],无法表达倒计时,读档后金币+材料双重蒸发。属示例级接口、M3 边角场景。
- **修复:** 增 toolUpgrades: { toolType; toTier; daysLeft }[] 表达在途升级;把 unlocked.tools 改为 tools: Record<ToolType, ToolTier> 结构化当前档位;明确升级期间该工具是否可用。

#### [medium] 矿洞/战斗运行时态(层布局、怪物 HP、矿层进度)是否入档未规定,影响存档自洽与晕倒惩罚量化
- **章节:** 5.1, 5.8, 6.7, 6.9 unlocked.mineLevel
- **问题:** 6.9 只存 hp/maxHp 与 mineLevel,但当前层/本层随机布局/怪物 HP/在地掉落全无字段,SPEC 也没说矿洞内能否手动存档;5.1 晕倒「损失部分金钱/物品」无数值。矿洞手动存档读回会回到不自洽矿洞。
- **修复:** 矿洞每层由「楼层号+rng 种子」确定性生成免存整层;禁止矿洞手动存档(仅电梯层/出洞落地);晕倒惩罚量化为 constants.ts 常量并做成受控结算编排。

#### [medium] GameState「所有系统读写它」与「只通过事件通信」并存,GameState 成隐藏全局耦合通道,缺唯一 writer 约定
- **章节:** 4.1 状态层, 3 结构原则, 10.1
- **问题:** 任何系统可写任何 GameState 字段(如 EnergySystem 写 energy、ToolSystem 读 energy),通过共享可变状态形成比 import 更隐蔽的时序耦合,SPEC 未规定谁是某段状态的唯一 writer。
- **修复:** 为各子树指定唯一 writer(player.energy→EnergySystem、farm.tiles→Farm/CropSystem、gold→EconomySystem),其它系统只读或经 owner 方法/命令事件请求修改;在 4.1 列「字段→owner」表,收敛为「读全局、写归属」。

#### [medium] 可设种子 RNG 未进 SaveData 且 SPEC 未规定 RNG/save-scum 立场,确定性与可复现存档无保证
- **章节:** 3 utils/random.ts, 6.9 SaveData, 4.5, 5.2, 5.8, 5.9, 10.5
- **问题:** utils/random.ts 标注「可设种子的随机」,但 6.9 无 rngSeed/state 字段;天气/掉落/钓鱼/收获量皆涉随机。SPEC 未说是否全局单一 RNG、是否持久化状态、是否允许读档刷怪/刷天气。天气已在 newDay 一次性生成并入 time.weather(读档不可刷),缓解主要 exploit。
- **修复:** 明确 random 用可序列化 PRNG(mulberry32/xorshift),GameState 持全局 rngState;6.9 增 rng:{seed;calls} 并纳入 version 迁移;声明 save-scum 立场;固定种子→固定序列做单测。

#### [medium] 每日/每周字段(talkedToday/watered/giftsThisWeek)缺重置时机,且星期/周界定缺失
- **章节:** 6.9, 4.5, 5.7, 5.2
- **问题:** 4.5 睡觉结算未列「清空 watered/talkedToday、按周清空 giftsThisWeek」;giftsThisWeek 的「周」如何界定、time 模型无 dayOfWeek 字段,但日程 key 出现 'monday'(6.4)又暗示星期概念。同时影响 NPC 日程与送礼上限两系统。
- **修复:** 在 4.5 补全重置清单;在 time 模型显式定义 dayOfWeek 推导与「周」起止,供 giftsThisWeek 与 'monday' 日程共用。

#### [low] 运行时派生态(NPC 当前位置、生长帧、对话节点)入档边界未划,缺派生态/持久态清单
- **章节:** 4.1, 5.7, 6.4 NPCSchedule, 6.9 SaveData
- **问题:** SaveData 几乎无 NPC 运行时态,白天手动存档读回需靠日程纯函数重算,但 SPEC 没说「不存、靠日程纯函数重算」还是「要存」。作物帧/光照/对话节点边界同样未划。NPC 位置实为已持久化 time 的纯函数(日程 time-keyed),可重算,故影响小。
- **修复:** 在 4.1 增「派生态 vs 持久态清单」,明确 NPC 位置由 schedule+当前 minute 纯函数推导(不入档)、作物帧由 stage 派生、光照由 minute 派生;不能确定推出的(怪物 HP/矿洞布局)要么入档要么规定离场即丢弃。

#### [low] SaveData 缺箱子(chest)家具内容,5.4 可选存取家具无法持久化
- **章节:** 6.9, 5.4
- **问题:** 5.4 支持「在箱子中存取」(标注为可选家具),但 SaveData 无放置物/家具/箱子内容字段。箱子未出现在任何里程碑/验收/内容下限,且 6.9 前言已要求按需扩展结构+bump version,补救路径已内建。
- **修复:** 实现可选箱子前增 placedObjects: { scene; x; y; type; contents? }[] 覆盖箱子及家具,并 bump version;5.4 注明箱子格数与是否参与整理。

#### [low] SaveData 缺快捷栏选中项、音量/全屏/语言设置、商店解锁等玩家可见状态
- **章节:** 6.9, 5.13, 5.14, 5.4, 5.6
- **问题:** 缺 hotbarSelectedIndex(5.4 手持)、BGM/SFX 音量(5.13 明确要求持久化)、inventory 数组长度未声明;5.14 全屏/语言及商店解锁多为臆测/可放独立 settings 文件。设置不必进 SaveData,可另建 settings.json。
- **修复:** 明确设置持久化到独立 settings 文件或 SaveData.settings(二选一);增 hotbarSelectedIndex;写死 inventory 定长(如 36)及 hotbar 是否为前 12 格;删除无依据的商店解锁项。

#### [medium] 存档读写在浏览器 dev 与 Tauri 下不一致,未规格化兼容层,M1「重启能读档」在 dev 模式无法验收
- **章节:** 5.12, 3 (SaveSystem), 2.2, 9.1, 10.5
- **问题:** 5.12/2.2 把存档绑死 Tauri app data 目录/plugin-fs,而 9.1/10.4 自检大量用纯浏览器 npm run dev(无 window.__TAURI__、无 plugin-fs),M1 DoD「重启能读档」在 dev 模式无 Tauri 文件系统,构成验收口径真实歧义。
- **修复:** 在 SaveSystem 定义 SaveStorage 抽象接口,提供 TauriFsStorage 与 BrowserStorage(localStorage/IndexedDB),启动时检测 window.__TAURI__ 选择实现,明确浏览器模式存档仅供开发调试,使 M1 在 dev 可验收。

#### [low] NPC 位置/日程进度未入档,但实为已持久化 time 的纯函数,只缺一句确定性重算规则
- **章节:** 6.9, 5.7, 6.4
- **问题:** relationships 只存 points/talkedToday/giftsThisWeek,无 NPC 场景/坐标;但 schedule 是 time-keyed 且 SaveData.time 已存 minute/星期/季节/天气,NPC 位置可纯函数反算,不会瞬移到错误地点。唯一缺口是「按当前时间重算、不持久化坐标」这条规则未显式写明。
- **修复:** 在 SPEC 明确「读档后 NPC 按当前游戏时间纯函数重算日程位置,不持久化坐标」,无需新增 npcState 字段。

#### [low] 节日/心事件进度仅靠泛型 flags 承载,缺键名规范
- **章节:** 6.9, 5.7, 5.11
- **问题:** flags: Record<string, boolean|number> 是承载剧情/任务进度的唯一万能桶,无「某 NPC 心事件已看过/某节日今年已参加」的命名约定或专用结构;心事件解锁需可靠记录已触发以免重复。心事件与节日同属 M7,跨里程碑冲突风险低于设想。
- **修复:** 增专用结构或键名规范(seenHeartEvents: string[]、festivalsAttended: Record<string, year>,或 flags key 形如 he:<npcId>:<n>、festival:<id>:<year>),写进 6.9。

### 数据模型一致性与语义定义(data-model)

#### [medium] sellPrice 双真相源:CropDef.sellPrice 与产出物 ItemDef.sellPrice(及 FishDef)同时存在且无主从约定
- **章节:** 6.1, 6.2, 5.6, 6.5
- **问题:** 同一收获物有 CropDef.sellPrice 与 produceItemId 所指 ItemDef.sellPrice 两个独立售价字段,FishDef 同样重复,SPEC 没说卖出读哪个、冲突谁优先,两数据文件易写成不同数字。
- **修复:** 售价单一放 ItemDef.sellPrice,从 CropDef/FishDef 删除冗余字段,卖出经 produceItemId/itemId 反查;若确有专属价则改名 baseSellPrice 并写明优先级。

#### [medium] growthStages 语义未定义:[1,1,1,1] 是几阶段几天、stage 起始索引与成熟判定均不明
- **章节:** 6.1, 5.3, 6.9
- **问题:** 注释只说「每个阶段所需天数」,未定义数组长度=阶段数还是间隔、成熟总天数、stage 从 0 还是 1、达多少算成熟、与精灵帧对应。影响 M1「过夜生长」单测的权威期望。
- **修复:** 在 6.1 精确定义:growthStages[i]=该阶段停留所需浇水夜晚数、长度=阶段数、stage 从 0 起、stage===length 即成熟、daysInStage>=growthStages[stage] 时 stage+1 归零;附 [1,1,1,1] 逐日推演与对应帧数。

#### [medium] regrowDays 与 stage/regrowReady 交互未定义,yieldMin/Max 是否对再生收获同样适用未说明
- **章节:** 6.1, 5.3, 6.9
- **问题:** 再生作物收获后 stage 回退到第几级、regrowDays 用什么计数、regrowReady 由谁置位/清除、yieldMin/Max 是否每次再生都生效均未定。现有 daysInStage+regrowReady 足以编码(无存档往返硬缺口),缺的是约定。
- **修复:** 明确再生状态机:收获后 stage 设为固定再生起始阶段,用 daysInStage 累计到 regrowDays 后置 regrowReady;明确 yieldMin/Max 是否每次生效;给逐日示例。

#### [medium] 天气取值域三处打架:SaveData.time.weather: string vs FishDef('sunny'|'rain'|'any') vs 5.2 四种天气
- **章节:** 6.9, 6.5, 5.2
- **问题:** SaveData 太宽(string)、FishDef 缺暴风雨/雪、5.2 文字有四种,钓鱼系统要比对当天天气与 FishDef.weather 但类型对不上,storm/snow 专属鱼无法定义。应照搬 Season 的统一类型范式。
- **修复:** 定义 export type Weather='sunny'|'rain'|'storm'|'snow';SaveData.time.weather 改为 Weather;FishDef.weather 改为 (Weather|'any')[];5.2 明确各季可出现天气子集与匹配规则。

#### [medium] 目录树含 recipes.ts 且 SaveData.unlocked.recipes 引用配方,但第6章无 RecipeDef 接口
- **章节:** 6, 5.10, 6.9, 3
- **问题:** recipes.ts、unlocked.recipes、5.10「升级解锁配方」、6.2 'cooked'/edible 都预设配方存在,但第 6 章八类接口唯独无 RecipeDef,AI 无从知道配方结构。未进任何里程碑 DoD,可按既有范式后补,故非阻塞。
- **修复:** 在第 6 章补 RecipeDef { id; type:'craft'|'cook'; ingredients:{itemId;qty}[]; output:{itemId;qty}; unlockedBy? },说明 unlocked.recipes 的 id 与之对应及与 5.10 技能等级解锁的关系。

#### [medium] talkedToday/watered/giftsThisWeek 等每日/每周字段缺重置时机规范(并入存档主题已覆盖,此处为 data-model 视角)
- **章节:** 6.9, 4.5, 5.7, 5.2
- **问题:** 详见「存档与状态持久化」主题同条:字段定义存在但重置流程、周界定、dayOfWeek 推导缺失,跨 NPC 日程与送礼上限两系统。
- **修复:** 同上:4.5 补重置清单,time 模型定义 dayOfWeek 与周起止。

#### [low] 好感度单位冲突:5.7 用 0–10 心、SaveData 用 points,缺换算与上限
- **章节:** 5.7, 6.9, 6.4
- **问题:** 5.7 好感为「0–10 心」,SaveData 存 points,但 POINTS_PER_HEART、上限、每日对话/各档送礼加减点、心事件阈值用 points 还是心数均未定。属可由 constants 自定的数值缺口,但单位错配是潜在歧义。
- **修复:** 定义 POINTS_PER_HEART(进 constants)、上限、每日对话 +N、love/like/dislike/hate +/−N(放数据表)、心事件阈值用心数,补 hearts=Math.floor(points/POINTS_PER_HEART)。

#### [low] inventory 定长可空数组与 5.4 整理/堆叠缺长度与槽位语义,且 ToolDef 与 ItemDef 'tool' 关系混淆
- **章节:** 6.9, 5.4, 6.2
- **问题:** 未约定数组定长、null 槽是否保位、整理是否压缩+排序、qty≤maxStack、非 stackable 是否独占;且 ItemCategory 有 'tool' 但工具由独立 ToolDef 定义(无 itemId 关联),工具是否进 inventory 不清,影响 Hotbar 手持索引模型。
- **修复:** 5.4/6.9 写明 inventory 定长(进 constants)、null=空槽且下标稳定、整理=合并同类至 maxStack 并按 category 排序前移;明确工具存 inventory(引用谁的 id)还是独立工具栏,统一 'tool' 类别与 ToolDef 关系。

### 核心机制缺数值与算法地基(spec-gaps / game-design)

#### [medium] 核心支柱「有意义的选择」缺数值地基:maxEnergy/各动作 energyCost/真实毫秒↔游戏分钟/作物经济基准全未定
- **章节:** 1.2, 4.5, 5.1, 6.3, 6.9
- **问题:** 1.2 把「时间/体力有限怎么分配」定为核心乐趣,但 SPEC 未给 maxEnergy 初值、各动作 energyCost 区间、每动作耗几游戏分钟、作物单位时间/体力产出价值,体力/时间/金钱三条预算曲线全空。与 SPEC 整体「schema 先行、数值后定」一致,且 M8 承接平衡。
- **修复:** 给可直接落地的基准表:MAX_ENERGY、各动作 energyCost 与耗时、据此算「一天理论可执行动作数」把取舍量化、一条作物经济基准公式;常量入 constants.ts 并注明可调需整体平衡。

#### [medium] 全文无键位/操控方案,但 9.3 把「操作键位」、5.14「按键说明」列为交付物
- **章节:** 5.1, 5.4, 5.8, 5.9, 9.3, 5.14
- **问题:** 移动/用工具/交互/背包/菜单/快捷栏/挥剑/钓鱼操作键全缺,而 9.3 与 5.14 把键位当确定契约引用。农场类键位高度标准化,AI 可推断默认,但缺权威来源且 overlay 进退键易冲突。
- **修复:** 新增「输入与操控方案」节给权威键位表(WASD 移动、E/空格交互、1-9 快捷栏、I/Tab 背包、Esc 菜单、左键用工具、钓鱼键),集中到 constants.ts 的 KEYBINDINGS,供 5.14/9.3 引用。

#### [medium] 过夜结算精确顺序未定义(出货箱入账、重置、清苗、雨天浇水、生长、存档),顺序改变结果
- **章节:** 4.5, 5.6, 5.7, 6.9, 5.3
- **问题:** 4.5 结算项并列罗列且不完整(漏出货箱入账、清空 watered、重置 talkedToday/giftsThisWeek),步骤间有强顺序依赖却未定义,先存档后加钱会丢钱、watered 未清零会免浇水续长。第 12 章要求单测覆盖,使未定义顺序成为必踩点。
- **修复:** 在 4.5 给权威编号流水线 1→N(出货箱入账→对耕地若 watered/雨则推进生长并清空 watered→生成今日天气→NPC 重置+talkedToday=false+周首日 giftsThisWeek=0→体力/HP→day/season/year 推进→最后自动存档),明确周起始日,要求单测。

#### [medium] 缺关键数值:maxEnergy/maxHp/体力消耗/毫秒↔游戏分钟无定值
- **章节:** 4.5, 5.1, 6.9 player, 3 constants.ts, 6.3 energyCost
- **问题:** 6.9 有 maxEnergy/maxHp 字段但无初值;5.1 体力为 0「变慢掉血」无系数;6.3 energyCost 无基准消耗;4.5 仅给 700ms=10 分钟示例(措辞「如」)。constants.ts 已点名这些值应进此文件却无数字。架构本为吸收此类调参而设。
- **修复:** 在 constants.ts 给权威默认初值(如 MAX_ENERGY=270、MAX_HP=100、锄地/浇水 energyCost=2、MS_PER_GAME_MINUTE=70、06:00–02:00、0 体力速度×0.5 且每分钟掉 1 HP),要求单测以 import 常量为期望。

#### [medium] 背包 36 格、快捷栏 12 格是定值还是示例不明确
- **章节:** 5.4, 6.9 inventory, 3 constants.ts
- **问题:** 5.4「如 36 格/如 12 格」的「如」字使其像示例;inventory 变长数组未约束长度。Hotbar/Overlay 格子数、快捷栏键、溢出测试都需确定值,但 36/12 本是强默认,影响有限。
- **修复:** 删「如」拍死 INVENTORY_SIZE=36、HOTBAR_SIZE=12 写入 constants.ts,明确快捷栏是否为背包前 12 格,并与键位对齐。

#### [medium] 存档未规定是否持久化 RNG 种子(spec-gaps 视角,与 data-model 同根因)
- **章节:** 3 utils/random.ts, 6.9, 4.5, 5.2, 5.8, 5.9, 10.5
- **问题:** 详见「存档与状态持久化」主题 RNG 条:可设种子 RNG 无 seed/state 字段,确定性与 save-scum 立场未决;天气已持久化缓解主要 exploit。
- **修复:** 同上:可序列化 PRNG + 单一全局 rngState + 6.9 增 rng 字段并迁移 + 声明 save-scum 立场 + 固定种子单测。

#### [medium] 资源流水线(atlas/Tiled JSON 产出、占位图生成、加载清单)无规格
- **章节:** 3 public/assets, 4.4, 7.2, 7.3, 3 PreloadScene, 13
- **问题:** 未规定 atlas JSON 格式(TexturePacker vs spritesheet 帧切分)、占位图是运行时 Graphics 还是预放 PNG、PreloadScene 加载清单是硬编码还是 manifest 驱动、手写 Tiled JSON 最小模板。Phaser 默认可兜底 M0,但长期一致性有风险。
- **修复:** 新增「资源流水线」节:角色/作物用固定帧 spritesheet、UI 用 TexturePacker atlas;占位用运行时 Graphics(makePlaceholder);加载清单数据化 assetManifest.ts;附最小可用 Tiled JSON 模板。

#### [medium] 碰撞与移动细节缺失:碰撞如何从 Collision 图层生成、物理还是手写、速度未定、8 向/4 向自我二选一
- **章节:** 5.1, 4.4, 2.1 gameConfig 物理, 3 gameConfig.ts, 6.4
- **问题:** 5.1「瓦片级碰撞/8 向移动」「8 向或 4 向+斜向」自我二选一;未说碰撞体如何从 Collision 图层生成、用 Arcade 还是 Matter、玩家速度、斜向是否归一化。Phaser 惯例可稳妥默认 Arcade,降低风险。
- **修复:** 明确 Arcade Physics + body.setVelocity、碰撞由 Collision 图层 setCollisionByProperty + collider;拍死 8 向且斜向归一化,PLAYER_SPEED 入 constants;挥剑用 overlap;在 4.4 补 Collision 判定规则。

#### [medium] 天气模型细节缺失:各季概率、是否有预报、与季节映射,且与 FishDef 类型不一致
- **章节:** 5.2, 4.5, 6.9, 6.5
- **问题:** 无各季天气概率、weather 合法枚举(string vs FishDef 联合)、storm/snow 在 FishDef 无落点、storm/snow 是否触发自动浇水(影响 M3 验收的核心规则)。预报功能属增强非缺口。
- **修复:** 定义权威 WeatherType 联合并在 6.9 替换 string、与 6.5 对齐;给各季概率表;明确 storm/snow 是否触发自动浇水;预报作可选项。

#### [medium] NPC 日程寻路完全未规格:从日程点到目标点如何移动、跨场景日程如何处理
- **章节:** 5.7, 6.4, 3 NPCSystem, M4 DoD
- **问题:** NPCScheduleEntry 只给目标瓦片,A*/waypoint/瞬移未定,地图有 Collision/Buildings 直线会卡墙;非当前场景 NPC 如何处理无模型,且 SaveData 无 NPC 位置状态。影响 M4。
- **修复:** 明确简化方案:网格 A* 或 Objects 层 waypoint 线性插值;非当前场景只更新逻辑位置不渲染,玩家进入时按当前时间投放;写入 5.7/6.4。

#### [low] 技能升级曲线/经验来源/解锁内容无数值与映射;战斗、钓鱼、矿洞生成数值/算法缺失
- **章节:** 5.10, 6.9, 5.8, 5.9, 6.7, 6.3, 6.5
- **问题:** 技能无 xp 曲线/perk 表/各行为 xp;战斗无玩家攻击力(ToolDef 无 damage)/无敌帧时长/伤害公式;钓鱼无 difficulty 1-100→玩法参数映射;矿洞未定手工还是程序化生成及下层/电梯机制。这些与 SPEC「schema 先行、数值/算法留实现」风格一致,且多属可裁剪扩展期内容。
- **修复:** 补 SkillDef/PerkDef(xp 阈值数组+每级 perk);6.3 ToolDef 增 damage? 或单列 WeaponDef,无敌帧/攻速/晕倒惩罚比例入 constants;给 difficulty→进度条参数映射;明确矿洞程序化生成为 4.4 例外并定义下层/电梯/层数上限。

#### [low] 玩家初始状态(开局金钱/初始工具种子/出生位置)未规定
- **章节:** 6.9 player, 5.5, M1/M2 DoD, 15
- **问题:** 新游戏 gold、初始工具/种子、unlocked.tools、出生场景坐标无默认值,而 M1 种作物、M2 买种子都需开局有锄头/水壶和钱/种子。spawn 机制已在 4.4 Objects 层,仅缺绑定。小但 M1 必需,易补。
- **修复:** 增「新游戏初始状态」定义(初始 gold、初始工具、初始种子、出生 FarmScene spawn 点)并提供 createNewGame(): SaveData 工厂函数约定。

#### [low] 渲染分辨率/相机缩放/设计分辨率未定,与像素完美整数缩放约束冲突
- **章节:** 3 gameConfig.ts, 7.2, 5.14, 9.3
- **问题:** 未给设计分辨率或 Scale 模式;5.14/7.2 要求整数倍缩放/像素完美,与 Phaser Scale.FIT 非整数缩放天然冲突,AI 随手用 FIT 会破坏像素完美。单文件级、易解决。
- **修复:** 约定 baseWidth/baseHeight、Scale 模式(建议 NONE+手动取整 zoom 或 FIT 配合取整)、相机 zoom 策略,常量入 constants.ts。

#### [low] i18n 只说「预留」无机制约定,文案硬编码在 data 中
- **章节:** 5.14, 6.1/6.2/6.4 name, 1.3, 3 data/dialogues
- **问题:** 5.14「预留 i18n」但无落地约定,而 name/description 直接内嵌中文。不过 SaveData 只存 id(player.name 例外),将来加英文不需迁移存档,成本有界。
- **修复:** 二选一并写入:name/description 改 i18n key + src/locales 集中文案;或明确首版不做 i18n、文案内嵌、删掉「预留」以免误导。推荐前者。

#### [low] 事件载荷类型与 GameState 字段清单未给权威表,systems 间契约靠猜
- **章节:** 4.2, 3 core/events.ts, 3 GameState.ts, 10.1
- **问题:** 4.2 给了事件名但无载荷类型(自己又要求配载荷类型);GameState 是否等于 SaveData、含哪些运行时字段(出货箱/手持槽/次日天气/rngState)未说,10.1 要求先读字段却无权威清单。TS strict + 集中 events.ts 使形状不匹配会在编译期暴露,削弱风险。
- **修复:** 附「事件目录」表(事件名→载荷类型)与 events.ts 一一对应;明确 GameState=持久化(SaveData 形状)+运行时(当前场景、shippingBin、手持槽、tomorrowWeather、rngState),并补出货箱与次日天气字段(区分哪些入档)。

### 里程碑、范围与进度节奏(scope-milestones / game-design)

#### [high] Tiled 地图、NPC 寻路、对话脚本、美术 atlas 四类隐藏大工作量未计入任何里程碑预算
- **章节:** 4.4, 5.7, 6.4, 7.1, 7.2, 13
- **问题:** 对话脚本只有 dialogueFile 指针、无 schema(M4 数据契约,定晚要重写所有 dialogues/*.ts);NPC 寻路算法未定义、跨场景日程无模型;多张可玩地图手写 Tiled JSON 与 atlas 切图打包流水线被压在数据接口与占位口号后,无里程碑留预算。
- **修复:** 补 DialogueDef/DialogueNode 接口作 M4 前置;5.7/6.4 指定寻路策略写 ADR;第 8 章为每里程碑列「需新增地图清单」并列手写 Tiled JSON 子任务;第 7 章补 atlas 生成约定并把真实素材整合作 M8 显式子 DoD。

#### [medium] 多个里程碑 DoD 用「正确/可用」等不可证伪措辞,无法被 AI 自验收
- **章节:** 8 (M2/M3/M5/M6/M7), 10.4, 12
- **问题:** M2「跨天结算正确」、M3「切季作物表正确」、M5「HP 归零被惩罚」、M6「钓到对的鱼」、M7「好感达标触发剧情」缺可观测通过/失败判据;尤其 M5 晕倒惩罚 5.1 只写「损失部分」无数值。多数有别处语义锚点,真空集中在 M5/M7。
- **修复:** 为每个 DoD 增 2-4 条可观测断言+Vitest 锚点(如 M2:卖 5 个售价 35 过夜后金钱精确 +175);在 5.1 补晕倒惩罚确定公式;同步进第 12 章。

#### [medium] M3「工具升级(铁匠)」反向依赖 M4(铁匠 NPC)与 M5(采矿材料),里程碑顺序矛盾
- **章节:** 8 (M3/M4/M5), 5.5, 6.3
- **问题:** M3 要求工具可升级,但升级需材料(可能来自 M5 矿石)、铁匠(可用 6.6 可选 npcId 的占位商店避开 M4)、跨天 days 等待(SaveData 无在途字段)。核心真实缺口是 days 在途态无字段;npcId 可选与 materialItemId 泛化削弱另两条依赖。
- **修复:** 6.9 增 pendingToolUpgrades:{toolId,readyOnDay}[] 由 TimeSystem 在 newDay 结算;M3 铁匠用 npcId 留空占位弹窗、升级材料用 M3 已有 itemId,避免误绑 M4/M5。

#### [low] 里程碑间缺「事件契约与 SaveData 字段」交接清单,跨里程碑一致性靠临场发挥
- **章节:** 4.2, 6.9, 8, 9.2
- **问题:** 8 章只描述功能,不规定每个里程碑新增哪些事件常量与 SaveData 字段。但 6.9 一次性铺开完整终态 + 4.2 集中 events.ts + 命名规范已实质覆盖一致性主轴,属打磨增益。
- **修复:** 每个里程碑补两行:本里程碑新增事件、首次写入/读取的 SaveData 字段;在 6.9 给各顶层字段标注首次落地里程碑。

#### [medium] 9.3 内容下限叠加美术×脚本×平衡成本被低估,定制内容(心事件/节日小游戏)成本被压成一行数字
- **章节:** 9.3, 5.7, 6.x, 7
- **问题:** 9.3 把 8 作物/5 NPC/6 鱼/4 怪/3 节日压成一行,但 NPC 各需 schedule+giftTastes+对话+生日+心事件,节日各需场景+小游戏;FestivalDef 无小游戏字段、无 HeartEventDef,定制逻辑成本被掩盖,易交付有数据无内容的空壳(第 12 章只要求节日可进场景,不要求小游戏可玩)。
- **修复:** 把 9.3 拆为「数据下限」与「定制内容下限」(至少 N 个 NPC 有完整三档对话、至少 1 个完整心事件、至少 1 个节日含 1 个可玩小游戏);在 5.11 澄清节日小游戏最小形态。

#### [medium] 出货箱经济只有一句话,跨天结算/价格/可见性/持久化关键规则缺失
- **章节:** 5.6, 8(M2), 12
- **问题:** 出货箱是首版主售渠道(M2 DoD、12 章核心循环),但 5.6 仅一句:售价取 ItemDef 还是 CropDef 不明、结算事件未明说、SaveData 无 shippingBin(睡前/白天存档丢物品)、即时卖与过夜卖是否差价未定。
- **修复:** 统一售价取 ItemDef;结算挂 time:newDay;6.9 增 shippingBin 并 bump version;说明价差;把出货箱结算补进 4.5。

#### [medium] 烹饪/食物→体力恢复闭环零件(recipes/cooked/edible/unlocked.recipes)散落四处,无功能规格串联
- **章节:** 3, 5.10, 6.2, 6.9
- **问题:** 四处埋了烹饪闭环零件,但第 5 章无烹饪/进食节、第 6 章无 RecipeDef、未规定在哪烹饪/吃食物如何回体力/配方如何解锁。烹饪未进任何里程碑/内容下限,遵循 DoD 的 AI 最可能不实现,沦为死代码,属一致性瑕疵。
- **修复:** 二选一:新增 5.x 烹饪与进食节+RecipeDef 接口;或砍掉烹饪并删除 recipes.ts/edible/'cooked'/unlocked.recipes 并在 9.3 注明首版不含烹饪;同步修正 5.10 措辞。

#### [medium] 技能「被动加成/解锁配方」无数据结构与规则,SkillSystem 拿不到可实现内容
- **章节:** 5.10, 6.9
- **问题:** 5.10 一行「升级解锁配方或被动加成」,无 xp 曲线、无 PerkDef、无各行为 xp;第 6 章无技能/天赋接口。未进任何里程碑 DoD/验收,可先做最小桩,但被动加成耦合经济/体力需标注。
- **修复:** 新增 6.x SkillDef/PerkDef(每级 xp 阈值数组、每级 perk 列表,perk 枚举如 {type:'cropSellBonus',value:0.1});5.10 给各级奖励占位表;各行为 xp 入 constants;标注经济/体力耦合点。

#### [medium] 晕倒/熬夜/体力归零惩罚只规格了一半,水壶补水机制整体缺失
- **章节:** 4.5, 5.1, 5.2, 5.3, 5.8
- **问题:** 惩罚只覆盖矿洞 HP=0;农场体力归零后掉血至 HP=0 算什么未定;熬夜到 02:00 后果未定(4.5 基本覆盖为强制睡回满,弱);水壶有无容量/在哪补水/是否无限完全未定,直接影响 M1 农活节奏。设计支柱「没有强制失败」使零惩罚是可选默认。
- **修复:** 在 5.1 统一定义晕倒规则并区分场景(体力≤0 继续劳作掉 HP,HP=0 或到 02:00→晕倒次日体力打折);在 5.3 写死水壶机制(显式声明首版无限水,或定容量+补水水源瓦片)。

#### [low] 把 14 个功能域作为首版一次交付对单一 AI 代理偏大,但已有裁剪边界缓解
- **章节:** 0, 5, 8, 9.3
- **问题:** 14 功能域/9 里程碑规模偏大,M4 等单条含寻路/对话引擎/好感/心事件多个子系统。但 SPEC 已有 MVP/裁剪边界(M1-M3 必做、M4-M7 可裁尾部、内容下限、迁移纪律、开放 flags 吸收进度),化解了 schema 崩坏的核心担忧。
- **修复:** 在 6.9 显式预留矿洞 RNG 种子字段,为 M4/M5/M6 补「裁剪降级说明」(如 M4 裁剪→NPC 仅静态对话无日程)。

#### [low] M1 巨型地基里程碑(移动/碰撞/时间/农事/库存/体力/睡觉结算/存读档)DoD 偏薄
- **章节:** 8 (M1), 4.5, 5.1, 5.3, 5.4, 5.12, 6.9
- **问题:** M1 塞入 8 大块,DoD 只验单链路,未覆盖体力耗尽/快捷栏/库存满分支。但按里程碑顺序 M1 的睡觉结算实际只有 3 步(NPC/天气在 M4/M3),且 9.2/10.3 横切测试纪律部分弥补,影响低于「巨型」论断。
- **修复:** 将 M1 拆为 M1a(走动可计时基座)与 M1b(农事+睡觉结算+存读档)各给 DoD,或把 DoD 扩成验收清单补边界断言;把睡觉结算在 4.5 固化为有序步骤并要求单测。

#### [low] M8「稳定 60FPS/无内存泄漏/数值平衡」缺可测基线,性能优化压在最后里程碑(并入通信主题已部分覆盖)
- **章节:** 8 (M8), 9.3, 12 (第9项)
- **问题:** 详见「通信架构」主题同条:M8 验收无测量方法/场景,解绑纪律缺失致泄漏积累,数值平衡压 M8 不现实。
- **修复:** 同上:M0 起强制订阅解绑;M8 帧率改可测断言;数值平衡声明为贯穿项就地校准。

#### [low] 9.3 给了内容数量下限却无进度节奏规格,易做出能跑通但不耐玩的版本
- **章节:** 9.3, 1.2, 5.5, 5.8
- **问题:** 无作物按四季分布要求(可全堆春季)、无工具/矿深/技能三条进度线的时间锚点、静态清单与 1.2 动态成长曲线无桥梁。属验收 vs 设计意图的打磨盲区,M8 平衡与四季愿景部分缓解。
- **修复:** 补软锚点:8+ 作物按季分布(每季 2-3 种)、给关键进度线目标节奏(约第几天升工具/下到第 X 层)、明确为设计目标而非硬验收,M8 据此平衡。

#### [low] 工具升级↔铁匠↔采矿材料依赖链在内容下限上的潜在死锁,及升级范围扩大与体力联动未规格
- **章节:** 5.5, 5.8, 6.3, 9.3
- **问题:** M3 升级需矿石而采矿在 M5(里程碑错配,真实但可用商店/低 qty 化解);先有鸡蛋死锁多属臆测(SPEC 未对采矿做 tier-gate);areaOfEffect 扩大后 energyCost 计费已被 6.3 单一 number 字段默认为定额,基本化解。
- **修复:** 在 5.5/8 点明 M3 升级材料临时来源,在 5.5/5.8 补一句 basic 工具采矿保底能力即可。

### 环境、平台与 AI 协作可执行性(tech-stack / ai-readiness)

#### [high] Tauri 2 plugin-fs 存档集成事实缺失(包名/capabilities/scope),AI 易写出权限被拒/路径越界的存档代码
- **章节:** 2.2, 5.12, 3 (src-tauri 结构)
- **问题:** 5.12 只说用 plugin-fs 写 JSON,但缺包名(@tauri-apps/plugin-fs+tauri-plugin-fs)、注册代码;Tauri 2 默认 deny,须在 capabilities/*.json 声明 fs:allow-* + $APPDATA scope,而第 3 章 src-tauri 结构无 capabilities/ 目录,AI 照搬必漏,运行时静默失败;v1 迁移陷阱高发。
- **修复:** 5.12 补包名/版本/注册代码;第 3 章加 capabilities/default.json 示例(fs read/write/mkdir/exists + scope:[$APPDATA/*,$APPDATA/**]);统一用 BaseDirectory.AppData+相对子目录禁拼绝对路径;SaveSystem 做 window.__TAURI__ 探测的 localStorage 回退;ADR 锁定 Tauri 2。

#### [medium] M0 硬绑 Tauri/Rust 工具链且 tauri:dev 为长驻 GUI 进程,可能超代理沙箱能力并阻塞起步
- **章节:** 15, 8 (M0), 2.3, 9.1
- **问题:** M0 DoD 要求 npm run tauri:dev 出桌面窗口、15 章第 2 步即集成 Tauri,需 rustup+C 编译器+WebView2 与首次较长编译,且长驻 GUI 进程难被无头代理自证。SPEC 为美术/Tiled 给了占位退路,却唯独没给 Tauri 的「缺工具链先用浏览器」兜底。
- **修复:** 把 Tauri 集成从 M0 硬 DoD 降级为 M0.5(M0 只需 npm run dev + 测试链路绿);加 cargo/rustc 环境自检,缺失则记录前置并继续浏览器开发不阻塞玩法;注明首次 Rust 编译耗时与网络要求。

#### [medium] Phaser 资源加载 base URL 在 dev/Tauri WebView/生产构建三环境不一致,易「浏览器能跑、打包后白屏」
- **章节:** 3 public/assets, 4.4, 5.12, 9.1, 9.2
- **问题:** 资源放 public/assets 被 Vite 默认 base:'/' 引用为绝对路径,dev 正常但 Tauri 生产走自定义协议(http://tauri.localhost)绝对路径解析异常致 404 白屏;Tiled tileset 相对/绝对路径叠加更易错位。SPEC 未规定 base/setBaseURL/tileset 嵌入。M8 会兜底但发现太晚。
- **修复:** vite.config 设 base:'./',Phaser load 用相对 key-path 不带前导 /;Tiled 用嵌入或统一相对 tileset;PreloadScene 用 setBaseURL 统一前缀;M0 DoD 追加「tauri build 产物能加载到至少一张图和一张 Tiled 地图」作为早期验证点;ADR 记录。

#### [medium] 文档「海拔」失衡:目录/接口/纪律详尽,核心机制数值与算法欠规格,代理被迫大量臆测
- **章节:** 5.8, 5.9, 5.7, 4.5, 6.9
- **问题:** 低风险脚手架部分写得极详,而决定手感的机制(战斗伤害公式/无敌帧、钓鱼 difficulty 映射、好感具体点数、weather/flags 弱类型取值域)停在一句话或留白。结构脚手架已在、平衡显式延后 M8 缓解,且 4.5 已给完整时段示例(一处引用偏差)。
- **修复:** 为 M4-M6 核心数值各补最小参数表/公式骨架(好感点数、战斗伤害/无敌帧、钓鱼 difficulty 映射);收窄 weather 为联合类型;声明「数值缺失处须先在决策记录提案默认值再实现,不得静默臆测」。

#### [low] 「禁用 any」与 Phaser/Tiled/Tauri 类型现实冲突,可能让代理为遵守纪律而写一堆 unknown 样板或偷关 lint
- **章节:** 10.2, 2.1, 4.4
- **问题:** 10.2 禁 any,但 Tiled 对象属性、getObjectLayer() 可空、Tauri invoke 返回多为松散/unknown。10.2 已给「unknown+收窄」旁路,且 type-first 哲学已托底,真实缺口仅是边界条款与 ESLint 规则级别未钉死。
- **修复:** 在 10.2 补边界条款:与第三方交互的边界层允许局部断言但须立即映射为项目自有强类型接口,断言不渗透系统/状态层;明确 @typescript-eslint/no-explicit-any 级别(建议 warn 或对 src/scenes 边界目录放宽),避免与「lint 全绿」字面冲突。

#### [low] 瓦片尺寸 16 vs 32 的「或」表述带来轻微歧义(加粗 16 已是默认,非真正未决)
- **章节:** 7.2, 3 constants.ts, 15.5, 0, 4.4, 6.3 areaOfEffect, 6.4
- **问题:** 7.2 加粗 16×16 即主值,括号「或 32×32」只是逃生注脚,代理自然取 16;M0 仅产出可丢弃的占位地图/精灵(7.3 占位优先),不存在「立即阻塞/返工整张地图」。残留仅是措辞歧义与缺 SCALE/角色帧尺寸建议。
- **修复:** 删除「或 32×32」拍死 TILE_SIZE=16 写入 constants.ts,32 降为 ADR 注脚;补 SCALE(整数倍)与角色帧尺寸建议(如 16×32)。

#### [low] 完整空目录树可能诱导代理一上来批量创建空文件/占位 stub,违背增量里程碑
- **章节:** 3, 8, 10.2, 15
- **问题:** 第 3 章约 90 条目完整目录树未标注是最终蓝图还是 M0 骨架。但 15 章逐步指令、M0 DoD 精确枚举、13 章「严格按里程碑」、10.2「不留死代码」已实质压制批量造壳,且空 .ts 在 strict/ESLint 下不报错(原 finding 此点不准),属措辞清晰度小瑕疵。
- **修复:** 在第 3 章顶部标注「本目录树为最终形态蓝图,按里程碑逐步创建,每个文件诞生时即应有可运行/可测内容」;把 15.1「建立目录骨架」改为「仅创建当前里程碑所需文件」。

#### [low] DoD 缺「无人类在场时如何自验玩法」的可执行抓手,但 SPEC 既有逻辑/渲染分离架构已大体支持自验
- **章节:** 8, 9.2, 10.4, 12
- **问题:** 8 章 DoD 多为需人操纵 UI 的玩法描述,10.4「手测可用」混进自检。但 4.1/10.3 的「逻辑可被 Vitest 无渲染测试」+ tests/ 脚手架已支持代理用 CropSystem/TimeSystem/SaveSystem 单测自证(原 finding「代理无任何自动验收手段」与 SPEC 矛盾),残留仅 DoD 未显式交叉引用测试文件、自检未按代理/人类切分。
- **修复:** DoD 点名对应 Vitest 测试文件或重写为状态断言;在 10.4 区分「代理可自验项」与「需人类手测项」,后者集中成交给用户的清单。

#### [low] 瓦片尺寸「定下后再写」与「常量集中/脚手架先行」执行顺序的轻微措辞矛盾(与 7.2 歧义同根因)
- **章节:** 7.2, 10.1, 10.4, 15
- **问题:** 与上「瓦片尺寸」条同根因:加粗默认值已化解 M0 卡壳,constants.ts 单一常量源 + 同轮产出 grid.ts/地图使其自洽,属措辞级小瑕疵。
- **修复:** 同上:去掉「或 32×32」歧义、32 降为 ADR 注脚;检查全文还有哪些「如…/或…」待定项落在 M0-M1 关键路径上一并定死。

#### [low] 示例数值大量用「如 36 格/700ms/[1,1,1,1]」,代理无法区分硬约定还是建议值
- **章节:** 4.5, 5.4, 6.1, 0
- **问题:** 关键数值多带「如」,部分流入 SaveData/constants/测试。但 10.1 常量集中 + 唯一真相源 + 决策记录已结构性防住跨里程碑前后不一致,残留仅是「带如=钦定必采还是可自选」的语义留白。
- **修复:** 加一条全局约定:「所有带『如』的数值为本 SPEC 钦定默认值,实现时必须采用并集中到 constants.ts,要改走决策记录」;把 M0-M1 核心默认值汇成一张「核心常量表」。

#### [low] 缺跨章节「按系统索引」导航,代理被要求先读相关章节却要多处拼凑,且 5.8 含占位交叉引用
- **章节:** 3, 5, 6, 8, 4.2, 10.1
- **问题:** 单系统规格散落多章,无反向索引;5.8「数据见 6.x」是占位无效引用(应为 6.7)。文档约 660 行结构清晰、可全文检索,缺索引属可用性增强。
- **修复:** 修掉 5.8「数据见 6.x」→6.7 等具体引用;增附录「系统索引表」(每行一个系统:功能节|数据接口|消费/发布事件|读写 GameState 字段|所属里程碑)。

#### [low] 「完成 M0 后暂停报告」与逐里程碑自主推进之间未定义后续节奏
- **章节:** 15, 8, 10.2
- **问题:** 15 章只为 M0 设暂停点,未说 M1-M8 是否逐个暂停等确认还是连续自主推进;8 章「再进入下一个」语气像可连做,两处给了不一致暗示。仅协作流程清晰度,里程碑边界天然提供纠偏点。
- **修复:** 在 15/8 章明确人在回路协议:每个里程碑 DoD 达成后均暂停报告等确认,或 M0 后确认工作模式后连续推进、仅遇决策级问题暂停。

#### [low] EventBus 与 ServiceLocator 通信模型自相矛盾(ai-readiness 视角,与架构主题同根因)
- **章节:** 3, 3 结构原则, 4.2, 10.1
- **问题:** 与「通信架构」主题首条同根因,但 SPEC 已对最关键的「读共享态」给出自洽答案(GameState 唯一真相源),残留仅 ServiceLocator 用途一句注释未澄清(单例生命周期管理 vs 业务互调)。
- **修复:** 明确 ServiceLocator 仅用于启动期注册/解析单例(EventBus/GameState/SaveSystem/各 System 生命周期),非业务调用;把「不直接 import」精确为「不直接调用业务方法」并给反例。

#### [low] Linux WebKitGTK/WebView2 性能与一致性风险被 13 章一笔带过,切 Electron 的存档/打包迁移成本被淡化
- **章节:** 2.2, 2.3, 7.2, 9.3, 13
- **问题:** 13 章处置只是「优先 Windows、严重则切 Electron」;对 16×16 轻量 2D 游戏 60FPS 难度其实不高(标题「足以推翻 Tauri」夸大),核心最坏场景(Linux 60FPS 成硬验收)已被 SPEC 规避(硬验收只要求 Windows)。真实价值是切 Electron 时 plugin-fs/src-tauri/打包脚本全变的迁移成本被淡化。
- **修复:** 明确首版只承诺 Windows 60FPS、mac/Linux best-effort;M0 在目标平台跑 WebGL/FPS 冒烟并把渲染后端写进 gameConfig;通过存档抽象+桌面壳适配接口把 Tauri 特有 API 收口到一处。

#### [low] Node 20 + Rust/WebView2 工具链对 AI 自主从零构建是环境负担,缺缺 Rust 时降级路径
- **章节:** 2.3, 8 (M0), 11, 15
- **问题:** 缺 Rust 时 tauri dev 直接失败,而 M0 DoD/15 章第 2 步即要 Tauri 窗口;SPEC 无「先用纯前端跑通 M0-M3、Tauri 延后」的降级路径,也未提示首次 Rust 编译耗时/crates.io 拉取。属流程/排序建议,SPEC 已多处为延后 Tauri 提供概念依据。
- **修复:** 把 Tauri 窗口从 M0 必做降为 M0.5/确认 Rust 可用后进行;2.3 增环境自检(检测 cargo/rustc,缺则跳过 Tauri 并在 README 记录待补);注明首次编译耗时与网络要求。

## 六、被驳回的发现(误报,记录备查)

#### (tech-stack) Vitest/Vite 与 TypeScript strict + Phaser 类型的集成细节缺失:vitest.config.ts、tsconfig 的 strict 与 Phaser d.ts、ESM/CJS 边界未约定
该 finding 的多数核心论点要么已被 SPEC 覆盖，要么与 SPEC 自身架构相矛盾，残余的真实部分也属于零成本标准套路，不构成对"交给 AI 构建"的 SPEC 的真实缺陷。逐条核查：

1) "禁止 any 过于绝对、未留出口"——自相矛盾。10.2 第 566 行已明确写"不使用 any（确需时 unknown + 收窄并注释原因）"，出口已存在；且 SPEC 从未禁止 `as` 类型断言，面对第三方类型缺口的局部断言本就不在禁令内。finding 自己也承认"虽 10.2 提了 unknown"，其"对 Phaser 类型缺口不够"的加码缺乏依据：Phaser 3 官方 d.ts 体量大但覆盖完整，strict 下真正需要 @ts-expect-error 的零星冲突极少，现有指引已足够。

2) "Phaser 在 Vitest(node) 下需 deps.inline/server.deps"——被 SPEC 架构直接否定。4.1/4.3 节、10.2(第 567 行)、10.3(第 572 行)、4.0 经验法则(第 221 行)反复规定"纯逻辑与渲染分离、纯逻辑可被 Vitest 在无渲染环境下测"，而 tests/ 列出的用例(cropSystem/inventorySystem/timeSystem/saveSystem)及 grid.ts 均为不 import Phaser 的纯逻辑层。既然测试路径根本不引入 Phaser，"Phaser 以 ESM 被 Vitest 处理需 inline"的前提基本不成立。

3) "vitest.config.ts 与 vite.config.ts 关系未约定"——唯一确为真实的小空白，但属近零成本的标准套路：Vitest 默认复用 vite.config，独立配置用 `defineConfig`(from vitest/config) 或 `mergeConfig` 是社区通行单一模式，AI 必然配通。且 2.1 节选 Vitest 的理由正是"与 Vite 同源，零额外配置，快"，已隐含此关系，无需展开。

4) moduleResolution/module/types/jsdom 等建议均为 AI 会自然采用的标准默认值，其缺失不是缺陷——SPEC 刻意不逐字段规定 tsconfig，信赖 Vite+TS 通行约定。

综上，评审者自评"体验性摩擦而非阻断、AI 大概率能自行配通"已说明影响极低；核心技术前提(Phaser-in-Vitest、any 禁令过严)或被覆盖或被架构否定，残余真实点过于琐碎，按"已覆盖/无实质影响默认倾向 reject"的原则判 reject。

#### (data-model) SaveData 缺当天/次日天气与雨天补浇状态，4.5『随机天气』结算与 5.2『雨天自动浇灌』无法可靠复现
该 finding 的标题与核心主张（SaveData 缺 `tomorrowWeather` 导致天气结算/雨天补浇不可复现）站不住脚，作为 data-model 缺陷应 reject。

1. 「次日天气预报」并非 SPEC 需求。SPEC 全文无任何「电视预报/forecast」功能（grep 确认无 tomorrowWeather/预报/forecast）。评审者把星露谷的 TV 预报当成 SPEC 要求强加进来。其引用的 1.2.2「有意义的选择」原文（第 44 行）明确是指「今天的时间/体力有限，怎么分配」，与天气预报无关。「玩家得不到预报来做有意义的选择」是凭空捏造的需求。

2. 可复现性主张已被 SPEC 覆盖，不需要 `tomorrowWeather` 字段。第 188 行 `utils/random.ts`「可设种子的随机」正是为让过夜随机天气这类逻辑可被 Vitest 确定性单测而存在。写确定性单测只需固定随机种子，与是否持久化次日天气无关。finding 自己的 recommendation 也引用了这个 random util，反而削弱了自身前提。

3. 是否「前一天即确定次日天气并持久化」纯属设计取舍，不是正确性缺陷。AI 无论哪种实现都不违反任何 SPEC 明文要求。对一份交给 AI 的 SPEC，省略此字段无实质影响。

唯一真实的内核是另一个、且非本 finding 标题所指的问题：4.5（第 246 行）列出「作物生长一天…随机天气」未固定结算顺序，与 5.2「雨天自动浇灌」+ 5.3「浇过水才推进生长」+ watered 重置三者的交互次序确有小歧义。但该顺序大体可推断，且被验收 12.3 / M3「雨天免浇水」所约束、可测，至多是 nit 级澄清，与本 finding 框定的「data-model 缺字段」并非同一问题。综合判定：作为所述 data-model 缺陷 reject；残留的顺序歧义仅 nit 级。
