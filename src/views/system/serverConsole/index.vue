<template>
  <div class="app-container server-console-page">
    <div class="page-heading">
      <div>
        <div class="page-title">服务日志控制台</div>
        <div class="page-description">查看云服务器上 Lucky Admin 和 Lucky RAG 的运行状态与日志。</div>
      </div>
      <el-button type="primary" icon="el-icon-refresh" size="mini" :loading="overviewLoading" @click="loadOverview">刷新状态</el-button>
    </div>

    <div class="service-cards" v-loading="overviewLoading">
      <div v-for="service in services" :key="service.key" class="service-card" :class="service.running ? 'is-online' : 'is-offline'">
        <div class="service-card-header">
          <div>
            <span class="service-name">{{ service.name }}</span>
            <el-tag size="mini" :type="service.running && service.healthCode >= 200 && service.healthCode < 400 ? 'success' : 'danger'">
              {{ service.running ? '运行中' : '未运行' }}
            </el-tag>
          </div>
          <i :class="service.key === 'rag' ? 'el-icon-cpu' : 'el-icon-s-platform'" class="service-icon"></i>
        </div>
        <div class="service-meta">
          <span>端口 {{ service.port }}</span>
          <span>PID {{ service.pid || '-' }}</span>
          <span>健康 {{ service.healthCode || '失败' }}</span>
        </div>
        <div class="service-foot">日志 {{ service.logAvailable ? formatSize(service.logSize) : '不可用' }} · {{ formatDate(service.logUpdatedAt) }}</div>
      </div>
    </div>

    <el-card shadow="never" class="log-card">
      <div slot="header" class="log-card-header">
        <div>
          <span class="card-title">日志查询</span>
          <span class="card-hint">只读查看，不会修改服务器日志</span>
        </div>
        <el-switch v-model="autoRefresh" active-text="自动刷新" @change="handleAutoRefresh" />
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

      <el-table :data="logs" v-loading="logsLoading" height="520" class="log-table" empty-text="暂无匹配日志" @row-click="showLogDetail">
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
      logFiles: [],
      logs: [],
      totalMatched: 0,
      logDetailVisible: false,
      selectedLog: {},
      autoRefresh: false,
      refreshTimer: null,
      queryParams: {
        service: 'rag',
        source: 'runtime',
        fileName: '',
        keyword: '',
        level: '',
        limit: 200,
      },
    }
  },
  computed: {
    currentLogTitle() {
      const service = this.queryParams.service === 'admin' ? 'Lucky Admin' : 'Lucky RAG'
      const source = this.queryParams.source === 'business' ? '业务日志' : '运行日志'
      return `${service} · ${source}${this.queryParams.fileName ? ` · ${this.queryParams.fileName}` : ''}`
    },
  },
  created() {
    this.loadOverview()
    this.loadLogFiles()
    this.loadLogs()
  },
  beforeDestroy() {
    this.clearRefreshTimer()
  },
  methods: {
    async loadOverview() {
      this.overviewLoading = true
      try {
        const res = await getServerOverview()
        if (res.code === 200) this.services = res.data.services || []
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
    handleAutoRefresh(enabled) {
      this.clearRefreshTimer()
      if (enabled) this.refreshTimer = setInterval(() => { this.loadOverview(); this.loadLogs() }, 10000)
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
    },
  },
}
</script>

<style scoped>
.page-heading, .service-card-header, .log-card-header, .log-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-heading { margin-bottom: 16px; }
.page-title { color: #303133; font-size: 20px; font-weight: 600; }
.page-description, .card-hint { color: #909399; font-size: 12px; }
.page-description { margin-top: 6px; }
.service-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.service-card { padding: 18px 20px; border: 1px solid #ebeef5; border-left: 4px solid #67c23a; border-radius: 4px; background: #fff; }
.service-card.is-offline { border-left-color: #f56c6c; }
.service-name { margin-right: 10px; color: #303133; font-size: 16px; font-weight: 600; }
.service-icon { color: #409eff; font-size: 28px; }
.service-meta, .service-foot { display: flex; gap: 18px; color: #606266; font-size: 13px; }
.service-meta { margin-top: 18px; }
.service-foot { margin-top: 12px; color: #909399; font-size: 12px; }
.log-card { border: 1px solid #ebeef5; }
.card-title { margin-right: 12px; color: #303133; font-size: 15px; font-weight: 600; }
.query-form { padding-top: 4px; }
.log-summary { margin: 4px 0 10px; color: #606266; font-size: 13px; }
.summary-right { color: #909399; font-size: 12px; }
.log-alert { margin: 4px 0 10px; }
.log-state-hint { padding: 12px 16px; margin-bottom: 10px; color: #909399; font-size: 13px; background: #f8f9fb; border: 1px dashed #dcdfe6; border-radius: 4px; }
.log-message { white-space: pre-wrap; word-break: break-all; font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; }
.log-table >>> .el-table__row { cursor: pointer; }
.log-detail-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; color: #606266; font-size: 13px; }
.log-detail-message { padding: 14px 16px; margin: 0; color: #303133; white-space: pre-wrap; word-break: break-all; font-family: Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; background: #f8f9fb; border: 1px solid #ebeef5; border-radius: 4px; }
.file-option-meta { float: right; color: #909399; font-size: 12px; }
@media (max-width: 900px) { .service-cards { grid-template-columns: 1fr; } }
</style>
