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
