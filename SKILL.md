---
name: novel-workbench
description: 小说创作工作台（推演台）——跑团式剧情推演（场景/行动裁决/候选分支）、双向推理与反向补设定、伏笔/势力布局、大纲生成。含快速部署流程（免读源码全文）、完整插件源码与一键重建步骤、数据读写协议与 GM 协作协议。当用户提到"推演台、小说工作台、设定、剧情推演、跑团、伏笔、大纲、燃石记"或 novel_ 工具时使用。
whenToUse: 用户要求打开推演台/小说工作台、使用 novel_* 工具、进行跑团式剧情推演或推理补设定、或继续《燃石记》等小说项目时。
---

# 小说创作工作台（novel-workbench v11.1）

## 这是什么

DeepSeek Harness（DSH）**静态插件**（host 侧 24 个工具 + 浏览器"推演台"视图，super-injector 通道）。
核心理念：**不直接生成小说正文**，只做四件事——**构建设定 → 跑团式推演 → 双向推理补设定 → 形成大纲**。
支持**多项目**：每部小说一个独立项目（`<存储根>/novel-assistant/projects/<id>/state.json`），项目索引在 `projects.json`，可新建/切换/导入。

技能目录内容：`SKILL.md`（本文件）、`plugin-source.json`（v11.1 完整 Host+Client 源码，**构建事实源**）。插件以静态包形式运行：`@dsh-external/dsh-novel-workbench`（包目录 `D:\ds\novel-workbench\plugin\`，由 super-injector 注入）。

界面能力（v10.4/v10.5）：推演台右下角「助手输出」悬浮窗——实时展示当前会话流式输出（text/reasoning 块）、运行状态（生成中/调用工具/待命）与光标；**可自由拖动**（标题栏按住拖动，位置记忆并限制在视口内）；**保留最近一轮完整输出**（新一轮生成开始后自动清空重来）；可折叠。

多项目能力（v11）：推演台头部**项目切换器**（下拉切换 + 「＋新建」表单 + 「导入」表单，支持粘贴 JSON 或填文件路径）；host 侧 `novel_project_list` / `novel_project_new` / `novel_project_switch` / `novel_project_import` 四个工具；`novel_state view=projects` 列出项目；`novel_init` 语义改为"重置当前激活项目"（无激活项目时自动新建）。

---

## 一、快速部署（super-injector 通道，v12 静态插件）

### 1.0 通道说明（先读）

- 插件已从"动态 Cordis 插件（cordis_define 内联）"迁移到 **dsh-super-injector 静态插件通道**：`@dsh-external/dsh-novel-workbench`，包目录 `D:\ds\novel-workbench\plugin\`（`package.json` + `scripts/build.js` + `src/` + `lib/`）。
- **构建**：`node scripts/build.js`——从 `../../plugin-source.json` 机械变换生成 `lib/index.js`（ESM host：harness 桥 → `ctx.tools.register` + `ctx.webServer.register` RPC 路由）与 `lib/client.js`（ModuleLoader 包裹：React + fetch RPC）。**无 DSH checkout 依赖**（本机 WSL bash 下 `dev_build_plugin` 的 build.sh 走产物校验兜底）。
- **注入**：`dev_inject_plugin {"dir": "D:/ds/novel-workbench/plugin"}`（junction + loader.create，host+UI 一体生效，registry 持久化，重启后 autoRestore 恢复）。
- **热重载**：`dev_reload_package {"packageName": "dsh-novel-workbench"}`——改 `plugin-source.json` → 构建 → 重载，秒级闭环，无需全量内联。
- **卸载**：`dev_uninject_plugin {"match": "dsh-novel-workbench"}`。彻底移除可删注册表 `~/.dsh/super-injector/registry.json` 条目。
- 旧动态插件 `novl-1` 已停用但定义保留（回退路径：`cordis_define(kind:"existing")` 重建，见 git 历史）。
- 存储根解析、多项目布局、23 工具语义**全部不变**（数据层与通道无关）。

### 1.1 检查是否已就绪

`dev_plugin_status` 或 `dev_injected_list`：存在 `@dsh-external/dsh-novel-workbench` 且 `[active]` → 推演台已就绪，**不要重复注入**。

### 1.2 部署 / 重建

1. **构建产物**（若 lib/ 缺失或 plugin-source.json 有改动）：
   ```powershell
   node D:\ds\novel-workbench\plugin\scripts\build.js
   ```
   （或在注入器环境跑 `dev_build_plugin {"dir": "D:/ds/novel-workbench/plugin"}`，额外产出 tgz。）
2. **注入**：`dev_inject_plugin {"dir": "D:/ds/novel-workbench/plugin"}`。
   - 报 `tool "novel_xxx" is already registered` → 说明动态版 novl-1 还在跑：`cordis_stop` 停掉后再注入（两者同名工具冲突）。
3. **验证**：`novel_state view=overview` 应显示项目数据（如《燃石记》）。若 meta 为空 → 走 1.3 存储根修复，然后 `dev_reload_package`。

### 1.3 存储根（先理解解析规则，再处理本机）

- **解析顺序**（插件自动）：会话工作区(cwd) → fs 默认基路径探测 → `<基路径>/novel-assistant/.root` 指针文件 → 沙箱回退根。可用 `novel_store report` 查看每一步的实际值。
- **已知陷阱**：当会话工作区恰好是 `<存储根>/novel-assistant` 时，插件会把工作区误当存储根（去找 `...\novel-assistant\novel-assistant\state.json`），表现为"项目为空"。**任何机器上遇到空项目，优先怀疑这里。**
- **修复**：写入指针文件 `<workspaceRoot>/novel-assistant/.root`，内容为存储根绝对路径（不含换行）；然后 `dev_reload_package` 重启使其生效。
- 显式指定：`novel_store set root=<绝对路径>` 可覆盖解析结果（写指针需相应沙箱权限）。
- 验证：`novel_store report` 的 `currentRoot` 应为预期存储根；`novel_state` 应恢复全部数据。
- 本机示例：存储根 `D:\ds`，项目目录 `D:\ds\novel-assistant\`。

### 1.4 迭代纪律（修改插件时）

1. **编辑事实源**：`D:\ds\novel-workbench\plugin-source.json`（host/client 字段）→ 构建 → `dev_reload_package`（秒级生效）；**不要**直接改 `lib/` 产物（构建会覆盖）。
2. 小修复攒批，发布后立即验证受影响路径（工具调用 / 面板 RPC `curl -X POST http://127.0.0.1:3080/@dsh-external/dsh-novel-workbench/api/ping -d '{}'`）。
3. 同步更新技能目录与仓库的 `plugin-source.json` 与 `plugin/`，使其等于当前运行最新版。

