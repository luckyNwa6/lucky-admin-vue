<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <el-tab-pane label="市场资源" name="market" />
      <el-tab-pane label="用户资源" name="userResource" />
    </el-tabs>
    <div v-show="activeTab === 'market'">
    <el-form :inline="true" size="small" :model="queryParams">
      <el-form-item label="名称"><el-input v-model="queryParams.displayName" clearable placeholder="名称" @keyup.enter.native="getList" /></el-form-item>
      <el-form-item label="类型"><el-select v-model="queryParams.assetType" clearable placeholder="全部"><el-option label="Skill" value="skill" /><el-option label="MCP" value="mcp" /><el-option label="Plugin" value="plugin" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="el-icon-search" size="mini" @click="getList">搜索</el-button><el-button size="mini" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-row :gutter="10" class="mb8"><el-col :span="1.5"><el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd" v-hasPermi="['ai:agent:market:edit']">新增市场资源</el-button></el-col><el-col :span="1.5"><el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="!selectedRows.length" @click="removeSelected" v-hasPermi="['ai:agent:market:remove']">批量删除</el-button></el-col><right-toolbar :showSearch.sync="showSearch" @queryTable="getList" /></el-row>
    <el-table v-loading="loading" :data="list" @selection-change="selectedRows = $event">
      <el-table-column type="selection" width="55" />
      <el-table-column label="名称" prop="displayName" min-width="180" />
      <el-table-column label="类型" prop="assetType" width="100" />
      <el-table-column label="分类" prop="category" width="120" />
      <el-table-column label="版本" prop="version" width="100" />
      <el-table-column label="安装量" prop="installCount" width="100" />
      <el-table-column label="状态" width="90"><template slot-scope="scope"><el-switch v-model="scope.row.enabled" :active-value="1" :inactive-value="0" @change="save(scope.row)" /></template></el-table-column>
      <el-table-column label="操作" width="140"><template slot-scope="scope"><el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button><el-button type="text" size="mini" class="text-danger" @click="remove(scope.row)">删除</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />
    </div>
    <div v-show="activeTab === 'userResource'">
      <el-form :inline="true" size="small" :model="userResourceQuery">
        <el-form-item label="名称/用户"><el-input v-model="userResourceQuery.keyword" clearable placeholder="名称或用户" @keyup.enter.native="getUserResourceList" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="userResourceQuery.resourceType" clearable placeholder="全部"><el-option label="MCP" value="mcp" /><el-option label="Skill" value="skill" /></el-select></el-form-item>
        <el-form-item label="来源"><el-select v-model="userResourceQuery.sourceType" clearable placeholder="全部"><el-option label="市场" value="market" /><el-option label="用户上传" value="personal" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" icon="el-icon-search" size="mini" @click="getUserResourceList">搜索</el-button><el-button size="mini" @click="resetUserResource">重置</el-button></el-form-item>
      </el-form>
      <el-table v-loading="userResourceLoading" :data="userResourceList">
        <el-table-column label="名称" prop="display_name" min-width="180" />
        <el-table-column label="类型" prop="resource_type_label" width="90" />
        <el-table-column label="来源" width="100"><template slot-scope="scope"><el-tag :type="scope.row.source_type === 'market' ? 'success' : 'info'">{{ scope.row.source_label }}</el-tag></template></el-table-column>
        <el-table-column label="用户" prop="owner_name" width="150" />
        <el-table-column label="地址" prop="endpoint" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态" width="90"><template slot-scope="scope"><el-tag :type="scope.row.enabled ? 'success' : 'info'">{{ scope.row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column label="更新时间" prop="updated_at" width="170" />
        <el-table-column label="操作" width="130"><template slot-scope="scope"><template v-if="scope.row.resource_type === 'mcp'"><el-button type="text" size="mini" @click="openUserMcpEdit(scope.row)">编辑 JSON</el-button><el-button type="text" size="mini" class="text-danger" @click="removeUserMcp(scope.row)">删除</el-button></template><span v-else class="muted">只读</span></template></el-table-column>
      </el-table>
      <pagination v-show="userResourceTotal > 0" :total="userResourceTotal" :page.sync="userResourceQuery.pageNum" :limit.sync="userResourceQuery.pageSize" @pagination="getUserResourceList" />
    </div>
    <el-dialog title="编辑 MCP JSON" :visible.sync="userMcpDialogVisible" width="760px">
      <el-form :model="userMcpForm" label-width="90px">
        <el-form-item label="MCP JSON"><el-input v-model="userMcpForm.json" type="textarea" :rows="18" spellcheck="false" placeholder="请输入 mcpServers JSON 配置" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="userMcpForm.enabled" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="userMcpDialogVisible = false">取消</el-button><el-button type="primary" :loading="userMcpSaving" @click="saveUserMcp">保存</el-button></span>
    </el-dialog>
    <el-dialog :title="form.id ? '编辑市场资源' : '新增市场资源'" :visible.sync="dialogVisible" width="620px">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="资源 ID" prop="id"><el-input v-model="form.id" :disabled="Boolean(form.id)" placeholder="如 ppt-creator" /></el-form-item>
        <el-form-item label="类型" prop="assetType"><el-select v-model="form.assetType"><el-option label="Skill" value="skill" /><el-option label="MCP" value="mcp" /><el-option label="Plugin" value="plugin" /></el-select></el-form-item>
        <el-form-item label="显示名称" prop="displayName"><el-input v-model="form.displayName" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" /></el-form-item>
        <el-form-item label="版本"><el-input v-model="form.version" /></el-form-item>
        <el-form-item label="内容文件"><el-upload action="#" :auto-upload="false" :show-file-list="true" :on-change="selectFile"><el-button size="small">选择 SKILL.md / 配置文件</el-button></el-upload><span class="form-tip">保存元数据后才能上传文件，文件会进入 S3/R2。</span></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import { listAgentMarket, listAgentUserResources, getAgentUserMcp, updateAgentUserMcp, deleteAgentUserMcp, saveAgentMarket, deleteAgentMarket, uploadAgentMarket } from '@/api/ai/agentMarket'
