## 2026-09-19 — 用户 MCP 编辑改为 JSON 编辑器

- 需求：用户 MCP 编辑应直接修改标准 `mcpServers` JSON 配置。
- 修改：`src/views/chat/agentMarket/index.vue` 将编辑弹框改为大文本 JSON 编辑器，保存前执行 JSON 格式校验；新增读取用户 MCP JSON 的 API 方法。
- 联动：支持保持启用状态；后端对 Token、API Key 等敏感字段脱敏展示并在未修改时保留原值。
- 验证：`npm run build:prod` 成功；仅有既有资源体积和 Browserslist 提示；`git diff --check` 通过。
- 未完成：尚未重新 CI/CD 部署。

## 2026-09-19 — 统一头像静态资源地址配置

- 需求：修复生产环境登录后用户头像因走 `/proxyApi` 接口代理而无法加载的问题。
- 修改：`src/store/modules/user.js` 统一使用 `VUE_APP_IMG_API` 拼接头像地址；`.env.production` 增加 `VUE_APP_IMG_API=https://imgs.luckynwa.top`。
- 联动：开发环境继续使用既有 `VUE_APP_IMG_API` 配置；无后端接口、数据库或权限变更。
- 验证：待执行前端 diff 检查、构建和线上登录回归。
- 未完成：需要重新构建并部署前端后验证头像显示。

## 2026-09-17 — 开启日志控制台 10 秒自动刷新

- 需求：日志控制台需要持续查看最新日志，减少手动点击查询。
- 修改：`src/views/system/serverConsole/index.vue` 默认开启自动刷新，每 10 秒重新读取服务状态和当前筛选条件下的日志；开关文案明确显示“自动刷新（10秒）”，仍可手动关闭。
- 联动：复用现有日志查询接口，无后端接口、数据库、权限或数据结构变更。
- 验证：待执行前端 diff 检查、CI/CD 与线上页面回归。
- 未完成：无。

## 2026-09-17 — 优化服务日志列表布局

- 需求：日志控制台上方状态卡片和筛选区占用空间较多，日志列表阅读不清晰。
- 修改：`src/views/system/serverConsole/index.vue` 压缩服务状态卡片、查询表单和卡片内边距；日志表格改为自适应视口高度并收紧行间距，在窄屏下增加横向滚动保护。
- 联动：无后端接口、数据库、权限或数据结构变更。
- 验证：`git diff --check` 通过；CI/CD 运行 `35192831775` 成功；线上已确认紧凑布局、200 条日志列表、服务状态/筛选区正常，并点击“查看”打开详情验证完整日志内容。
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
## 2026-09-17 — 增加 Redis 与 MySQL 健康查询

- 服务日志控制台新增“依赖健康”区域，使用只读探针查询 MySQL 与 Redis 的连接状态。
- 展示依赖名称、正常/异常状态、探针结果、响应耗时，不返回连接地址、账号或密码。
- 与现有服务状态和 10 秒自动刷新保持一致。
- 验证：待执行前端构建、CI/CD 与线上页面回归。
## 2026-09-17 — 收拢服务状态详情

- 顶部四张服务与依赖卡片收拢为一个运行状态概览卡，减少页面首屏占用。
- 点击“查看详情”后在弹框中查看 Lucky Admin、Lucky RAG、MySQL、Redis 的完整状态信息。
- 验证：待执行前端检查、CI/CD 与线上页面回归。
## 2026-09-17 — 仅通过查看按钮打开日志详情

- 移除日志整行点击打开详情的行为，避免误触。
- 仅点击操作列的“查看”按钮时打开日志详情弹框。
- 验证：待执行前端检查、CI/CD 与线上页面回归。
## 2026-09-17 — 明确日志全量搜索范围

- 日志查询区域明确标注“全量搜索，展示最新 200 条”。
- 匹配数量代表完整日志文件的搜索结果，列表只展示最新 200 行。
- 验证：待执行前端检查、CI/CD 与线上页面回归。
## 2026-09-17 — 支持页面设置自动刷新频率