---

## 二、推演台如何工作（写给 agent 的工作模型）

### 2.1 数据存放方式（存储与文件）

**文件布局**（全部在存储根下，v11 多项目定稿）：

```
<存储根>/novel-assistant/
├── .root                # 存储根指针（内容为存储根绝对路径，1.3 修复时写入）
├── projects.json        # 项目索引：{ active, projects: [{id,title,premise,genre,tone,targetLength,createdAt,updatedAt}] }
└── projects/
    └── <project-id>/    # 每部小说一个独立项目（project-id = title 的 ASCII slug，冲突加 -n；纯中文标题回退 project-1/2…）
        ├── state.json   # 该项目唯一事实源：全部结构化数据（见下）
        ├── settings.md  # 导出快照（novel_outline_export 生成，人工可读，非数据源）
        └── outline.md   # 导出快照（同上，含伏笔/场景/待决项）
```

**旧布局自动迁移**：若只有旧的 `<存储根>/novel-assistant/state.json` 而没有 `projects.json`，首次启动时自动迁移为 `projects/<id>/state.json` 并生成索引，原文件改名 `state.json.migrated-v11` 备份（勿删，确认无误后可自行移除）。

**state.json 结构**：

```
meta（标题/核心构思/题材/基调/篇幅）
settings[]      # 设定卡：s*，8 类（world/character/faction/power/location/item/timeline/other）
                #   每卡：id/type/name/summary/fields["键：值",...]/relations["目标id 关系",...]/tags
plot.events[]   # 事件：e*，committed/candidate/rejected；causes/participants/location/conflict_between/
                #   stakes/world_delta/constraints/check（检定附加）
seeds[]         # 伏笔：f*，planted/growing/payoff/abandoned；horizon/visibility/intent/planted_at/payoff_at/
                #   related_settings/related_events
outline.arcs[]  # 卷 a*/章 ch*：goal/conflict/resolution/hook/eventIds
scenes[]        # 场景卡：sc*，open/closed；situation/dramatic_question/participants/constraints/hooks/
                #   stakes/checks[]（检定卡 ck*）/outcomeEvents/threads/resolution
session         # 当前推演态：activeSceneId/mode/lastCheckId/startedAt
candidates[]    # 设定候选：p*，pending/accepted/rejected；kind/targetName/reason/evidence/proposed
inferences[]    # 推理记录：in*
log[]           # 操作日志（最近 200 条）
```

