# novel-workbench（小说推演台 v13 · 单独工作区版 / 静态装配通道）

> DeepSeek Harness（DSH）社区贡献：小说创作工作台技能 + 静态插件包（profile 静态装配）完整源码。

一个不直接写正文的小说创作工作台，核心是四件事：**构建设定 → 跑团式推演 → 双向推理补设定 → 形成大纲**。

- **单独工作区（workspace-scoped，v13）**：novel_* 工具与推演台 UI **仅限 `D:\ds` 小说工作区**的会话使用——host 按发起会话 cwd 门控执行、client 按会话 cwd 门控渲染（不命中隐身）、RPC 按 sessionId 二次校验；在其他工作区开会话时不受干扰（对照 `D:\A-DSH\S-dsh\docs\WORKSPACE-SCOPED-PLUGINS.md` 方案 A）
- **多项目支持**（v11）：每部小说一个独立项目，推演台头部项目切换器（下拉切换 + 新建/导入表单）；导入支持粘贴 state.json 或文件路径
- 浏览器内**三栏工作台**（「推演台」标签页）：设定管理 / 推演（场景、行动裁决、候选分支、伏笔、推理）/ 局势图（当前状态、冲突网、势力归属、分卷大纲）；左右栏可折叠（默认收起），中栏核心区占满
- **助手输出悬浮窗**（右下角，可拖动、可折叠）：实时展示当前会话的流式输出与运行状态，并**保留最近一轮完整输出**，随时回看
- Host 侧 **26 个工具**（`novel_*`，含门控自检 `novel_scope`）：多项目管理、设定卡、场景引擎（行动裁决支持子代理 delegate）、推理引擎、**设定推演（子代理隔离执行）**、**推演导航（子代理隔离执行）**、反向补设定、伏笔、局势图、审计、大纲生成与导出
- **跑团式剧情演变，但不过于随机**：裁决不是骰子——机械层强制校验参与者存活、依据 id 存在、world_delta 与局势一致、境界对比提示；不确定性以候选分支呈现，由人定夺
- **推理不只是剧情**：`novel_infer` 正向推理语料 + 机械扫描 5 类缺口 → `novel_candidate_decide` 反向建立新设定（剧情推进到一定程度自动补全世界观与人物）
- 数据全部持久化为**结构化 JSON**（设定卡 / 因果事件 / 伏笔 / 场景 / 设定候选 / 推理记录），不是文学性正文

## 目录结构

```
novel-workbench/
├── README.md            # 本文件
├── SKILL.md             # 技能说明（在 DSH 会话中加载 novel-workbench 技能的内容）
├── plugin-source.json   # novel-assistant v13 完整源码（构建事实源）
│                         #   host   —— 26 个 novel_* 工具（含 novel_scope）+ 面板 RPC
│                         #   client —— 三栏工作台 UI + 项目切换器 + 助手输出悬浮窗（conversation.view 槽位，标签「推演台」）
└── plugin/              # 静态插件包（profile 静态装配）
    ├── package.json     # @dsh-external/dsh-novel-workbench
    ├── scripts/build.js # 构建：从 ../plugin-source.json 变换生成 lib/（无 DSH checkout 依赖；顶部 WS_SCOPE_DEFAULT 为工作区作用域）
    ├── scripts/build.sh # 构建入口（产物校验兜底）
    ├── src/             # 生成镜像（host/client，供审阅）
    └── lib/             # 产物：lib/index.js（ESM host）+ lib/client.js（ModuleLoader UI）
```

## 数据存放规则（v11 定稿）

```
<存储根>/novel-assistant/
├── .root                # 存储根指针
├── projects.json        # 项目索引：{ active, projects: [{id,title,premise,genre,tone,targetLength,...}] }
└── projects/<id>/       # 每部小说一个项目目录（id = 标题 ASCII slug，冲突加 -n）
    ├── state.json       # 该项目唯一事实源
    ├── settings.md      # 导出快照（可再生成）
    └── outline.md       # 导出快照（可再生成）
```

旧布局（单一 `state.json`）首次启动自动迁移为项目并生成索引，原文件改名 `state.json.migrated-v11` 备份。

## 安装（profile 静态装配，v13）

novel-assistant 是**静态插件包**（`@dsh-external/dsh-novel-workbench`）。v13 起**不经 super-injector 注入**，走 profile 静态装配：`~/.dsh/profiles/web/cordis.patch.yml` 的 `- insert:` 行 + `node_modules` junction——DSH 启动时由 loader 直接装配 host，web 端按 `dsh.client` 声明自动把 client 半注入浏览器名册。工作区门控默认 `D:\ds`（host 可用环境变量 `NOVEL_WS_SCOPE` 覆盖）。

**部署**（在装有 DSH web profile 的环境中）：

