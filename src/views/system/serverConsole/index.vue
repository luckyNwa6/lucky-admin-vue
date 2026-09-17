<template>
  <div class="app-container server-console-page">
    <div class="page-heading">
      <div>
        <div class="page-title">服务日志控制台</div>
        <div class="page-description">查看云服务器上 Lucky Admin 和 Lucky RAG 的运行状态与日志。</div>
      </div>
      <el-button type="primary" icon="el-icon-refresh" size="mini" :loading="overviewLoading" @click="loadOverview">刷新状态</el-button>
    </div>

    <div v-loading="overviewLoading" class="health-overview">
      <div class="health-overview-main">
        <div class="health-overview-kicker">运行状态</div>
        <div class="health-overview-title">服务器与依赖</div>
        <div class="health-overview-meta">
          <span class="health-overview-count"><i class="health-dot" :class="healthTotal && healthyCount === healthTotal ? 'is-good' : 'is-muted'" />{{ healthyCount }}/{{ healthTotal || 4 }} 项正常</span>
          <span>更新于 {{ formatDate(checkedAt) }}</span>
        </div>
      </div>
      <div class="health-overview-actions">
        <el-tag size="mini" :type="healthTotal && healthyCount === healthTotal ? 'success' : 'warning'">{{ healthStatusText }}</el-tag>
        <el-button type="text" size="small" @click="healthDialogVisible = true">查看详情 <i class="el-icon-arrow-right" /></el-button>
      </div>
    </div>

    <el-card shadow="never" class="log-card">
      <div slot="header" class="log-card-header">
        <div>
          <span class="card-title">日志查询</span>
          <span class="card-hint">只读查看，不会修改服务器日志</span>
        </div>
        <el-switch v-model="autoRefresh" active-text="自动刷新（10秒）" @change="handleAutoRefresh" />
      </div>

      <el-form :model="queryParams" size="small" :inline="true" class="query-form" @submit.native.prevent>
        <el-form-item label="服务">
          <el-select v-model="queryParams.service" style="width: 150px" @change="handleServiceChange">
            <el-option label="Lucky Admin" value="admin" />
            <el-option label="Lucky RAG" value="rag" />
          </el-select>
        </el-form-item>
        <el-form-item label="日志来源">
          <el-select v-model="queryParams.source" style="width: 150px" @change="handleSourceChange">
            <el-option label="运行日志" value="runtime" />
            <el-option v-if="queryParams.service === 'rag'" label="业务日志" value="business" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="queryParams.source === 'business'" label="日志文件">
          <el-select v-model="queryParams.fileName" clearable style="width: 280px" placeholder="选择日志文件" @change="loadLogs">
            <el-option v-for="file in logFiles" :key="file.name" :label="file.name" :value="file.name">
              <span>{{ file.name }}</span>
              <span class="file-option-meta">{{ formatSize(file.size) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="queryParams.keyword" clearable placeholder="搜索日志内容" style="width: 220px" @keyup.enter.native="loadLogs" />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="queryParams.level" clearable placeholder="全部" style="width: 120px">
            <el-option label="DEBUG" value="DEBUG" />
            <el-option label="INFO" value="INFO" />
            <el-option label="WARN" value="WARN" />
            <el-option label="ERROR" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="loadLogs">查询日志</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="log-summary">
        <span>{{ currentLogTitle }}</span>
        <span class="summary-right">匹配 {{ totalMatched }} 条，显示最近 {{ logs.length }} 条 · 点击日志行查看完整内容</span>
      </div>

      <el-alert v-if="logsError" class="log-alert" type="error" :title="logsError" show-icon :closable="false" />
      <div v-else-if="logsLoading && !logs.length" class="log-state-hint">正在读取日志，请稍候…</div>
      <div v-else-if="!logsLoading && !logs.length" class="log-state-hint">没有找到符合条件的日志，请清空关键字或切换日志来源。</div>

      <el-table v-loading="logsLoading" :data="logs" height="calc(100vh - 360px)" class="log-table" empty-text="暂无匹配日志">
        <el-table-column prop="timestamp" label="时间" width="190" />
        <el-table-column label="级别" width="90" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="levelType(scope.row.level)">{{ scope.row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lineNo" label="行号" width="80" align="right" />
        <el-table-column label="日志内容" min-width="500" show-overflow-tooltip>
          <template slot-scope="scope"><span class="log-message">{{ scope.row.message }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="72" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click.stop="showLogDetail(scope.row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog title="日志详情" :visible.sync="logDetailVisible" width="760px" append-to-body>
      <div class="log-detail-meta">
        <el-tag size="mini" :type="levelType(selectedLog.level)">{{ selectedLog.level || '-' }}</el-tag>
        <span>{{ selectedLog.timestamp || '-' }}</span>
        <span>行号 {{ selectedLog.lineNo || '-' }}</span>
      </div>
      <pre class="log-detail-message">{{ selectedLog.message || '暂无日志内容' }}</pre>
    </el-dialog>

    <el-dialog title="运行状态详情" :visible.sync="healthDialogVisible" width="820px" append-to-body>
      <div class="health-dialog-caption">服务和基础依赖共 {{ healthTotal || 4 }} 项，状态每 10 秒自动更新。</div>
      <div class="health-group-title">服务</div>
      <div class="health-detail-grid">
        <div v-for="service in services" :key="service.key" class="service-card" :class="serviceIsHealthy(service) ? 'is-online' : 'is-offline'">
          <div class="service-card-header">
            <div>
              <span class="service-name">{{ service.name }}</span>
              <el-tag size="mini" :type="serviceIsHealthy(service) ? 'success' : 'danger'">{{ service.running ? '运行中' : '未运行' }}</el-tag>
            </div>
            <i :class="service.key === 'rag' ? 'el-icon-cpu' : 'el-icon-s-platform'" class="service-icon" />
          </div>
          <div class="service-meta"><span>端口 {{ service.port }}</span><span>PID {{ service.pid || '-' }}</span><span>健康 {{ service.healthCode || '失败' }}</span></div>
          <div class="service-foot">日志 {{ service.logAvailable ? formatSize(service.logSize) : '不可用' }} · {{ formatDate(service.logUpdatedAt) }}</div>
        </div>
      </div>
      <div class="health-group-title">依赖</div>
      <div class="health-detail-grid">
        <div v-for="dependency in dependencies" :key="dependency.key" class="service-card" :class="dependency.healthy ? 'is-online' : 'is-offline'">
          <div class="service-card-header">
            <div>
              <span class="service-name">{{ dependency.name }}</span>
              <el-tag size="mini" :type="dependency.healthy ? 'success' : 'danger'">{{ dependency.healthy ? '正常' : '异常' }}</el-tag>
            </div>
            <i :class="dependency.key === 'redis' ? 'el-icon-connection' : 'el-icon-coin'" class="service-icon" />
          </div>
          <div class="service-meta"><span>{{ dependency.message }}</span><span>响应 {{ dependency.latencyMs == null ? '-' : `${dependency.latencyMs} ms` }}</span></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getServerOverview, getServerLogFiles, searchServerLogs } from '@/api/system/serverConsole'

export default {
  name: 'ServerConsole',
  data() {
    return {
      overviewLoading: false,
      logsLoading: false,
      logsError: '',
      logsRequestId: 0,
      services: [],
      dependencies: [],
      checkedAt: '',
      logFiles: [],
      logs: [],
      totalMatched: 0,
      logDetailVisible: false,
      healthDialogVisible: false,
      selectedLog: {},
      autoRefresh: true,
      refreshTimer: null,
      queryParams: {
        service: 'rag',
        source: 'runtime',
        fileName: '',
        keyword: '',
        level: '',
        limit: 200
      }
    }
  },
  computed: {
    healthTotal() {
      return this.services.length + this.dependencies.length
    },
    healthyCount() {
      return this.services.filter(this.serviceIsHealthy).length + this.dependencies.filter(item => item.healthy).length
    },
    healthStatusText() {
      if (!this.healthTotal) return '检查中'
      return this.healthyCount === this.healthTotal ? '全部正常' : '存在异常'
    },
    currentLogTitle() {
      const service = this.queryParams.service === 'admin' ? 'Lucky Admin' : 'Lucky RAG'
      const source = this.queryParams.source === 'business' ? '业务日志' : '运行日志'
      return `${service} · ${source}${this.queryParams.fileName ? ` · ${this.queryParams.fileName}` : ''}`
    }
  },
  created() {
    this.loadOverview()
    this.loadLogFiles()
    this.loadLogs()
    this.handleAutoRefresh(true)
  },
  beforeDestroy() {
    this.clearRefreshTimer()
  },
  methods: {
    async loadOverview() {
      this.overviewLoading = true
      try {
        const res = await getServerOverview()
        if (res.code === 200) {
          this.checkedAt = res.data.checkedAt || ''
          this.services = res.data.services || []
          this.dependencies = res.data.dependencies || []
        }
      } finally {
        this.overviewLoading = false
      }
    },
    async loadLogFiles() {
      const res = await getServerLogFiles(this.queryParams.service, this.queryParams.source)
      if (res.code === 200) this.logFiles = res.data.files || []
    },
    async loadLogs() {
      const requestId = ++this.logsRequestId
      this.logsLoading = true
      this.logsError = ''
      try {
        const res = await searchServerLogs(this.queryParams)
        if (requestId !== this.logsRequestId) return
        if (res.code === 200) {
          this.logs = res.data.lines || []
          this.totalMatched = res.data.totalMatched || 0
        } else {
          this.logs = []
          this.totalMatched = 0
          this.logsError = res.msg || '日志读取失败，请稍后重试'
        }
      } catch (error) {
        if (requestId !== this.logsRequestId) return
        this.logs = []
        this.totalMatched = 0
        this.logsError = error.message || '日志读取失败，请稍后重试'
      } finally {
        if (requestId === this.logsRequestId) this.logsLoading = false
      }
    },
    handleServiceChange() {
      if (this.queryParams.service === 'admin') this.queryParams.source = 'runtime'
      this.queryParams.fileName = ''
      this.loadLogFiles()
      this.loadLogs()
    },
    handleSourceChange() {
      this.queryParams.fileName = ''
      this.loadLogFiles()
      this.loadLogs()
    },
    resetQuery() {
      this.queryParams.keyword = ''
      this.queryParams.level = ''
      this.queryParams.fileName = ''
      this.loadLogs()
    },
    showLogDetail(row) {
      this.selectedLog = row
      this.logDetailVisible = true
    },
    serviceIsHealthy(service) {
      return Boolean(service.running && service.healthCode >= 200 && service.healthCode < 400)
    },
    handleAutoRefresh(enabled) {
      this.clearRefreshTimer()
      if (enabled) {
        this.refreshTimer = setInterval(() => {
          this.loadOverview()
          this.loadLogs()
        }, 10000)
      }
    },
    clearRefreshTimer() {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
      this.refreshTimer = null
    },
    levelType(level) {
      return { ERROR: 'danger', WARN: 'warning', DEBUG: 'info', TRACE: 'info' }[level] || 'success'
    },
    formatSize(value) {
      const size = Number(value) || 0
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
      return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
    },
    formatDate(value) {
      return value ? new Date(value).toLocaleString() : '-'
    }
  }
}
</script>

<style scoped>
.page-heading, .service-card-header, .log-card-header, .log-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-heading { margin-bottom: 10px; }
.page-title { color: #303133; font-size: 20px; font-weight: 600; }
.page-description, .card-hint { color: #909399; font-size: 12px; }
.page-description { margin-top: 6px; }
.health-overview { display: flex; align-items: center; justify-content: space-between; min-height: 64px; padding: 10px 14px; margin-bottom: 12px; border: 1px solid #dfe6ef; border-left: 3px solid #409eff; border-radius: 6px; background: linear-gradient(110deg, #f7fbff 0%, #fff 62%); }
.health-overview-main { min-width: 0; }
.health-overview-kicker { color: #909399; font-size: 11px; letter-spacing: .08em; }
.health-overview-title { margin-top: 1px; color: #303133; font-size: 16px; font-weight: 600; }
.health-overview-meta { display: flex; gap: 16px; margin-top: 5px; color: #909399; font-size: 12px; }
.health-overview-count { color: #606266; }
.health-dot { display: inline-block; width: 6px; height: 6px; margin-right: 6px; vertical-align: 1px; border-radius: 50%; background: #c0c4cc; }
.health-dot.is-good { background: #67c23a; box-shadow: 0 0 0 3px rgba(103, 194, 58, .13); }
.health-overview-actions { display: flex; align-items: center; gap: 10px; margin-left: 16px; }
.health-overview-actions >>> .el-button { padding-right: 0; }
.service-card { padding: 11px 14px; border: 1px solid #ebeef5; border-left: 3px solid #67c23a; border-radius: 4px; background: #fff; }
.service-card.is-offline { border-left-color: #f56c6c; }
.service-name { margin-right: 8px; color: #303133; font-size: 15px; font-weight: 600; }
.service-icon { color: #409eff; font-size: 20px; }
.service-meta, .service-foot { display: flex; gap: 14px; color: #606266; font-size: 12px; }
.service-meta { margin-top: 8px; }
.service-foot { margin-top: 6px; color: #909399; font-size: 11px; }
.health-dialog-caption { margin: -4px 0 14px; color: #909399; font-size: 12px; }
.health-group-title { padding-left: 8px; margin: 12px 0 8px; color: #606266; font-size: 13px; font-weight: 600; border-left: 2px solid #409eff; }
.health-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.log-card { border: 1px solid #ebeef5; }
.log-card >>> .el-card__header { padding: 11px 16px; }
.log-card >>> .el-card__body { padding: 10px 16px 12px; }
.card-title { margin-right: 12px; color: #303133; font-size: 15px; font-weight: 600; }
.query-form { padding-top: 0; }
.query-form >>> .el-form-item { margin-bottom: 8px; }
.log-summary { margin: 4px 0 10px; color: #606266; font-size: 13px; }
.summary-right { color: #909399; font-size: 12px; }
.log-alert { margin: 4px 0 10px; }
.log-state-hint { padding: 12px 16px; margin-bottom: 10px; color: #909399; font-size: 13px; background: #f8f9fb; border: 1px dashed #dcdfe6; border-radius: 4px; }
.log-message { white-space: pre-wrap; word-break: break-all; font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; }
.log-table >>> th, .log-table >>> td { padding: 6px 0; }
.log-table >>> .el-table__row { cursor: default; }
.log-detail-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; color: #606266; font-size: 13px; }
.log-detail-message { padding: 14px 16px; margin: 0; color: #303133; white-space: pre-wrap; word-break: break-all; font-family: Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; background: #f8f9fb; border: 1px solid #ebeef5; border-radius: 4px; }
.file-option-meta { float: right; color: #909399; font-size: 12px; }
@media (max-width: 1100px) {
  .log-table >>> .el-table__body-wrapper { overflow-x: auto; }
}
@media (max-width: 900px) {
  .page-heading, .log-card-header, .log-summary, .health-overview { align-items: flex-start; flex-direction: column; gap: 6px; }
  .health-overview-actions { width: 100%; justify-content: space-between; margin-left: 0; }
  .health-detail-grid { grid-template-columns: 1fr; }
  .query-form >>> .el-form-item { margin-right: 8px; }
  .summary-right { white-space: normal; }
}
</style>