**三条语义铁律**（推演一致性全靠它）：
1. **卡上字段 = 基线值**（故事起点的状态）；
2. **world_delta = 变更史**，格式 `目标id:字段:旧值→新值`，旧值必须与当时局势一致；
3. **局势图 = 回放结果**（`novel_layout` 用基线 + 全部 committed 事件 delta 顺序回放得出"当前状态"）。
推论：补字段/改卡时填**基线值**（如"持有者：无"），回放后自动得到当前值（"持有者：沈焰"）；填当前值会造成回放失配，被审计抓出。

### 2.2 如何读取（读取协议，写给 agent）

**日常推演一律走工具，禁止直接读文件**。按场景选工具：

| 时机/目的 | 工具 | 说明 |
|---|---|---|
| 推演/裁决前 | `novel_layout` | 当前局势：谁活着、状态、冲突网、势力归属、回放失配警告——**每次裁决前必读** |
| 概览与汇报 | `novel_state view=overview` | 项目统计、主线链、待决分支、存储根 |
| 查设定 | `novel_state view=settings` | 可按 type/query 过滤 |
| 查事件链 | `novel_state view=plot` | 全部事件（含候选/否决） |
| 查伏笔 | `novel_state view=seeds` | 伏笔清单 |
| 查大纲 | `novel_state view=outline` | 卷/章大纲 |
| 会话全局 | `novel_session` | 活动场景、检定记录、待决候选、推理记录、操作日志 |
| 查项目列表 | `novel_state view=projects` 或 `novel_project_list` | 全部项目（id/标题/题材/是否当前激活）；切换用 `novel_project_switch` |
| 一致性体检 | `novel_audit` | 孤儿引用/缺原因/回放失配/未收束场景/待决项 |

**何时可以/必须直接读文件**（仅三种情况）：
1. **故障诊断**：`novel_state` 数据为空或异常时，用文件工具读 `<存储根>/novel-assistant/state.json` 确认文件是否存在、是否为合法 JSON、meta 是否完整；
2. **迁移/备份**：拷贝文件到另一台机器/目录（见下"迁移协议"）；
3. **外部程序分析**：如用 PowerShell/脚本统计、与其他工具对接。

**读取时的三条注意**：
- **插件运行中，内存态是权威**：直接编辑文件不会更新运行中插件的内存，且后续 `persist` 会用内存覆盖文件——**禁止直接编辑 state.json 作为写入手段**；
- 修正数据必须走工具：设定用 `novel_setting_upsert`、事件用 `novel_plot_amend`、候选用 `novel_candidate_decide`——工具保证 id 分配、world_delta 校验与审计一致性；
- 导出 md（settings.md/outline.md）**只读不写**：它们是快照，不是数据源，改它们不会影响 state.json。

