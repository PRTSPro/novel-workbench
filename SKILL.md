---
name: novel-workbench
description: 小说创作工作台（推演台）——跑团式剧情推演（场景/行动裁决/候选分支）、双向推理与反向补设定、伏笔/势力布局、大纲生成。含快速部署流程（免读源码全文）、完整插件源码与一键重建步骤、GM 协作协议。当用户提到"推演台、小说工作台、设定、剧情推演、跑团、伏笔、大纲、燃石记"或 novel_ 工具时使用。
whenToUse: 用户要求打开推演台/小说工作台、使用 novel_* 工具、进行跑团式剧情推演或推理补设定、或继续《燃石记》等小说项目时。
---

# 小说创作工作台（novel-workbench v10.2）

## 这是什么

DeepSeek Harness（DSH）**动态 Cordis 插件**（host 侧 19 个工具 + 浏览器"推演台"视图）。
核心理念：**不直接生成小说正文**，只做四件事——**构建设定 → 跑团式推演 → 双向推理补设定 → 形成大纲**。
数据持久化在 `<存储根>/novel-assistant/state.json`；**本机存储根固定为 `D:\ds`**（`.root` 指针定位）。

技能目录内容：`SKILL.md`（本文件）、`plugin-source.json`（pkg-5 / v10.2 完整 Host+Client 源码）。

---

## 一、快速部署（时间优化版）

### 1.0 部署成本从哪来（先读，别重蹈覆辙）

- **最大开销是 `cordis_define` 全量内联**：每次调用必须把 host+client 全部源码（约 73KB）作为参数提交，无法传文件路径。因此：
  - 不要反复读源码文件全文（81KB）——**用下面 1.2 的命令提取+语法检查，只读必要内容**；
  - **不要小步迭代发布**：改代码先在本地文件完成 + node 语法检查，攒成一次 `cordis_define` + `cordis_run update`。反面教材：为一个小修复连发 4 个包，每次全量重发 73KB。
- **批准是人工环节**：ask 策略下 `cordis_run` 返回 `awaiting-approval` 时必须**立即结束回合等批准**，不要继续做其他工作。
- 存储根解析有已知陷阱（见 1.3），部署后**必须先验证数据恢复**再继续。

### 1.1 检查是否已运行

`cordis_inspect_self`（无参）。若列表中有 `novl-1` 且 state=running：直接告诉用户推演台已就绪，**不要重建**。

### 1.2 重建（插件不存在或未运行时）

1. **提取源码 + 语法检查（一条命令，不读全文）**：

```powershell
$j = Get-Content '<技能目录>\plugin-source.json' -Raw -Encoding UTF8 | ConvertFrom-Json
[System.IO.File]::WriteAllText("$env:TEMP\novl_host.js", $j.host, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText("$env:TEMP\novl_client.js", $j.client, [System.Text.UTF8Encoding]::new($false))
node -e "const fs=require('fs');for(const f of ['$env:TEMP\novl_host.js','$env:TEMP\novl_client.js']){new Function(fs.readFileSync(f,'utf8'));console.log(f+' OK')}"
```

   输出两行 `OK` 即源码可用；随后读取两个临时文件内容（各读一次），供 `cordis_define` 使用。

2. **`cordis_define`**：`plugin.kind:"new"`、`idPrefix:"novl"`；`code.host` 填入 host 内容、`code.client` 填入 client 内容（**一次内联，不要反复读文件**）；name/purpose 取自 plugin-source.json。
3. **`cordis_run`**（返回的 pluginId/packageId，mode:`run`）：
   - `awaiting-approval` → **结束回合**，等用户批准；
   - `starting` → 等最终结果（成功会以状态通知到达）。
4. **验证**：`novel_state view=overview` 应显示《燃石记》及 10+ 设定。若 meta 为空 → 走 1.3 存储根修复，然后 `cordis_run` 重启同一包。

