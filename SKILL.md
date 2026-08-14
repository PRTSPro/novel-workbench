---
name: novel-workbench
description: 小说创作工作台（推演台）——设定管理、剧情推演（伏笔/势力布局）、大纲生成，含完整插件源码与一键重建步骤。当用户提到"推演台、小说工作台、设定、剧情推演、伏笔、大纲、燃石记"或 novel_ 工具时使用。
whenToUse: 用户要求打开推演台/小说工作台、使用 novel_* 工具、或继续《燃石记》等小说项目时。
---

# 小说创作工作台（novel-workbench）

## 这是什么

一个 DeepSeek Harness **动态 Cordis 插件**（host 侧 13 个工具 + 浏览器"推演台"视图）。
核心理念：**不直接生成小说正文**，只做三件事——**构建设定 → 推演剧情 → 形成大纲**。
数据持久化在 `<存储根>/novel-assistant/state.json`；本机存储根为 `D:\ds`（由 `.root` 指针定位）。

## 一、打开推演台（核心操作）

1. 先检查插件是否已在运行：`cordis_inspect_self`（无参调用列出当前插件）。
2. 若 novel-assistant 插件不在列表或未运行：
   a. 读取本技能目录下的 **`plugin-source.json`**（pkg-8 的完整 Host + Client 源码）；
   b. `cordis_define(kind: "new", idPrefix: "novl")`：`code.host` 填入该文件 `host` 字段、`code.client` 填入 `client` 字段；
   c. 用返回的 pluginId/packageId 执行 `cordis_run`（可能需要用户在界面上批准）；
   d. 运行成功后：对话页顶部出现**「推演台」标签页**（与"对话/轨迹"并列），`cordis_run` 的 Run 卡片内也有紧凑面板。
3. 若已在运行：直接告诉用户推演台已就绪，无需重复定义。

注意：
- 数据自动从 `state.json` 恢复，**无需任何导入操作**。
- 若页面在插件运行之后才加载（如刷新过），推演台视图可能未注册：不要刷新页面，重新 `cordis_run` 一次即可恢复。
- 审批策略为 never 时插件无法创建；需用户把策略改回 ask。

## 二、13 个工具（host 侧）

| 工具 | 作用 |
|---|---|
| `novel_init` | 创建/重置项目（覆盖旧项目；只接收标题 + 一句话核心构思） |
| `novel_state` | 读取项目状态（overview/settings/plot/seeds/outline/full，可按 type/query 过滤） |
| `novel_store` | 查看/设置存储根目录（report=诊断；set root=绝对路径 写 .root 指针） |
| `novel_setting_upsert` | 新建/更新设定卡（8 类：world/character/faction/power/location/item/timeline/other） |
| `novel_setting_remove` | 删除设定卡（提示残留引用） |
| `novel_seed_upsert` | **伏笔**：埋设/更新（planted→growing→payoff→abandoned；明线/暗线；短/中/长/超长回收距离；intent 意图；关联事件与设定） |
| `novel_seed_remove` | 删除伏笔 |
| `novel_layout` | **局势图**：设定"键：值"字段解析为状态表 → 按序回放已采纳事件 world_delta → 当前状态 + 冲突网 + 势力归属 + 回放失配警告 |
| `novel_plot_commit` | 提交剧情事件节点（因果、冲突、赌注、world_delta、constraints；status=candidate 时作为待决分支） |
| `novel_plot_amend` | 采纳/否决/修正事件（含 world_delta 修正；采纳候选自动否决同分支兄弟） |
| `novel_outline_build` | 已采纳事件编译为卷/章大纲（参数 arcs_json 为 JSON 字符串） |
| `novel_outline_export` | 导出 设定集.md + 大纲.md（含伏笔清单）+ 状态快照 |
| `novel_audit` | 一致性审计：孤儿引用、未用设定、缺原因事件、待决候选、空章节、伏笔健康度、world_delta 回放失配 |

## 三、标准工作流（对话式）

1. `novel_init`（只收构思）→
2. `novel_setting_upsert` 建世界观与核心人物/势力 → 
3. `novel_plot_commit` 推演（推演前先 `novel_state view=plot` + `novel_layout` 检查当前状态与冲突）→
4. 分支走向以 candidate 提交，交由用户「采纳/否决」→
5. `novel_seed_upsert` 埋设伏笔（长篇幅布局的关键）→
6. `novel_outline_build` + `novel_outline_export` 形成大纲。过程中定期 `novel_audit`。

推演纪律：
- 事件必须引用**已存在**的设定/事件 id；`world_delta` 格式 `目标id:字段:旧值→新值`，旧值必须与当前状态一致（`novel_audit`/`novel_layout` 会校验并告警）。
- 伏笔是长篇布局核心：记录埋设/回收事件、回收距离、明暗线、意图；审计会报告"未回收伏笔"与"悬空伏笔"。
- 局势图防止"角色已死还在说话"式冲突：推演新事件前先看当前状态。
- 全程产出结构化数据（设定卡、因果事件、伏笔、卷章大纲），**不写文学性正文**。

## 四、数据与文件

- `state.json`：`meta / settings / plot.events / seeds / outline.arcs / log`，全部为 id 指针引用（事件↔事件、事件↔设定、伏笔↔事件）。
- 导出：`settings.md`（设定集）、`outline.md`（大纲）；存储根指针：`.root`（`novel_store set` 写入）。
- 本机路径：存储根 `D:\ds`，项目目录 `D:\ds\novel-assistant\`；示例项目《燃石记》已存在，可直接续写。

## 五、故障排查

- 推演台只显示红框/标题、无内容：检查 client 源码中 `h()` 辅助函数是否用 `React.createElement.apply(null, args)` 透传全部子元素（历史上出现过只传第一个子元素的 bug）。
- `host.call` 失败：先 `cordis_inspect_self` 看运行状态；必要时重新 `cordis_run` 同一包。
- 页面刷新后视图丢失：属预期（运行事件错过）；重新运行插件即可，勿刷新页面。
- 数据没恢复：`novel_store` 看诊断；必要时 `novel_store set root=D:\ds`（写 .root 需相应沙箱权限）。