**迁移协议（换机器/换目录/备份）**：
1. 备份 = 拷贝 `projects.json` + 整个 `projects/` 目录（可选带各项目 settings.md/outline.md 作人工快照）；
2. 恢复 = 把 `projects.json` 与 `projects/` 放回目标机器的 `<存储根>/novel-assistant/`，按 1.3 处理存储根解析（必要时写 `.root` 指针）；
3. 恢复后验证：`novel_state view=overview` 数据齐全 → `novel_audit` 体检（迁移不应产生新告警）；旧布局单文件备份可用 `novel_project_import` 导入为独立项目；
4. **不要在两个会话/两台机器上同时运行插件写同一份 state.json**——双实例会互相覆盖（最后写入者赢），这是动态插件模型的固有边界；只读方用文件读取或导出快照即可。

### 2.3 工具地图（25 个，按职责分组）

| 职责 | 工具 | 说明 |
|---|---|---|
| 项目管理 | `novel_init` `novel_state` `novel_store` | 重置当前项目（无激活时自动新建）；查状态；查/设存储根 |
| 多项目 | `novel_project_list` `novel_project_new` `novel_project_switch` `novel_project_import` | 列项目；新建独立项目并切换（绝不覆盖）；切换（先保存当前再载入目标）；导入（粘贴 JSON 或文件路径，校验 meta 后落盘） |
| 设定卡 | `novel_setting_upsert` `novel_setting_remove` | 8 类卡；删卡提示残留引用 |
| 伏笔 | `novel_seed_upsert` `novel_seed_remove` | planted→growing→payoff→abandoned；明/暗线；回收距离；intent |
| 局势 | `novel_layout` | 回放后的当前状态表+冲突网+势力归属+失配警告 |
| 场景引擎 | `novel_scene_start` `novel_scene_act` `novel_scene_end` | 开场景→行动裁决→收束（见 3.1）；`novel_scene_act` 支持 `delegate=true` 由隔离子代理生成裁决建议（见 2.7） |
| 推理 | `novel_infer` | 语料+缺口扫描，返回推理工作台 |
| **设定推演** | `novel_setting_derive` | **子代理隔离执行**：从既有设定/事件/伏笔出发推演隐含设定、机制边界、代价后果、隐藏冲突；结论按依据校验落库（inferences），缺口自动转设定候选（见 2.6） |
| **推演导航** | `novel_suggest_next` | **子代理隔离执行**：基于局势/待决分支/堆积候选/开放伏笔/大纲，建议下一步该推演什么（开场景/解决分支/处理候选/优先伏笔/建议行动）（见 2.7） |
| 反向补设定 | `novel_setting_propose` `novel_candidate_decide` | 缺口→候选卡→采纳建卡/忽略 |
| 会话 | `novel_session` | 活动场景/检定记录/待决项/日志总览 |
| 事件链 | `novel_plot_commit` `novel_plot_amend` | 提交事件（含 delta 校验）；采纳/否决/修正（采纳自动否决兄弟分支） |
| 大纲 | `novel_outline_build` `novel_outline_export` | 事件编译为卷/章；导出 md（含场景记录/待决项） |
| 审计 | `novel_audit` | 孤儿引用/缺原因/伏笔健康/回放失配/未收束场景/待决候选 |

### 2.4 UI 与 RPC 的对应

推演台面板与工具走同一套数据（8 秒自动同步，可手动刷新）。面板能独立完成：设定增删改、开场景/行动裁决/收束、分支采纳/否决、伏笔增删改、推理扫描、设定候选采纳/忽略。**面板操作与工具调用等价**；agent 在对话中推演、用户在面板决策，结果互通。

### 2.5 双向推理闭环（本工作台的核心价值）

```
剧情推演（场景/检定/事件）→ novel_infer / novel_setting_propose 扫描缺口
→ 设定候选（事件引用未登记名称/人物缺字段/势力无成员/world_delta 隐形字段/伏笔无关联）
→ novel_candidate_decide 采纳建卡 / 忽略 → novel_audit 校验一致性 → 回到推演
```

