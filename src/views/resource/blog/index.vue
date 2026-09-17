<template>
  <div class="blog-container">
    <!-- 查询条件 -->
    <el-form :model="searchParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
      <el-form-item label="文件名" prop="keyword">
        <el-input
          v-model="searchParams.keyword"
          placeholder="请输入文件名"
          clearable
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter.native="handleSearch"
        />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="searchParams.category" placeholder="请选择分类" clearable style="width: 240px">
          <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleSearch">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-refresh" size="mini" :loading="syncLoading || syncRunning" @click="handleSync">
          同步博客
        </el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="loadPosts"></right-toolbar>
    </el-row>

    <!-- 统计信息 -->
    <div class="stats">
      <span>
        共
        <strong>{{ total }}</strong>
        篇博客
      </span>
    </div>

    <!-- 同步进度 -->
    <div v-if="syncRunning" class="sync-progress">
      <div class="sync-progress-info">
        <span>{{ syncProgress.stage || '同步中...' }}</span>
        <span>
          {{ syncProgress.processed }}/{{ syncProgress.total }} · 新增 {{ syncProgress.uploaded }} · 更新 {{ syncProgress.updated }} · 删除
          {{ syncProgress.deleted }} · 跳过 {{ syncProgress.skipped }} · 失败 {{ syncProgress.failed }}
        </span>
      </div>
      <el-progress :percentage="syncPercent" :stroke-width="10" />
    </div>

    <!-- 博客列表 -->
    <el-table :data="posts" v-loading="loading" style="width: 100%">
      <el-table-column prop="fileName" label="文件名" min-width="240" show-overflow-tooltip />
      <el-table-column prop="version" label="版本" width="80" align="center" />
      <el-table-column label="分类" width="170" align="center">
        <template slot-scope="scope">
          <el-tag size="small" effect="plain">{{ scope.row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="100" align="center">
        <template slot-scope="scope">
          {{ formatSize(scope.row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column label="最近同步" width="170" align="center">
        <template slot-scope="scope">
          {{ formatTime(scope.row.lastSyncTime) }}
        </template>
      </el-table-column>
      <el-table-column label="云存储URL" min-width="170" show-overflow-tooltip>
        <template slot-scope="scope">
          <span style="color: #909399; font-size: 12px">{{ scope.row.fileUrl }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="small" icon="el-icon-view" @click="handlePreview(scope.row)">预览</el-button>
          <el-button type="text" size="small" icon="el-icon-link" @click="openUrl(scope.row)">打开</el-button>
          <el-button type="text" size="small" icon="el-icon-link" @click="copyUrl(scope.row)">复制链接</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="searchParams.page"
      :limit.sync="searchParams.limit"
      :page-sizes="[20, 50, 100]"
      @pagination="loadPosts"
    />

    <!-- 预览弹窗 -->
    <el-dialog :visible.sync="previewVisible" :title="previewTitle" width="88%" top="4vh" append-to-body custom-class="preview-dialog">
      <div class="preview-container" v-loading="previewLoading">
        <div v-if="markdownContent" ref="previewContent" class="markdown-preview" v-html="markdownContent"></div>
        <div v-else class="preview-empty">
          <i class="el-icon-document" style="font-size: 48px; color: #c0c4cc"></i>
          <p>暂无内容</p>
        </div>
      </div>
    </el-dialog>

    <!-- 同步结果弹窗 -->
    <el-dialog :visible.sync="syncResultVisible" title="同步结果" width="520px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="总文件数">{{ syncResult.total || 0 }}</el-descriptions-item>
        <el-descriptions-item label="新增">{{ syncResult.uploaded || 0 }}</el-descriptions-item>
        <el-descriptions-item label="更新">{{ syncResult.updated || 0 }}</el-descriptions-item>
        <el-descriptions-item label="跳过">{{ syncResult.skipped || 0 }}</el-descriptions-item>
        <el-descriptions-item label="删除">{{ syncResult.deleted || 0 }}</el-descriptions-item>
        <el-descriptions-item label="失败">{{ syncResult.failed || 0 }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="syncResult.errors && syncResult.errors.length" class="sync-errors">
        <div class="sync-errors-title">失败明细</div>
        <div v-for="(error, index) in syncResult.errors" :key="index" class="sync-error-item">
          {{ error }}
        </div>
      </div>
      <div slot="footer">
        <el-button type="primary" @click="syncResultVisible = false">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { listBlogPosts, listBlogCategories, syncBlogPosts, getBlogSyncStatus, previewBlogPost } from '@/api/bed/blog'

export default {
  name: 'BlogPost',
  data() {
    return {
      searchParams: {
        keyword: '',
        category: '',
        page: 1,
        limit: 20,
      },
      showSearch: true,
      posts: [],
      categories: [],
      total: 0,
      loading: false,
      previewVisible: false,
      previewLoading: false,
      previewTitle: '',
      markdownContent: '',
      syncLoading: false,
      syncResultVisible: false,
      syncResult: {},
      syncRunning: false,
      syncProgress: {
        total: 0,
        processed: 0,
        deleted: 0,
        uploaded: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        stage: '',
      },
      syncPolling: false,
      syncPollTimer: null,
    }
  },
  created() {
    this.loadPosts()
    this.loadCategories()
    this.checkSyncStatus()
  },
  beforeDestroy() {
    this.stopSyncPolling()
  },
  computed: {
    syncPercent() {
      const total = this.syncProgress.total
      if (!total) return 0
      return Math.min(100, Math.round((this.syncProgress.processed / total) * 100))
    },
  },
  methods: {
    handleSearch() {
      this.searchParams.page = 1
      this.loadPosts()
    },
    resetSearch() {
      this.searchParams.keyword = ''
      this.searchParams.category = ''
      this.handleSearch()
    },
    async loadPosts() {
      this.loading = true
      try {
        const res = await listBlogPosts(this.searchParams)
        if (res.code === 200) {
          this.posts = res.data.rows || []
          this.total = res.data.total || 0
        } else {
          this.$message.error(res.msg || '查询失败')
        }
      } catch (error) {
        console.error('加载博客列表失败:', error)
        this.$message.error('加载博客列表失败')
      } finally {
        this.loading = false
      }
    },
    async loadCategories() {
      try {
        const res = await listBlogCategories()
        if (res.code === 200) {
          this.categories = res.data || []
        }
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    },
    handlePageChange(page) {
      this.searchParams.page = page
      this.loadPosts()
    },
    handleSizeChange(limit) {
      this.searchParams.limit = limit
      this.searchParams.page = 1
      this.loadPosts()
    },
    async handleSync() {
      if (this.syncRunning) {
        this.$message.warning('同步正在进行中')
        return
      }
      this.syncLoading = true
      this.syncProgress = {
        total: 0,
        processed: 0,
        deleted: 0,
        uploaded: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        stage: '',
      }
      try {
        const res = await syncBlogPosts()
        if (res.code === 200) {
          this.$message.success(res.msg || '同步完成')
          this.syncRunning = true
          this.syncPolling = true
          this.startSyncPolling()
          this.checkSyncStatus()
        } else {
          this.$message.error(res.msg || '同步启动失败')
        }
      } catch (error) {
        console.error('启动同步博客失败:', error)
        this.$message.error('启动同步博客失败')
      } finally {
        this.syncLoading = false
      }
    },
    startSyncPolling() {
      this.stopSyncPolling()
      this.syncPollTimer = setInterval(() => this.checkSyncStatus(), 3000)
    },
    stopSyncPolling() {
      if (this.syncPollTimer) {
        clearInterval(this.syncPollTimer)
        this.syncPollTimer = null
      }
    },
    async checkSyncStatus() {
      try {
        const res = await getBlogSyncStatus()
        if (res.code !== 200) return
        this.syncRunning = !!res.data.running
        this.syncProgress = {
          total: res.data.total || 0,
          processed: res.data.processed || 0,
          deleted: res.data.deleted || 0,
          uploaded: res.data.uploaded || 0,
          updated: res.data.updated || 0,
          skipped: res.data.skipped || 0,
          failed: res.data.failed || 0,
          stage: res.data.stage || '',
        }
        if (!this.syncRunning && this.syncPolling) {
          this.stopSyncPolling()
          this.syncPolling = false
          const result = res.data.result || {}
          if (result.total !== undefined || result.error) {
            this.syncResult = result
            this.syncResultVisible = true
          }
          this.loadPosts()
          this.loadCategories()
        }
      } catch (error) {
        console.error('查询同步状态失败:', error)
      }
    },
    async handlePreview(row) {
      this.previewVisible = true
      this.previewLoading = true
      this.previewTitle = row.title
      this.markdownContent = ''
      try {
        const res = await previewBlogPost(row.id)
        if (res.code === 200) {
          this.markdownContent = marked.parse(res.data.content || '', {
            gfm: true,
            breaks: true,
          })
          this.$nextTick(() => {
            this.highlightCode()
          })
        } else {
          this.$message.error(res.msg || '获取预览失败')
        }
      } catch (error) {
        console.error('预览博客失败:', error)
        this.$message.error('预览博客失败')
      } finally {
        this.previewLoading = false
      }
    },
    highlightCode() {
      if (!this.$refs.previewContent) return
      this.$refs.previewContent.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block)
      })
    },
    openUrl(row) {
      window.open(row.fileUrl, '_blank')
    },
    async copyUrl(row) {
      const url = row.fileUrl
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url)
          this.$message.success('链接已复制')
          return
        } catch (error) {
          this.fallbackCopy(url)
          return
        }
      }
      this.fallbackCopy(url)
    },
    fallbackCopy(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success('链接已复制')
      } catch (err) {
        this.$message.error('复制失败')
      }
      document.body.removeChild(textarea)
    },
    formatSize(bytes) {
      if (!bytes) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unitIndex = 0
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`
    },
    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    },
  },
}
</script>

<style scoped>
.blog-container {
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  min-height: calc(100vh - 84px);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats {
  margin-bottom: 16px;
  color: #606266;
  font-size: 14px;
}

.post-title {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.preview-container {
  min-height: 50vh;
}

.preview-dialog .el-dialog__body {
  padding: 0;
  overflow: hidden;
}

.markdown-preview {
  padding: 24px 32px;
  max-height: 76vh;
  overflow-y: auto;
  line-height: 1.7;
  color: #24292e;
  font-size: 15px;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-preview h1 {
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-preview p {
  margin-bottom: 16px;
}

.markdown-preview a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-preview img {
  max-width: 100%;
}

.markdown-preview code {
  padding: 2px 6px;
  font-size: 90%;
  color: #c7254e;
  background-color: #f9f2f4;
  border-radius: 4px;
}

.markdown-preview pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-preview pre code {
  padding: 0;
  font-size: 100%;
  color: inherit;
  background-color: transparent;
}

.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table th {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-preview li {
  margin-bottom: 4px;
}

.markdown-preview blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 16px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 30vh;
  color: #909399;
  gap: 16px;
}

.sync-errors {
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  background: #fef0f0;
  border-radius: 4px;
  padding: 12px;
}

.sync-errors-title {
  font-weight: 600;
  color: #f56c6c;
  margin-bottom: 8px;
}

.sync-error-item {
  font-size: 12px;
  color: #f56c6c;
  margin-bottom: 4px;
  word-break: break-all;
}

.sync-progress {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.sync-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
</style>
