---
name: novel-workbench
description: 小说创作工作台（推演台）——设定管理、跑团式剧情推演（场景/行动裁决/候选分支）、双向推理与反向补设定、伏笔/势力布局、大纲生成，含完整插件源码与一键重建步骤。当用户提到"推演台、小说工作台、设定、剧情推演、跑团、伏笔、大纲、燃石记"或 novel_ 工具时使用。
whenToUse: 用户要求打开推演台/小说工作台、使用 novel_* 工具、进行跑团式剧情推演或推理补设定、或继续《燃石记》等小说项目时。
---

# 小说创作工作台（novel-workbench v10）

## 这是什么

一个 DeepSeek Harness（DSH）**动态 Cordis 插件**（host 侧 19 个工具 + 浏览器"推演台"视图）。
核心理念：**不直接生成小说正文**，只做四件事——**构建设定 → 跑团式推演 → 双向推理补设定 → 形成大纲**。
数据持久化在 `<存储根>/novel-assistant/state.json`；本机存储根为 `D:\ds`（由 `.root` 指针定位）。

## 一、打开推演台（核心操作）

1. 先检查插件是否已在运行：`cordis_inspect_self`（无参调用列出当前插件）。
2. 若 novel-assistant 插件不在列表或未运行：
   a. 读取本技能目录下的 **`plugin-source.json`**（pkg-3 的完整 Host + Client 源码，v10.1）；
   b. `cordis_define(kind: "new", idPrefix: "novl")`：`code.host` 填入该文件 `host` 字段、`code.client` 填入 `client` 字段；
   c. 用返回的 pluginId/packageId 执行 `cordis_run`（可能需要用户在界面上批准）；
   d. 运行成功后：对话页顶部出现**「推演台」标签页**（与"对话/轨迹"并列）。
3. 若已在运行：直接告诉用户推演台已就绪，无需重复定义。

注意：
- 数据自动从 `state.json` 恢复，**无需任何导入操作**。
- 若页面在插件运行之后才加载（如刷新过），推演台视图可能未注册：不要刷新页面，重新 `cordis_run` 一次即可恢复。
- 审批策略为 never 时插件无法创建；需用户把策略改回 ask（或已有授权 grant）。

## 二、19 个工具（host 侧）

| 工具 | 作用 |
|---|---|
| `novel_init` | 创建/重置项目（只接收标题 + 一句话核心构思） |
| `novel_state` | 读取项目状态（overview/settings/plot/seeds/outline/full，可按 type/query 过滤） |
| `novel_store` | 查看/设置存储根目录（report=诊断；set root=绝对路径 写 .root 指针） |
| `novel_setting_upsert` | 新建/更新设定卡（8 类：world/character/faction/power/location/item/timeline/other） |
| `novel_setting_remove` | 删除设定卡（提示残留引用） |
| `novel_seed_upsert` | **伏笔**：埋设/更新（planted→growing→payoff→abandoned；明/暗线；短/中/长/超长回收；intent 意图） |
| `novel_seed_remove` | 删除伏笔 |
| `novel_layout` | **局势图**：设定字段状态表 + 事件 world_delta 回放 + 冲突网 + 势力归属 + 回放失配警告 |
| `novel_scene_start` | **开场景**（跑团一幕）：局势、戏剧性问题、参与者、地点、约束铁律、线索钩子、赌注 |
| `novel_scene_act` | **行动裁决**（跑团核心）：GM 提出 行动/目标/裁决/置信度/结果/依据/world_delta；机械校验后记录检定卡并提交事件（branch=true 为候选分支） |
| `novel_scene_end` | **收束场景**：记录收束结果与未了结线索（建议转伏笔或下个场景） |
| `novel_infer` | **推理引擎**：返回针对 query 的推理语料 + 机械扫描 5 类缺口自动生成设定候选（反向推导） |
| `novel_setting_propose` | **反向补设定**：把剧情已隐含但未登记的设定生成为候选卡 |
| `novel_candidate_decide` | 决定一条设定候选：采纳=自动建卡/补全人物/新增字段；忽略=标记 |
| `novel_session` | 推演会话总览：活动场景、检定记录、待决候选、推理记录、操作日志 |
| `novel_plot_commit` | 提交剧情事件节点（含 world_delta 一致性校验） |
| `novel_plot_amend` | 采纳/否决/修正事件（采纳候选自动否决同分支兄弟） |
| `novel_outline_build` | 已采纳事件编译为卷/章大纲（arcs_json） |
| `novel_outline_export` | 导出 设定集.md + 大纲.md（含伏笔清单、场景记录、待决候选） |
| `novel_audit` | 机械一致性审计：孤儿引用、未用设定、缺原因事件、待决候选、空章节、伏笔健康度、回放失配、未收束场景、待决设定候选 |