设定永远不完整是常态；**推理到一定程度就反向建立新设定**，这正是"反向补全"的意义。

### 2.6 设定推演（novel_setting_derive，子代理隔离执行）

- **用途**：不是推剧情，而是**推设定**——从既有设定出发推导 隐含设定 / 机制边界 / 代价后果 / 隐藏冲突 / 潜在缺口（如"焚天炉残魂与沈焰的契约还有哪些隐藏代价"）。
- **执行**：host 组装上下文快照（按 domain 过滤设定卡 + 已采纳事件链 + 伏笔）→ `ctx.subagents.start('spawn', ...)` 启动**全新子代理**（不继承主会话上下文，防污染）→ `toolFilter: { allow: [] }` 全禁工具（纯推理）→ `outputSchema` 强制 JSON 结构（claim/logic/certainty/evidence/gap）→ 同步等待结果。
- **落库**：结论写入 `inferences`（kind='setting-derive'，agent=true）；每条 `gap` 自动转设定候选（`novel_candidate_decide` 处理）；依据 id 机械校验（设定/事件/伏笔 id 或名称，无效引用单独列出）。
- **参数**：`topic` 必填；`domain` 限定范围（world/character/faction/power/location/item/timeline/all）；`focus` 关注点；`persist=false` 只推演不落库。
- **注意事项**：子代理需要数分钟级 LLM 推理（同步等待）；单次 snapshot 较大时按 domain 缩小范围；子代理会话出现在会话列表中（spawn 全新会话，不污染主上下文）。

### 2.7 子代理化的推演（v12.2）

- **行动裁决 delegate**：`novel_scene_act {delegate: true}` 时，verdict/certainty/outcome/reasons/world_delta **由隔离子代理生成**（拿到场景+当前状态表+最近事件链+伏笔，全禁工具纯推理，outputSchema 强制 JSON）——主会话只需给 actor/action/goal/approach/focus。**机械校验兜底不变**：子代理给出的裁决仍走存活/delta/reasons 校验，"不过于随机"的保证不因 delegate 而削弱；校验失败会返回错误，可修正重提或改手动裁决。
- **推演导航**：`novel_suggest_next {domain?, detail?}`——隔离子代理读取 局势/待决分支/堆积候选/开放伏笔/大纲，给出结构化建议：focus（方向）、open_scene（建议的新场景：标题/戏剧性问题/局势/钩子/赌注）、resolve_branch（建议解决的候选分支）、resolve_candidates（候选 accept/ignore + 理由）、priority_seeds（优先伏笔）、next_acts（建议行动 2-3 条）。建议落库 inferences（kind='suggest-next'）；**最终决定权始终在用户/GM**（采纳分支、开场景、候选处理都要经 novel_plot_amend / novel_scene_start / novel_candidate_decide 落地）。
- 使用节奏建议：推演遇瓶颈或待决项堆积 → `novel_suggest_next` 拿方向 → 开场景/裁决（可 delegate）→ 定期 `novel_setting_derive` 深挖设定面。

---

## 三、如何配合（GM 协作协议，写给 agent 的操作手册）

### 3.1 推演节奏

1. **推演前必读** `novel_layout`（谁活着、谁在哪、什么状态）——防止"角色已死还在说话"；
2. `novel_scene_start` 开场景：局势/戏剧性问题/参与者/约束铁律/线索钩子/赌注；同时开多个场景是禁止的（先收束）；
3. **每次行动一次 `novel_scene_act`**，必须带齐：`actor`/`action`/`goal`/`verdict`（大成功~大失败）/`certainty`（必然~低）/`outcome`/`reasons`/`world_delta`；
4. **裁决不是掷骰子**：裁决必须被设定依据支持。依据逐条引用真实 id（设定/事件/伏笔）；`world_delta` 旧值与局势一致；死者不可行动。**被工具拒绝 = 修正后重提，绝不 `force` 绕过**（force 仅限有明确特殊依据并写明）；
5. **不确定性用 `branch=true` 提交候选分支**（同一决策点的多个走向），把选择权交给用户——面板"采纳/否决"，采纳自动否决兄弟分支；
6. `novel_scene_end` 收束：写清戏剧性问题如何回答、局势如何变化；未了结线索建议转伏笔或下个场景。