### 1.3 存储根（本机已知值，直接使用）

- 存储根：`D:\ds`；项目目录：`D:\ds\novel-assistant\`；数据文件：`state.json`、导出 `settings.md`/`outline.md`。
- **自动解析陷阱**：插件解析顺序为 会话工作区(cwd) → fs 基路径探测 → `.root` 指针 → 沙箱回退根。当会话工作区是 `D:\ds\novel-assistant` 时，插件会把它误当存储根（去找 `...\novel-assistant\novel-assistant\state.json`），表现为"项目为空"。
- **修复**：写入指针文件 `<workspaceRoot>/novel-assistant/.root`，内容为 `D:\ds`（不含换行）；然后 `cordis_run`（同一包，mode:`run`）重启使其生效。
- 验证：`novel_store report` 的 `currentRoot` 应为 `D:\ds`；`novel_state` 应恢复全部数据。

### 1.4 迭代纪律（修改插件时）

1. 在本地副本（如 `D:\ds\novel-workbench\` 下）编辑源码文件 → node 语法检查（同 1.2 的 node 命令）→ **全部修改完成后**一次 `cordis_define(kind:"existing", pluginId:"novl-1")` + `cordis_run(mode:"update")`；
2. 小修复攒批：例如"依据校验+RPC 序列化"合并为一个包，避免每修一行重发全量；
3. 发布后立即用受影响路径验证（工具调用/面板 RPC），失败则读 `cordis_inspect_self(pluginId, packageId)` 的诊断，修正后继续 `update`；
4. 更新技能目录与仓库的 `plugin-source.json`，使其始终等于**当前运行的最新包**（本次对应 pkg-5 / v10.2）。

---

## 二、推演台如何工作（写给 agent 的工作模型）

### 2.1 数据模型（state.json）

```
state.json: meta / settings / plot.events / seeds / outline.arcs / scenes / session / candidates / inferences / log
```

- **id 体系**：`s*`设定卡、`c*`（预留人物）、`f*`伏笔、`e*`事件、`sc*`场景、`ck*`检定卡、`p*`设定候选、`in*`推理记录。
- **三条语义铁律**（推演一致性全靠它）：
  1. **卡上字段 = 基线值**（故事起点的状态）；
  2. **world_delta = 变更史**，格式 `目标id:字段:旧值→新值`，旧值必须与当时局势一致；
  3. **局势图 = 回放结果**（`novel_layout` 用基线+全部 committed 事件的 delta 顺序回放得出"当前状态"）。
- 推论：补字段/改卡时填**基线值**（如"持有者：无"），回放后自动得到当前值（"持有者：沈焰"）；填当前值会造成回放失配，被审计抓出。

### 2.2 工具地图（19 个，按职责分组）

| 职责 | 工具 | 说明 |
|---|---|---|
| 项目管理 | `novel_init` `novel_state` `novel_store` | 建/重置项目；查状态；查/设存储根 |
| 设定卡 | `novel_setting_upsert` `novel_setting_remove` | 8 类卡；删卡提示残留引用 |
| 伏笔 | `novel_seed_upsert` `novel_seed_remove` | planted→growing→payoff→abandoned；明/暗线；回收距离；intent |
| 局势 | `novel_layout` | 回放后的当前状态表+冲突网+势力归属+失配警告 |
| 场景引擎 | `novel_scene_start` `novel_scene_act` `novel_scene_end` | 开场景→行动裁决→收束（见 2.4） |
| 推理 | `novel_infer` | 语料+缺口扫描，返回推理工作台 |
| 反向补设定 | `novel_setting_propose` `novel_candidate_decide` | 缺口→候选卡→采纳建卡/忽略 |
| 会话 | `novel_session` | 活动场景/检定记录/待决项/日志总览 |
| 事件链 | `novel_plot_commit` `novel_plot_amend` | 提交事件（含 delta 校验）；采纳/否决/修正（采纳自动否决兄弟分支） |
| 大纲 | `novel_outline_build` `novel_outline_export` | 事件编译为卷/章；导出 md（含场景记录/待决项） |
| 审计 | `novel_audit` | 孤儿引用/缺原因/伏笔健康/回放失配/未收束场景/待决候选 |

### 2.3 UI 与 RPC 的对应

推演台面板与工具走同一套数据（8 秒自动同步，可手动刷新）。面板能独立完成：设定增删改、开场景/行动裁决/收束、分支采纳/否决、伏笔增删改、推理扫描、设定候选采纳/忽略。**面板操作与工具调用等价**；agent 在对话中推演、用户在面板决策，结果互通。

### 2.4 双向推理闭环（本工作台的核心价值）

```
剧情推演（场景/检定/事件）→ novel_infer / novel_setting_propose 扫描缺口
→ 设定候选（事件引用未登记名称/人物缺字段/势力无成员/world_delta 隐形字段/伏笔无关联）
→ novel_candidate_decide 采纳建卡 / 忽略 → novel_audit 校验一致性 → 回到推演
```

设定永远不完整是常态；**推理到一定程度就反向建立新设定**，这正是"反向补全"的意义。

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
- 候选落实前向用户说明取舍理由，或提示用户在面板操作；采纳时按基线值语义补字段。

### 3.3 与用户的交互

- **汇报格式**：结构化摘要（新事件/检定结果/状态变化/新增候选），不写文学性正文；
- **主动提醒待决项**：候选分支（e* candidate）与设定候选（p* pending）出现时明确告知，引导用户在面板决策；
- 用户决策后顺势继续：分支采纳→沿该走向开下一场景；候选采纳→继续审计确认一致。

### 3.4 与 DSH 生命周期的配合

- 动态插件**进程重启后消失**：按 1.2 重建即可，数据在 `state.json` 不受影响；
- 页面刷新导致视图丢失：**重新 `cordis_run`，不要刷新页面**；
- 深度推演可委托子代理：给子代理完整上下文（项目路径、当前局势快照、GM 纪律），拿回候选分支/推理结论后经工具落库；
- 面板与对话并用：agent 负责生成与校验，用户负责定夺走向，二者通过 state.json 同步。

### 3.5 错误修复协议

| 症状 | 原因 | 修法 |
|---|---|---|
| `novel_scene_act` 被拒 | 依据 id 不存在 / delta 旧值失配 / 死者行动 | 按错误列表逐条修正重提；旧值以 `novel_layout` 当前值为准 |
| 审计报 world_delta 回放失配 | 卡字段被填成了非基线值 | 把卡字段改回基线值（delta 的旧值），或 `novel_plot_amend` 修正事件 delta |
| `novel_state` 显示空项目 | 存储根解析错 | 1.3 指针修复 + 重启 |
| 面板 `host.call` 失败 | 插件状态异常 | `cordis_inspect_self` 看运行状态；重新 `cordis_run` 同一包 |
| 面板报 lossless JSON 错误 | RPC 返回了 undefined | 修 host 映射（`|| ''`/`|| null`）后按 1.4 发布 |

---

## 四、数据与文件

- 唯一事实源：`<存储根>/novel-assistant/state.json`；导出文件（settings.md/outline.md）只是快照。
- 本机：存储根 `D:\ds`，项目 `D:\ds\novel-assistant\`；示例项目《燃石记》可直接续写。

## 五、故障排查（速查）

- 推演台只显示红框/标题、无内容：client 源码 `h()` 必须用 `React.createElement.apply(null, args)` 透传全部子元素。
- 页面刷新后视图丢失：属预期，重新 `cordis_run`，勿刷新页面。
- 审批策略 never 时无法创建插件：需用户改回 ask 或已有授权 grant。
- 数据没恢复：`novel_store` 诊断 → 1.3 指针修复。
