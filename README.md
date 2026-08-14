# novel-workbench（小说推演台 v10）

> DeepSeek Harness（DSH）社区贡献：小说创作工作台技能 + 动态 Cordis 插件完整源码。

一个不直接写正文的小说创作工作台，核心是四件事：**构建设定 → 跑团式推演 → 双向推理补设定 → 形成大纲**。

- 浏览器内**三栏工作台**（「推演台」标签页）：设定管理 / 推演（场景、行动裁决、候选分支、伏笔、推理）/ 局势图（当前状态、冲突网、势力归属、分卷大纲）
- Host 侧 **19 个工具**（`novel_*`）：设定卡、场景引擎、行动检定、推理引擎、反向补设定、伏笔、局势图、审计、大纲生成与导出
- **跑团式剧情演变，但不过于随机**：裁决不是骰子——机械层强制校验参与者存活、依据 id 存在、world_delta 与局势一致、境界对比提示；不确定性以候选分支呈现，由人定夺
- **推理不只是剧情**：`novel_infer` 正向推理语料 + 机械扫描 5 类缺口 → `novel_candidate_decide` 反向建立新设定（剧情推进到一定程度自动补全世界观与人物）
- 数据全部持久化为**结构化 JSON**（设定卡 / 因果事件 / 伏笔 / 场景 / 设定候选 / 推理记录），不是文学性正文

## 目录结构

```
novel-workbench/
├── README.md            # 本文件
├── SKILL.md             # 技能说明（在 DSH 会话中加载 novel-workbench 技能的内容）
└── plugin-source.json   # novel-assistant v10.2 动态插件完整源码（pkg-5）
                          #   host   —— 19 个工具 + 15 个面板 RPC
                          #   client —— 三栏工作台 UI（注册到 conversation.view 槽位，标签「推演台」）
```

## 安装（在任意 DSH 会话中一键重建）

novel-assistant 是**动态 Cordis 插件**：不修改任何组成文件，只在当前 DSH 进程内生效；进程重启后需重新定义（数据不受影响，仍在 `state.json`）。

**快速部署流程（省时版）**：

```text
1. cordis_inspect_self（无参）：已有 novl-1 在运行则直接用，不要重建；
2. 未运行：用 PowerShell 从 plugin-source.json 提取 host/client 到临时文件 + node 语法检查
   （不要读源码全文，81KB 只提取不浏览）；
3. cordis_define(kind: "new", idPrefix: "novl")：code.host/client 取提取内容，一次内联提交；
4. cordis_run：返回 awaiting-approval 立即结束回合等批准；starting 则等最终结果；
5. novel_state 验证数据恢复：为空说明存储根解析错——写 <workspaceRoot>/novel-assistant/.root
   指针（内容 D:\ds）后 cordis_run 重启同一包（本机存储根固定 D:\ds，项目 D:\ds\novel-assistant\）。
```

**迭代纪律**：修改插件时在本地文件编辑 + node 语法检查，全部改完后再 `cordis_define(kind:"existing")` + `cordis_run(mode:"update")` 一次发布；小修复攒批，避免每次全量重发 ~73KB 源码。

存储根解析顺序：会话工作区（cwd）→ fs 默认基路径探测 → `<基路径>/novel-assistant/.root` 指针文件 → 沙箱回退根。可用 `novel_store` 查看/设置。

## 19 个工具

| 工具 | 作用 |
|---|---|
| `novel_init` | 创建/重置项目（只接收标题 + 一句话核心构思） |
| `novel_state` | 读取项目状态（overview/settings/plot/seeds/outline/full，可按 type/query 过滤） |
| `novel_store` | 查看/设置存储根目录（report=诊断；set root=绝对路径 写 .root 指针） |
| `novel_setting_upsert` | 新建/更新设定卡（8 类：world/character/faction/power/location/item/timeline/other） |
| `novel_setting_remove` | 删除设定卡（提示残留引用） |
| `novel_seed_upsert` | 伏笔：埋设/更新（planted→growing→payoff→abandoned；明/暗线；短/中/长/超长回收；intent 意图） |
| `novel_seed_remove` | 删除伏笔 |
| `novel_layout` | 局势图：设定字段状态表 + 事件 world_delta 回放 + 冲突网 + 势力归属 + 回放失配警告 |
| `novel_scene_start` | 开场景（跑团一幕）：局势、戏剧性问题、参与者、地点、约束铁律、线索钩子、赌注 |
| `novel_scene_act` | 行动裁决（跑团核心）：GM 提出行动/目标/裁决/置信度/结果/依据/world_delta，机械校验后记录检定卡并提交事件 |
| `novel_scene_end` | 收束场景：记录收束结果与未了结线索 |
| `novel_infer` | 推理引擎：推理语料 + 机械扫描 5 类缺口自动生成设定候选 |
| `novel_setting_propose` | 反向补设定：剧情隐含但未登记的设定 → 候选卡 |
| `novel_candidate_decide` | 决定设定候选：采纳=自动建卡/补全人物/新增字段；忽略 |
| `novel_session` | 推演会话总览：活动场景、检定记录、待决候选、推理记录、日志 |
| `novel_plot_commit` | 提交剧情事件节点（含 world_delta 一致性校验） |
| `novel_plot_amend` | 采纳/否决/修正事件（采纳候选自动否决同分支兄弟） |
| `novel_outline_build` | 已采纳事件编译为卷/章大纲（arcs_json） |
| `novel_outline_export` | 导出 设定集.md + 大纲.md（含伏笔清单、场景记录、待决候选） |
| `novel_audit` | 一致性审计：孤儿引用、未用设定、缺原因事件、待决候选、空章节、伏笔健康度、回放失配、未收束场景、待决设定候选 |