### 3.2 推理时机与方式

- 每推演 1-2 个场景后调用 `novel_infer` / `novel_setting_propose` 扫描缺口；
- 推理输出用四段链：**前提 → 推论 → 置信度（必然/很可能/可能/低）→ 依据id**，并标注缺口与矛盾；
- 候选落实前向用户说明取舍理由，或提示用户在面板操作；采纳时按基线值语义补字段（见 2.1）。

### 3.3 与用户的交互

- **汇报格式**：结构化摘要（新事件/检定结果/状态变化/新增候选），不写文学性正文；
- **主动提醒待决项**：候选分支（e* candidate）与设定候选（p* pending）出现时明确告知，引导用户在面板决策；
- 用户决策后顺势继续：分支采纳→沿该走向开下一场景；候选采纳→继续审计确认一致。

### 3.4 与 DSH 生命周期的配合

- 静态插件**进程重启后由注入器 autoRestore 自动恢复**（`~/.dsh/super-injector/registry.json`）；若未恢复：构建 + `dev_inject_plugin` 重新注入，数据在 `state.json` 不受影响；
- 页面刷新后推演台 Tab 丢失：`dev_reload_package` 或重新注入（client bundle 由注入器模块表管理）；
- 深度推演可委托子代理：给子代理完整上下文（项目路径、当前局势快照、GM 纪律），拿回候选分支/推理结论后经工具落库；
- 面板与对话并用：agent 负责生成与校验，用户负责定夺走向，二者通过 state.json 同步。

### 3.5 错误修复协议

| 症状 | 原因 | 修法 |
|---|---|---|
| `novel_scene_act` 被拒 | 依据 id 不存在 / delta 旧值失配 / 死者行动 | 按错误列表逐条修正重提；旧值以 `novel_layout` 当前值为准 |
| 审计报 world_delta 回放失配 | 卡字段被填成了非基线值 | 把卡字段改回基线值（delta 的旧值），或 `novel_plot_amend` 修正事件 delta |
| `novel_state` 显示空项目 | 存储根解析错 | 1.3 指针修复 + 重启 |
| 面板 `host.call` 失败 | 插件状态异常 | `dev_plugin_status` 看 fiber；`dev_reload_package` 重启；RPC 路由自测 `curl -X POST http://127.0.0.1:3080/@dsh-external/dsh-novel-workbench/api/ping -d '{}'` |
| 面板报 lossless JSON 错误 | RPC 返回了 undefined | 修 host 映射（`|| ''`/`|| null`）后按 1.4 发布 |

---

## 四、数据备份与迁移（速查）

- 唯一事实源：`<存储根>/novel-assistant/state.json`；导出文件只是快照。
- 备份：拷贝 state.json；恢复：放回存储根 → 1.3 指针 → `novel_state` 验证 → `novel_audit` 体检。
- 详细协议见 2.1（存放方式）与 2.2（读取与迁移）。

## 五、故障排查（速查）

- 推演台只显示红框/标题、无内容：client 源码 `h()` 必须用 `React.createElement.apply(null, args)` 透传全部子元素。
- 页面刷新后视图丢失：注入器通道下先 `dev_reload_package`；必要时重新 `dev_inject_plugin`。
- 注入报 `tool "novel_xxx" is already registered`：旧动态插件 novl-1 仍运行，`cordis_stop` 后重试注入。
- 审批策略 never 时无法创建插件：需用户改回 ask 或已有授权 grant。
- 数据没恢复：`novel_store` 诊断 → 1.3 指针修复。