## 三、跑团式推演协议（重点）

**不要过于随机**——裁决不是掷骰子，而是由设定依据支撑的推理，机械层强制校验：

1. `novel_layout` 确认当前局势（谁活着、谁在哪、状态如何）→ `novel_scene_start` 开场景；
2. 每次行动用 `novel_scene_act` 裁决，GM 必须给出：
   - `actor` 行动者 / `action` 行动 / `goal` 目标 / `verdict` 裁决（大成功/成功/部分成功/失败/大失败）/ `certainty` 置信度（必然/很可能/可能/低）/ `outcome` 结果 / `reasons` 依据 / `world_delta` 状态变化；
3. **机械校验**（不通过即拒绝）：
   - 参与者必须存活（状态=死亡/陨落则拦截，`force=true` 可硬闯但需说明依据）；
   - 依据每条必须引用**已存在的设定/事件/伏笔 id**；
   - `world_delta` 旧值必须与当前局势图一致（失配会精确指出当前值）；
   - 双方境界/修为可机械对比时给出"高于/低于行动者"提示（不拦截，确认依据即可）；
4. **不确定性用候选分支**：`branch=true` 提交多条候选事件（branch_of 同一父事件），用户在推演台"采纳/否决"，采纳自动否决兄弟分支——剧情走向由人定夺，不由随机决定；
5. `novel_scene_end` 收束：记录收束结果 + 未了结线索（转伏笔或下个场景的戏剧性问题）。

事件链在 `novel_plot_commit` 下同样执行 world_delta 一致性校验。

## 四、推理与反向补设定（重点）

设定永远不完整——**推理到一定程度就反向建立新设定**：

- **正向推理**：`novel_infer {query, domain}` 返回推理语料（相关设定/事件/伏笔/局势状态/活动场景）。GM 基于语料给出 前提→推论→置信度→依据id 的四段推理链，标注缺口与矛盾；
- **反向推导**（机械扫描 5 类缺口，自动生成候选卡）：
  1. 事件冲突方/参与者引用了未登记的**名称** → 新建设定候选；
  2. 人物卡缺 状态/能力字段 → 补全人物候选；
  3. 势力卡无成员关系 → 补全势力候选；
  4. world_delta 修改了卡上**不存在的字段**（v9 时代的"隐形状态"）→ 新增字段候选；
  5. 伏笔未关联任何设定 → 关联设定候选；
- **落实**：`novel_candidate_decide {id, accept}` 采纳（自动建卡/补字段，`fields` 传 "键：值"）或忽略；也可手动 `novel_setting_upsert`。

约定：卡上字段=**基线值**（故事起点），world_delta=变更史，局势图=回放结果。补字段时请填基线值（如"持有者：无"），否则回放失配会被审计抓出。

## 五、标准工作流（对话式）

1. `novel_init`（只收构思）→
2. `novel_setting_upsert` 建世界观与核心人物/势力 →
3. `novel_scene_start/act/end` 跑团式推演（推演前先 `novel_layout`；不确定性以 branch 候选提交）→
4. 定期 `novel_infer` / `novel_setting_propose` 反向补设定，`novel_candidate_decide` 落实 →
5. `novel_seed_upsert` 埋设伏笔（长篇幅布局的关键）→
6. `novel_outline_build` + `novel_outline_export` 形成大纲。过程中定期 `novel_audit`。

## 六、数据与文件

- `state.json`：`meta / settings / plot.events / seeds / outline.arcs / scenes / session / candidates / inferences / log`，全部为 id 指针引用。
- 导出：`settings.md`、`outline.md`（含场景记录与待决候选）；存储根指针：`.root`。
- 本机路径：存储根 `D:\ds`，项目目录 `D:\ds\novel-assistant\`；示例项目《燃石记》已存在，可直接续写。

## 七、故障排查

- 推演台只显示红框/标题、无内容：检查 client 源码中 `h()` 辅助函数是否用 `React.createElement.apply(null, args)` 透传全部子元素。
- `host.call` 失败：先 `cordis_inspect_self` 看运行状态；必要时重新 `cordis_run` 同一包。
- 页面刷新后视图丢失：属预期（运行事件错过）；重新运行插件即可恢复，勿刷新页面。
- 数据没恢复：`novel_store` 看诊断；必要时 `novel_store set root=绝对路径`。
- 检定被拒：逐条看错误——world_delta 失配以局势图当前值为准；依据 id 必须是设定/事件/伏笔 id；死者不可行动（除非 force 并说明依据）。