## 跑团式推演协议（不过于随机）

1. `novel_layout` 确认当前局势 → `novel_scene_start` 开场景；
2. `novel_scene_act` 裁决行动：GM 给出 行动→目标→裁决→置信度→结果→依据→状态变化；
3. 机械校验：参与者存活、依据引用已存在 id（设定/事件/伏笔）、world_delta 旧值与局势一致、境界对比提示——不通过即拒绝；
4. 不确定性用 `branch=true` 提交候选分支，用户在推演台采纳/否决（采纳自动否决兄弟分支）；
5. `novel_scene_end` 收束，未了结线索转伏笔或下个场景。

## 推理与反向补设定

- 正向：`novel_infer {query, domain}` 返回语料，GM 给出 前提→推论→置信度→依据id 推理链；
- 反向（机械扫描 5 类缺口→候选卡）：事件引用未登记名称 / 人物卡缺状态能力字段 / 势力无成员 / world_delta 改不存在的字段 / 伏笔无关联设定；
- 落实：`novel_candidate_decide {id, accept}` 或手动 `novel_setting_upsert`。
- 约定：卡上字段=基线值，world_delta=变更史，局势图=回放结果；补字段填基线值避免回放失配。

## 标准工作流

`novel_init` → `novel_setting_upsert`（世界观与核心人物）→ `novel_scene_start/act/end` 跑团推演 → 定期 `novel_infer`/`novel_setting_propose` 反向补设定 → `novel_seed_upsert` 埋设伏笔 → `novel_outline_build` + `novel_outline_export`；过程中定期 `novel_audit`。

## 数据模型

`state.json`：`meta / settings / plot.events / seeds / outline.arcs / scenes / session / candidates / inferences / log`，全部为 id 指针引用（事件↔事件、事件↔设定、伏笔↔事件、候选↔事件证据）。`world_delta` 每项格式 `目标id:字段:旧值→新值`。

**读取与迁移协议**（详见 SKILL.md 2.1/2.2）：
- 日常读写一律走 `novel_*` 工具（保证 id 分配、world_delta 校验与审计一致性）；**禁止直接编辑 state.json**——插件运行中内存态是权威，直接改文件会被内存覆盖且绕过校验；
- 直接读文件的三种合法场景：故障诊断（数据为空时确认文件状态）、迁移/备份（拷贝文件）、外部程序分析；
- 备份 = 拷贝 `state.json`；恢复 = 放回存储根 → 写 `.root` 指针（如需）→ `novel_state` 验证 → `novel_audit` 体检；
- 三语义铁律：卡字段=基线值、world_delta=变更史、局势图=回放结果；
- 不要双实例同时写同一份 state.json（动态插件为会话级实例，会互相覆盖）。

## 故障排查

- 推演台只显示红框/标题、无内容：检查 client 源码中 `h()` 是否用 `React.createElement.apply(null, args)` 透传全部子元素。
- `host.call` 失败：先 `cordis_inspect_self` 看运行状态；必要时重新 `cordis_run` 同一包。
- 页面刷新后「推演台」视图丢失：属预期（运行事件错过），重新 `cordis_run` 一次即可恢复，勿刷新页面。
- 数据没恢复：`novel_store` 看诊断；必要时 `novel_store set root=绝对路径`。
- 检定被拒：world_delta 失配以局势图当前值为准；依据 id 必须是设定/事件/伏笔 id；死者不可行动（除非 force 并说明依据）。

## 社区

面向 DeepSeek Harness 社区开源。欢迎 fork、提 issue、贡献改进（例如：检定难度曲线、信息不对称/知识状态追踪、GM 子代理预设）。

## 示例

示例项目数据不随仓库分发；《燃石记》演示项目（含跑团场景 sc46/sc52、检定 e47/e49/e51/e53、18 条反向推导候选）可自行按上述工作流在本地重建。
