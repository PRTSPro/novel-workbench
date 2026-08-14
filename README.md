# novel-workbench（小说推演台）

> DeepSeek Harness（DSH）社区贡献：小说创作工作台技能 + 动态 Cordis 插件完整源码。

一个不直接写正文、只做三件事的小说创作工作台：**构建设定 → 推演剧情 → 形成大纲**。

- 浏览器内**三栏工作台**（「推演台」标签页）：设定管理 / 剧情推演（事件链、待决分支、伏笔簿）/ 局势图（当前状态、冲突网、势力归属、分卷大纲）
- Host 侧 **13 个工具**（`novel_*`）：设定卡、因果事件、伏笔、局势图、审计、大纲生成与导出
- 数据全部持久化为**结构化 JSON**（设定卡 / 因果事件 / 伏笔 / 卷章大纲，id 指针引用），不是文学性正文
- 数据自动从 `<存储根>/novel-assistant/state.json` 恢复，无需导入

## 目录结构

```
novel-workbench/
├── README.md            # 本文件
├── SKILL.md             # 技能说明（在 DSH 会话中加载 novel-workbench 技能的内容）
└── plugin-source.json   # novel-assistant v9 动态插件完整源码
                          #   host   —— 13 个工具 + 8 个面板 RPC（get-state/get-layout/setting-save/...）
                          #   client —— 三栏工作台 UI（注册到 conversation.view 槽位，标签「推演台」）
```

## 安装（在任意 DSH 会话中一键重建）

novel-assistant 是**动态 Cordis 插件**：不修改任何组成文件，只在当前 DSH 进程内生效；进程重启后需重新定义（数据不受影响，仍在 `state.json`）。

```text
1. 读取本仓库 plugin-source.json；
2. cordis_define(kind: "new", idPrefix: "novl")
   → code.host 填入 host 字段；code.client 填入 client 字段；
3. cordis_run(返回的 pluginId, packageId, mode: "run")；
4. 在界面上批准运行请求；
5. 批准后对话页顶部出现「推演台」标签页（与"对话/轨迹"并列），Run 卡片内也有紧凑面板。
```

存储根解析顺序：会话工作区（cwd）→ fs 默认基路径探测 → `<基路径>/novel-assistant/.root` 指针文件 → 沙箱回退根。可用 `novel_store` 查看/设置。

## 13 个工具

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
| `novel_plot_commit` | 提交剧情事件节点（因果、冲突、赌注、world_delta、constraints；status=candidate 作待决分支） |
| `novel_plot_amend` | 采纳/否决/修正事件（采纳候选自动否决同分支兄弟） |
| `novel_outline_build` | 已采纳事件编译为卷/章大纲（arcs_json） |
| `novel_outline_export` | 导出 设定集.md + 大纲.md（含伏笔清单）+ 状态快照 |
| `novel_audit` | 一致性审计：孤儿引用、未用设定、缺原因事件、待决候选、空章节、伏笔健康度、回放失配 |

## 标准工作流

`novel_init` → `novel_setting_upsert`（世界观与核心人物）→ `novel_plot_commit` 推演（推演前先 `novel_state view=plot` + `novel_layout`）→ 分支走向以 candidate 提交由用户采纳/否决 → `novel_seed_upsert` 埋设伏笔 → `novel_outline_build` + `novel_outline_export` 形成大纲；过程中定期 `novel_audit`。

## 数据模型

`state.json`：`meta / settings / plot.events / seeds / outline.arcs / log`，全部为 id 指针引用（事件↔事件、事件↔设定、伏笔↔事件）。`world_delta` 每项格式 `目标id:字段:旧值→新值`，旧值必须与当前状态一致（审计会校验）。

## 故障排查

- 推演台只显示红框/标题、无内容：检查 client 源码中 `h()` 是否用 `React.createElement.apply(null, args)` 透传全部子元素。
- `host.call` 失败：先 `cordis_inspect_self` 看运行状态；必要时重新 `cordis_run` 同一包。
- 页面刷新后「推演台」视图丢失：属预期（运行事件错过），重新 `cordis_run` 一次即可恢复，勿刷新页面。
- 数据没恢复：`novel_store` 看诊断；必要时 `novel_store set root=绝对路径`。

## 社区

面向 DeepSeek Harness 社区开源。欢迎 fork、提 issue、贡献改进（例如：更多设定类型、分支可视化、导出格式扩展）。

## 示例

仓库自带示例项目数据不随仓库分发；《燃石记》演示项目（10 设定 / 8 事件 / 4 伏笔 / 1 卷）可自行按上述工作流在本地重建。