```text
1. 确认装配行：~/.dsh/profiles/web/cordis.patch.yml 含：
     - insert:
         - id: dsh-novel-workbench
           name: '@dsh-external/dsh-novel-workbench'
2. 确认 junction：node_modules/@dsh-external/dsh-novel-workbench → D:\ds\novel-workbench\plugin
   （自测：require.resolve('@dsh-external/dsh-novel-workbench', { paths: ['C:/Users/17151/.dsh/profiles/web/node_modules'] })）
3. 构建：node plugin/scripts/build.js（plugin-source.json → lib/）
4. 重启 DSH → Tool.listTools 应有 26 个 novel_*；会话在 D:\ds 工作区时推演台可见
5. novel_state view=overview 验证数据恢复；为空见下节存储根解析
```

**⚠️ 教训（2026-08-17）**：对运行中宿主执行 `dev_reload_package` 热重载本插件曾导致 DSH 进程崩溃（重载从客户端模块表移除该包后进程挂掉，自愈/重启后恢复，数据无损）。**改插件请走「构建 → 重启 DSH」**；super-injector 注入/热重载保留为不推荐的旧路径，且注入器 registry 中已移除本插件条目（防双加载）。

**迭代纪律**：编辑 `plugin-source.json`（唯一事实源）→ `node plugin/scripts/build.js` → 重启 DSH；同步更新仓库与本技能目录内的 plugin-source.json。

存储根解析顺序（v12.3）：`.root` 指针候选（含约定区 `~/.dsh/novel-assistant/.root`，跨工作区稳定）→ 基路径项目目录探测 → 下一层子目录自动发现 → 沙箱回退根。`projects.json` 缺失/为空时自动扫描 `projects/` 目录重建索引；`novel_store {action:"set", default:"<id>"}` 设默认项目（重启后按 active → default → 首个 自动载入）。

## 工作区门控（v13）

- **作用域**：`D:\ds`（前缀匹配，含子目录）。host 工具按发起会话 cwd 门控 execute；client 推演台按会话 cwd 门控渲染（不命中隐身）；面板 RPC 按 sessionId 二次校验（403）。
- **自检**：`novel_scope`（任何工作区可调）输出 `cwd / inScope / hit / gatedDirs`。
- **扩展**：host 环境变量 `NOVEL_WS_SCOPE`（分号分隔多目录）或改 `plugin/scripts/build.js` 顶部 `WS_SCOPE_DEFAULT` 后重建。
- **验证矩阵**：`D:\ds`（或子目录）会话 → 推演台可见 + novel_* 放行；其他目录 → 无 UI + 工具拒绝（拒绝文本含作用域清单）。

## 预设：小说推演 GM（novel-gm）

仓库 `preset/novel-gm/` 提供配套的 **agent preset**：把任意 DSH 会话变成专注小说工作台的 GM（persona 内置推演纪律/数据协议/子代理使用规范，组合裁剪为基础文件/shell/skill/子代理委托/压缩，不携带编码与 workflow 工具链；novel_* 工具来自全局注册的插件，无需在预设中声明）。

**安装**（本地用户预设根）：

```bash
mkdir -p ~/.dsh/.agent-presets/novel-gm
cp preset/novel-gm/agent.cordis.yml preset/novel-gm/preset.yml ~/.dsh/.agent-presets/novel-gm/
```

然后新建会话时选择「小说推演 GM」预设（组合已通过 `standingKeyFor` 挂载验证；`dsh-agent-presets` 服务也提供 `copy()` 一键复制）。

## 26 个工具