- 自动刷新默认调整为 10 分钟。
- 日志查询区域新增刷新频率选择，可切换 10 秒、30 秒、1 分钟、5 分钟、10 分钟和 30 分钟。
- 设置保存在当前浏览器本地，不新增数据库表；关闭自动刷新后仍可手动刷新。
- 验证：待执行前端检查、CI/CD 与线上页面回归。
## 2026-09-17 — 优化刷新控制与资源状态文案

- 运行状态详情新增云服务器 CPU、内存资源卡片。
- 状态说明改为跟随当前刷新频率显示，不再写死“每 10 秒”。
- 自动刷新旁新增“手动刷新”按钮，会同时更新状态、日志文件和日志列表。
- 验证：待执行前端检查、CI/CD 与线上页面回归。
## 2026-09-17 — 展示经期 AI 预测与分析过程

- 需求：在预测下次经期位置标注 AI 分析时间，并可查看模型回复和分析过程。
- 修改：`src/views/reminder/period/index.vue` 增加 AI 分析标识、立即分析按钮和详情弹框；`src/api/reminder/period.js` 增加 AI 分析接口。
- 联动：AI 预测结果优先标注到预测日期，失败时保留原有系统计算结果。
- 验证：待执行前端检查、CI/CD 与线上真实模型调用。
- 未完成：无。
## 2026-09-19 — 优化配额管理支持用户额度与 RPS

- 需求：Admin 后台按用户配置每日额度和 RPS，并保留角色默认配额视图。
- 修改：`src/views/chat/quota/index.vue` 增加用户配额表、额度/RPS 编辑、今日重置和新用户配额补齐；`src/api/chat/index.js` 增加对应接口。
- 联动：对接 Admin `/ai/chat/quota/users`、`/ai/chat/quota/user/{username}` 和 `/ai/chat/quota/provision`。
- 验证：目标代码已完成 diff 检查；`npm run build:prod` 仍被项目既有 `optimize-cssnano-plugin` CSS 压缩错误阻断。
- 未完成：需在 CI/线上确认页面构建和权限菜单。
## 2026-09-19 — 增加 Agent 扩展市场管理页

- 需求：Admin 后台增加 Skill、MCP、Plugin 市场管理，支持元数据维护和资源文件上传。
- 修改：新增 `src/views/chat/agentMarket/index.vue`、`src/api/ai/agentMarket.js`；新增 `sql/agent_market_menu.sql` 菜单和权限脚本。
- 联动：调用 Admin `/ai/agent/market` 接口，文件上传进入 S3/R2；市场安装量由 RAG 用户安装接口维护。
- 验证：Admin `npm run build:prod` 仍被项目既有 `optimize-cssnano-plugin` CSS 压缩错误阻断，未发现本次新增页面的 Vue 编译错误。
- 未完成：执行菜单 SQL 后，用管理员账号验证页面权限和 S3 上传。
## 2026-09-19 — 增加用户 MCP 分类管理视图

- 需求：Admin 后台可按“开源 / 个人”查看用户 MCP 配置。
- 修改：`src/views/chat/agentMarket/index.vue` 增加“用户 MCP”页签、关键词/分类筛选、用户/地址/状态/更新时间列表；`src/api/ai/agentMarket.js` 增加查询接口。
- 联动：复用扩展市场页面和 `ai:agent:market:list` 权限；用户侧删除规则不变，市场 MCP 仍只删除用户引用。
- 验证：`npm run build:prod`、`git diff --check` 通过（仅有既有 Browserslist 和资源体积提示）。
- 未完成：无。
## 2026-09-19 — 用户 MCP 管理增加编辑与删除操作

- 需求：Admin 后台“用户 MCP”列表不能编辑或删除。
- 修改：`src/views/chat/agentMarket/index.vue` 增加操作列和编辑弹框；`src/api/ai/agentMarket.js` 增加用户 MCP 编辑/删除请求。
- 联动：编辑支持名称、描述、Endpoint、启用状态；删除提示明确只影响用户配置，不影响市场资源。
- 验证：`npm run build:prod`、`git diff --check` 通过；仅有既有资源体积和 Browserslist 提示。
- 未完成：无。
