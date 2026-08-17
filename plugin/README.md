# @dsh-external/dsh-novel-workbench

小说创作工作台（推演台）：**26 个 novel_* 工具**（含工作区门控自检 `novel_scope`）+ 多项目存储 + 推演台 UI 面板。

**单独工作区（workspace-scoped）**：默认仅限 `D:\ds` 工作区会话使用（host 按发起会话 cwd 门控 execute、client 按会话 cwd 门控渲染、RPC 按 sessionId 二次校验）；host 可用环境变量 `NOVEL_WS_SCOPE` 覆盖作用域，构建期默认在 `scripts/build.js` 顶部 `WS_SCOPE_DEFAULT`。

## 构建与装配（v13：静态装配，不经 super-injector）

```bash
D:\ds\novel-workbench\plugin> node scripts/build.js
# 产物：lib/index.js（host ESM）+ lib/client.js（ModuleLoader UI）
# 装配：~/.dsh/profiles/web/cordis.patch.yml 的 - insert: 行 + node_modules junction
# 生效：重启 DSH（⚠️ 不要对运行中宿主 dev_reload_package 热重载，v13 崩溃教训）
```

源码事实源：`../../plugin-source.json`（改这里，勿手改 lib/）。