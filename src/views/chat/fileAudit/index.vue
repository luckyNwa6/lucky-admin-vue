<template>
  <div class="app-container">
    <div class="page-heading">
      <div>
        <div class="page-title">RAG 文件治理</div>
        <div class="page-description">扫描 RAG 对话产生的文件，识别未被引用的临时文件和孤儿文件。</div>
      </div>
      <el-button type="primary" icon="el-icon-refresh" size="mini" :loading="loading" @click="load">重新扫描</el-button>
    </div>

    <el-alert
      title="治理规则：已被对话引用的文件不会出现在候选列表中；删除操作只处理当前选中的未引用文件。"
      type="info"
      show-icon
      :closable="false"
      class="audit-notice"
    />

    <div class="audit-metrics">
      <div class="metric-card">
        <div class="metric-label">文件总数</div>
        <div class="metric-value">{{ info.totalFiles || 0 }}</div>
        <div class="metric-hint">RAG 文件目录中的全部文件</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">占用空间</div>
        <div class="metric-value">{{ formatSize(info.totalBytes) }}</div>
        <div class="metric-hint">全部文件大小合计</div>
      </div>
      <div class="metric-card success">
        <div class="metric-label">已被引用</div>
        <div class="metric-value">{{ info.referencedFiles || 0 }}</div>
        <div class="metric-hint">受保护，不会进入删除候选</div>
      </div>
      <div class="metric-card warning">
        <div class="metric-label">临时文件</div>
        <div class="metric-value">{{ info.temporaryFiles || 0 }}</div>
        <div class="metric-hint">未绑定到对话的临时文件</div>
      </div>
      <div class="metric-card danger">
        <div class="metric-label">孤儿候选</div>
        <div class="metric-value">{{ info.orphanFiles || 0 }}</div>
        <div class="metric-hint">未引用且未登记的文件</div>
      </div>
    </div>

    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" class="audit-query">
      <el-form-item label="文件路径" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="请输入文件路径" clearable style="width: 260px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="治理状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 180px">
          <el-option label="全部候选" value="" />
          <el-option label="临时文件" value="TEMPORARY" />
          <el-option label="临时文件（已过期）" value="TEMPORARY_EXPIRED" />
          <el-option label="孤儿文件" value="ORPHAN" />
        </el-select>
      </el-form-item>
      <el-form-item label="过期阈值">
        <el-input-number v-model="staleHours" :min="1" :max="8760" :step="1" controls-position="right" size="small" />
        <span class="unit-hint">小时</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">筛选</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-refresh" size="mini" :loading="loading" @click="load">扫描文件</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="selected.length === 0" @click="remove">
          删除选中
        </el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="load"></right-toolbar>
    </el-row>

    <div class="table-heading">
      <span class="table-title">可治理文件</span>
      <span class="table-description">仅展示未被对话引用的文件，共 {{ filteredItems.length }} 个候选</span>
    </div>
    <el-table :data="filteredItems" @selection-change="selected = $event" v-loading="loading" empty-text="暂无可治理文件">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="治理状态" width="170" align="center">
        <template slot-scope="scope">
          <el-tag :type="statusType(scope.row.status)" size="small">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="文件路径" prop="relativePath" min-width="300" show-overflow-tooltip />
      <el-table-column label="大小" width="120" align="right">
        <template slot-scope="scope">{{ formatSize(scope.row.size) }}</template>
      </el-table-column>
      <el-table-column label="最后修改时间" width="180" align="center">
        <template slot-scope="scope">{{ formatDate(scope.row.lastModified) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { scanRagFiles, deleteRagFiles } from '@/api/ai/fileAudit'
export default {
  name: 'RagFileAudit',
  data() {
    return {
      loading: false,
      items: [],
      selected: [],
      info: {},
      showSearch: true,
      staleHours: 24,
      queryParams: { keyword: '', status: '' },
    }
  },
  computed: {
    filteredItems() {
      const keyword = (this.queryParams.keyword || '').trim().toLowerCase()
      return this.items.filter(item => {
        const matchesKeyword = !keyword || (item.relativePath || '').toLowerCase().includes(keyword)
        const matchesStatus = !this.queryParams.status || item.status === this.queryParams.status
        return matchesKeyword && matchesStatus
      })
    },
  },
  created() { this.load() },
  methods: {
    load() {
      this.loading = true
      this.selected = []
      scanRagFiles(this.staleHours)
        .then(r => {
          this.info = r.data || {}
          this.items = this.info.items || []
        })
        .finally(() => { this.loading = false })
    },
    handleQuery() {
      this.selected = []
    },
    resetQuery() {
      this.queryParams.keyword = ''
      this.queryParams.status = ''
      this.selected = []
    },
    remove() {
      this.$confirm(`确定删除选中的 ${this.selected.length} 个文件吗？已被引用的文件不会被删除。`, '删除文件', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => deleteRagFiles({ urls: this.selected.map(x => x.url) }))
        .then(res => {
          this.$modal.msgSuccess(`删除完成，共删除 ${res.data && res.data.deleted ? res.data.deleted : 0} 个文件`)
          this.load()
        })
        .catch(() => {})
    },
    statusLabel(status) {
      return { TEMPORARY: '临时文件', TEMPORARY_EXPIRED: '临时文件（已过期）', ORPHAN: '孤儿文件' }[status] || status || '未知'
    },
    statusType(status) {
      return { TEMPORARY: 'info', TEMPORARY_EXPIRED: 'warning', ORPHAN: 'danger' }[status] || 'info'
    },
    formatSize(value) {
      const size = Number(value) || 0
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
      return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
    },
    formatDate(value) { return value ? new Date(value).toLocaleString() : '-' },
  },
}
</script>

<style scoped>
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.page-description,
.metric-hint,
.table-description {
  color: #909399;
  font-size: 12px;
}

.page-description {
  margin-top: 6px;
}

.audit-notice {
  margin-bottom: 16px;
}

.audit-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.metric-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
}

.metric-card.success { border-top: 3px solid #67c23a; }
.metric-card.warning { border-top: 3px solid #e6a23c; }
.metric-card.danger { border-top: 3px solid #f56c6c; }

.metric-label {
  color: #606266;
  font-size: 13px;
}

.metric-value {
  margin: 8px 0 4px;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.unit-hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.table-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 18px 0 10px;
}

.table-title {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .audit-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .audit-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