| 工具 | 作用 |
|---|---|
| `novel_scope` | **工作区门控自检**：当前会话 cwd / 是否命中作用域 / 命中的工作区 / 作用域清单（任何工作区可调） |
| `novel_init` | 重置当前激活项目（无激活项目时自动新建；只接收标题 + 一句话核心构思） |
| `novel_state` | 读取项目状态（overview/projects/settings/plot/seeds/outline/full，可按 type/query 过滤） |
| `novel_store` | 查看/设置存储根（report=诊断；set root=绝对路径 写指针；set default=项目id 设默认项目，重启自动激活） |
| `novel_project_list` | 列出全部项目（id/标题/题材/更新时间/当前激活） |
| `novel_project_new` | 新建独立项目并切换（绝不覆盖现有项目） |
| `novel_project_switch` | 切换当前项目（先保存当前，再载入目标，数据完全隔离） |
| `novel_project_import` | 导入项目（粘贴 state.json 或本机文件路径，校验 meta 后落盘为独立项目） |
| `novel_setting_upsert` | 新建/更新设定卡（8 类：world/character/faction/power/location/item/timeline/other） |
| `novel_setting_remove` | 删除设定卡（提示残留引用） |
| `novel_seed_upsert` | 伏笔：埋设/更新（planted→growing→payoff→abandoned；明/暗线；短/中/长/超长回收；intent 意图） |
| `novel_seed_remove` | 删除伏笔 |
| `novel_layout` | 局势图：设定字段状态表 + 事件 world_delta 回放 + 冲突网 + 势力归属 + 回放失配警告 |
| `novel_scene_start` | 开场景（跑团一幕）：局势、戏剧性问题、参与者、地点、约束铁律、线索钩子、赌注 |
| `novel_scene_act` | 行动裁决（跑团核心）：GM 提出行动/目标/裁决/置信度/结果/依据/world_delta，机械校验后记录检定卡并提交事件；`delegate=true` 时裁决八要素由**隔离子代理**生成（机械校验照旧，仍"不过于随机"） |
| `novel_scene_end` | 收束场景：记录收束结果与未了结线索 |
| `novel_infer` | 推理引擎：推理语料 + 机械扫描 5 类缺口自动生成设定候选 |
| `novel_setting_derive` | **设定推演（子代理隔离执行）**：从既有设定/事件/伏笔推演隐含设定、机制边界、代价后果、隐藏冲突；结论按依据校验落库（inferences），缺口自动转设定候选——子代理全新会话，不污染主上下文 |
| `novel_suggest_next` | **推演导航（子代理隔离执行）**：基于局势/待决分支/堆积候选/开放伏笔/大纲建议下一步（开场景/解决分支/处理候选/优先伏笔/建议行动），落库 inferences |
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

每项目一份 `state.json`（`projects/<id>/state.json`）：`meta / settings / plot.events / seeds / outline.arcs / scenes / session / candidates / inferences / log`，全部为 id 指针引用（事件↔事件、事件↔设定、伏笔↔事件、候选↔事件证据）。`world_delta` 每项格式 `目标id:字段:旧值→新值`。项目索引在 `projects.json`。

**读取与迁移协议**（详见 SKILL.md 2.1/2.2）：
- 日常读写一律走 `novel_*` 工具（保证 id 分配、world_delta 校验与审计一致性）；**禁止直接编辑 state.json**——插件运行中内存态是权威，直接改文件会被内存覆盖且绕过校验；
- 直接读文件的三种合法场景：故障诊断（数据为空时确认文件状态）、迁移/备份（拷贝文件）、外部程序分析；
- 备份 = 拷贝 `projects.json` + 整个 `projects/` 目录；恢复 = 放回存储根 → 写 `.root` 指针（如需）→ `novel_state` 验证 → `novel_audit` 体检；旧布局单文件备份可用 `novel_project_import` 导入；
- 三语义铁律：卡字段=基线值、world_delta=变更史、局势图=回放结果；
- 不要双实例同时写同一项目的 state.json（静态插件为全局实例、多会话共享——同一时刻仍只允许一个会话写同一项目；不同项目可并行）。

## 故障排查

- 推演台只显示红框/标题、无内容：检查 client 源码中 `h()` 是否用 `React.createElement.apply(null, args)` 透传全部子元素。
- `host.call` 失败：403 = 会话不在 `D:\ds` 作用域（门控拒绝）；`Tool.listTools` 看 26 个 novel_* 是否注册；RPC 自测 `curl -X POST http://127.0.0.1:3080/@dsh-external/dsh-novel-workbench/api/ping -d '{}'`。
- 工具被拒（"拒绝：novel_* 工具仅限工作区…"）：会话 cwd 不在作用域 → `novel_scope` 定位，到 `D:\ds` 开会话或按需扩作用域（见「工作区门控」节）。
- 插件变更后行为未更新：静态装配只在启动时读产物 → 重新构建 + **重启 DSH**（不要对运行中宿主热重载，v13 教训）。
- 注入报 `tool "novel_xxx" is already registered`：旧动态版 novl-1 或注入器残留实例仍运行，`cordis_stop` / 清 registry 后重启。
- 页面刷新后「推演台」视图丢失：静态装配下刷新即恢复；仍未恢复先确认宿主是否加载新构建。
- 数据没恢复：`novel_store` 看诊断；必要时 `novel_store set root=绝对路径`。
- 检定被拒：world_delta 失配以局势图当前值为准；依据 id 必须是设定/事件/伏笔 id；死者不可行动（除非 force 并说明依据）。
- 宿主崩溃排查：`~/.dsh/super-injector/self-heal.log` 与 `reload-debug.log` 定位触发点；崩溃后自愈/重启即恢复（数据在 `novel-assistant/` 无损）。

## 社区

面向 DeepSeek Harness 社区开源。欢迎 fork、提 issue、贡献改进（例如：检定难度曲线、信息不对称/知识状态追踪、GM 子代理预设）。

## 示例

示例项目数据不随仓库分发；《燃石记》演示项目（含跑团场景 sc46/sc52、检定 e47/e49/e51/e53、18 条反向推导候选）可自行按上述工作流在本地重建。