export default {
  name: 'AgentMarket',
  data() { return { activeTab: 'market', loading: false, userResourceLoading: false, saving: false, userMcpSaving: false, userMcpDialogVisible: false, showSearch: true, list: [], total: 0, selectedRows: [], userResourceList: [], userResourceTotal: 0, dialogVisible: false, selectedFile: null, userMcpForm: {}, queryParams: { pageNum: 1, pageSize: 20, displayName: undefined, assetType: undefined }, userResourceQuery: { pageNum: 1, pageSize: 20, keyword: undefined, resourceType: undefined, sourceType: undefined }, form: {}, rules: { id: [{ required: true, message: '请输入资源 ID', trigger: 'blur' }], assetType: [{ required: true, message: '请选择类型', trigger: 'change' }], displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }] } } },
  created() { this.getList() },
  methods: {
    getList() { this.loading = true; listAgentMarket(this.queryParams).then(res => { this.list = res.rows || []; this.total = res.total || 0 }).finally(() => { this.loading = false }) },
    getUserResourceList() { this.userResourceLoading = true; listAgentUserResources(this.userResourceQuery).then(res => { this.userResourceList = res.rows || []; this.userResourceTotal = res.total || 0 }).finally(() => { this.userResourceLoading = false }) },
    async openUserMcpEdit(row) { this.userMcpSaving = true; try { const detail = await getAgentUserMcp(row.id); this.userMcpForm = { id: row.id, json: JSON.stringify(detail.config || {}, null, 2), enabled: Boolean(detail.enabled) }; this.userMcpDialogVisible = true } finally { this.userMcpSaving = false } },
    saveUserMcp() { let config; try { config = JSON.parse(this.userMcpForm.json) } catch (e) { this.$modal.msgError('MCP JSON 格式不正确'); return } this.userMcpSaving = true; updateAgentUserMcp(this.userMcpForm.id, { config, enabled: this.userMcpForm.enabled }).then(() => { this.$modal.msgSuccess('用户 MCP 已更新'); this.userMcpDialogVisible = false; this.getUserMcpList() }).finally(() => { this.userMcpSaving = false }) },
    removeUserMcp(row) { this.$modal.confirm(`确认删除用户“${row.owner_name}”的 MCP“${row.display_name}”吗？删除只影响该用户配置，不影响市场资源。`).then(() => deleteAgentUserMcp(row.id)).then(() => { this.$modal.msgSuccess('用户 MCP 已删除'); this.getUserMcpList() }) },
    handleTabChange(tab) { if (tab.name === 'userResource' && !this.userResourceList.length) this.getUserResourceList() },
    resetUserResource() { this.userResourceQuery.pageNum = 1; this.userResourceQuery.keyword = undefined; this.userResourceQuery.resourceType = undefined; this.userResourceQuery.sourceType = undefined; this.getUserResourceList() },
    reset() { this.queryParams.pageNum = 1; this.queryParams.displayName = undefined; this.queryParams.assetType = undefined; this.getList() },
    openAdd() { this.form = { assetType: 'skill', version: '1.0.0', enabled: 1 }; this.selectedFile = null; this.dialogVisible = true },
    openEdit(row) { this.form = { ...row }; this.selectedFile = null; this.dialogVisible = true },
    selectFile(file) { this.selectedFile = file.raw },
    save(row) { saveAgentMarket(row).then(() => this.$modal.msgSuccess('状态已更新')) },
    submit() { this.$refs.form.validate(async valid => { if (!valid) return; this.saving = true; try { await saveAgentMarket(this.form); if (this.selectedFile) await uploadAgentMarket(this.selectedFile, this.form.assetType, this.form.id); this.$modal.msgSuccess('保存成功'); this.dialogVisible = false; this.getList() } finally { this.saving = false } }) },
    remove(row) { this.removeRows([row]) },
    removeSelected() { this.removeRows(this.selectedRows) },
    removeRows(rows) { const names = rows.map(row => row.displayName).join('、'); this.$modal.confirm(`确认删除市场资源“${names}”吗？同时会删除所有用户已安装的该资源及绑定。`).then(() => deleteAgentMarket(rows.map(row => row.id))).then(() => { this.$modal.msgSuccess('删除成功'); this.selectedRows = []; this.getList() }) }
  }
}
</script>

<style scoped>.form-tip{margin-left:10px;color:#909399;font-size:12px}.text-danger{color:#f56c6c}.muted{color:#c0c4cc}</style>
