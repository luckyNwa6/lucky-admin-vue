## 2026-09-17 — 优化服务日志列表布局

- 需求：日志控制台上方状态卡片和筛选区占用空间较多，日志列表阅读不清晰。
- 修改：`src/views/system/serverConsole/index.vue` 压缩服务状态卡片、查询表单和卡片内边距；日志表格改为自适应视口高度并收紧行间距，在窄屏下增加横向滚动保护。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：待执行 `git diff --check`、前端 CI/CD 和线上列表视觉回归。
- 未完成：无。

## 2026-09-17 — 增加日志详情查看

- 需求：日志内容较长时表格会截断，排查问题不够直观。
- 修改：服务日志控制台支持点击日志行或操作列“查看”打开详情弹窗，完整展示日志内容、时间、级别和行号，并在查询摘要中增加操作提示。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：前端 `git diff --check` 通过；CI/CD 运行 `35191584078` 和 `35191936137` 均成功；线上已确认服务状态、日志查询、关键字筛选、服务/日志来源切换及业务日志文件列表正常。
- 未完成：无。

## 2026-09-17 — 优化服务日志控制台加载反馈

- 需求：线上切换服务、日志来源或重置筛选时，需要明确知道日志是否正在加载、为空或读取失败。
- 修改：增加日志加载状态、空结果提示和错误提示；为查询请求增加序列校验，避免快速切换筛选时旧请求覆盖新结果。
- 验证：已在在线管理后台验证 Lucky Admin/Lucky RAG 服务切换、运行日志/业务日志切换及业务日志文件列表加载。

## 2026-09-17 — 新增云服务器服务日志控制台

- 需求：在系统管理下可视化查看云服务器上的 Lucky Admin、Lucky RAG 运行状态和日志，并支持日志搜索。
- 修改：新增 `src/views/system/serverConsole/index.vue`、`src/api/system/serverConsole.js`；新增 Java `ServerConsoleController` / `ServerConsoleService`，只读读取预定义的 Admin/RAG 进程状态、健康检查和日志；新增 `java/lucky-admin-api/sql/server_console_menu.sql` 菜单脚本。
- 联动：新增权限 `system:serverConsole:list`；日志路径使用服务器标准路径 `/nwa/wagon/running.log`、`/nwa/wagon/rag/backend/app.log` 和 RAG `logs/` 目录；不提供重启、删除或清空日志操作。
- 验证：待执行前后端构建、菜单 SQL 执行和 CI/CD；服务器只读状态检查已确认 Lucky API 10086 返回 302、Lucky RAG 18000 返回 200。
- 未完成：需要执行菜单 SQL 后，用管理员账号验证菜单权限和线上日志查询。

## 2026-09-17 — 重构文件治理页面信息层级

- 需求：文件治理页面当前信息难以理解，需要明确扫描结果、治理状态和删除边界。
- 修改：`src/views/chat/fileAudit/index.vue` 增加治理说明、五项统计卡片、路径/状态筛选、过期阈值、标准操作栏和候选文件区；将原始状态码翻译为中文、格式化文件大小，并强化删除确认提示。
- 联动：复用现有 `/ai/chat/fileAudit/scan` 和 `/ai/chat/fileAudit/delete` 接口；扫描阈值继续通过 `staleHours` 传递，无后端结构变更。
- 验证：`git diff --check` 通过；目标文件 ESLint 仍受既有格式规则阻断；`npm run build:prod` 仍在现有 CSS 压缩插件处失败。
- 未完成：待 CI 和线上页面确认视觉效果。

## 2026-09-17 — 统一博客与共享文档查询样式

- 需求：博客文章、共享文档的搜索区域与后台全局模块样式统一。
- 修改：`src/views/resource/blog/index.vue`、`src/views/resource/shareDoc/index.vue` 改用标准查询表单、标签/占位文字、搜索/重置按钮、操作栏、`right-toolbar` 和通用 `pagination`，表格移除页面自定义边框。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：已执行 diff 检查；待提交后由 GitHub Actions 云服务器 CI/CD 验证。
- 未完成：无。

## 2026-09-17 — 统一文件管理查询文案

- 需求：文件管理页搜索区域的文字与其他后台模块保持一致。
- 修改：`src/views/resource/file/index.vue` 将查询标签和占位文字统一为“文件名 / 请输入文件名”，保留原有 `picName` 接口字段。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：已执行 diff 检查；待提交后由 GitHub Actions 云服务器 CI/CD 验证。
- 未完成：无。

## 2026-09-17 — 统一文件管理页搜索与表格样式

- 需求：文件管理页的搜索和表格样式参考大模型管理页，便于线上测试时保持后台交互一致。
- 修改：`src/views/resource/file/index.vue` 改用标准查询表单、搜索/重置按钮、操作栏、`right-toolbar` 和通用 `pagination`；表格移除自定义边框与固定高度，保留文件夹树、网格视图和图片操作。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：`npm run lint -- --no-fix` 受项目 ESLint 忽略配置阻断；对目标文件执行 ESLint 发现该文件既有格式规则问题；`npm run build:prod` 在现有 CSS 压缩插件 `optimize-cssnano-plugin` 处失败。
- 未完成：需通过 CI 和线上环境确认视觉效果及分页联动。
