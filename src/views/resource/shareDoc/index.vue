<template>
  <div class="share-doc-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchParams.docName"
          placeholder="搜索文档名称..."
          prefix-icon="el-icon-search"
          clearable
          style="width: 240px; margin-right: 12px"
          @clear="loadDocs"
          @keyup.enter.native="loadDocs"
        />
        <el-select
          v-model="searchParams.docType"
          placeholder="文档类型"
          clearable
          style="width: 120px; margin-right: 12px"
          @change="loadDocs"
        >
          <el-option label="Excel" value="excel" />
          <el-option label="Word" value="word" />
          <el-option label="Markdown" value="md" />
          <el-option label="PDF" value="pdf" />
          <el-option label="TXT" value="txt" />
          <el-option label="PPT" value="ppt" />
        </el-select>
        <el-select
          v-model="searchParams.scene"
          placeholder="使用场景"
          clearable
          style="width: 130px; margin-right: 12px"
          @change="loadDocs"
        >
          <el-option label="归档文档" value="archive" />
          <el-option label="模板" value="template" />
        </el-select>
        <el-button type="primary" icon="el-icon-search" @click="loadDocs">搜索</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" icon="el-icon-upload2" @click="uploadVisible = true">上传文档</el-button>
        <el-button
          type="danger"
          icon="el-icon-delete"
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >批量删除</el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats">
      <span>共 <strong>{{ total }}</strong> 个文档</span>
      <span v-if="selectedIds.length > 0" class="selected-info">
        已选择 <strong>{{ selectedIds.length }}</strong> 个
      </span>
    </div>

    <!-- 文档列表 -->
    <el-table
      :data="docs"
      v-loading="loading"
      border
      @selection-change="handleSelectionChange"
      style="width: 100%"
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column prop="docName" label="文档名称" min-width="200" show-overflow-tooltip>
        <template slot-scope="scope">
          <div class="doc-name">
            <i :class="getDocIcon(scope.row.docType)" class="doc-icon"></i>
            <span>{{ scope.row.docName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="docType" label="类型" width="100" align="center">
        <template slot-scope="scope">
          <el-tag :type="getDocTypeTag(scope.row.docType)" size="small">
            {{ getDocTypeLabel(scope.row.docType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="场景" width="100" align="center">
        <template slot-scope="scope">
          <el-tag size="small" :type="scope.row.scene === 'template' ? 'success' : 'info'">
            {{ scope.row.scene === 'template' ? '模板' : '归档' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="scope">
          <el-switch v-model="scope.row.enabled" :active-value="1" :inactive-value="0" @change="toggleEnabled(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="大小" width="100" align="center">
        <template slot-scope="scope">
          {{ formatSize(scope.row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column prop="createBy" label="创建人" width="100" align="center" />
      <el-table-column label="创建时间" width="180" align="center">
        <template slot-scope="scope">
          {{ formatTime(scope.row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      <el-table-column label="操作" width="250" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="small" icon="el-icon-view" @click="handlePreview(scope.row)">预览</el-button>
          <el-button type="text" size="small" icon="el-icon-download" @click="handleDownload(scope.row)">下载</el-button>
          <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button type="text" size="small" icon="el-icon-delete" class="danger-btn" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-if="total > 0"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :current-page="searchParams.page"
        :page-size="searchParams.limit"
        :page-sizes="[20, 50, 100]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 上传文档弹窗 -->
    <share-doc-upload
      :visible.sync="uploadVisible"
      :limit="10"
      @success="onUploadSuccess"
    />

    <!-- 编辑文档弹窗 -->
    <el-dialog :visible.sync="editVisible" title="编辑备注" width="500px" append-to-body>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="文档名称">
          <el-input v-model="editForm.docName" disabled />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">确定</el-button>
      </div>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog :visible.sync="previewVisible" :title="previewDocName" width="85%" append-to-body custom-class="preview-dialog">
      <div class="preview-container" v-loading="previewLoading">
        <div v-if="previewUrl" class="preview-content">
          <!-- Markdown预览 -->
          <div v-if="previewDocType === 'md'" class="markdown-preview" v-html="markdownContent"></div>
          <!-- TXT预览 -->
          <div v-else-if="previewDocType === 'txt'" class="txt-preview">
            <pre>{{ txtContent }}</pre>
          </div>
          <!-- PDF使用浏览器内置预览 -->
          <iframe
            v-else-if="previewDocType === 'pdf'"
            :src="previewUrl"
            frameborder="0"
            style="width: 100%; height: 75vh;"
          ></iframe>
          <!-- Excel/Word使用微软在线预览 -->
          <iframe
            v-else
            :src="getOfficePreviewUrl(previewUrl)"
            frameborder="0"
            style="width: 100%; height: 75vh;"
          ></iframe>
        </div>
        <div v-else class="preview-empty">
          <i class="el-icon-document" style="font-size: 48px; color: #c0c4cc;"></i>
          <p>暂无预览内容</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  listShareDocs,
  deleteShareDoc,
  deleteShareDocs,
  updateShareDoc,
  getShareDocPreviewUrl,
  getShareDocDownloadUrl,
  updateShareDocSettings
} from '@/api/bed/shareDoc'
import ShareDocUpload from '@/components/ShareDocUpload'

export default {
  name: 'ShareDoc',
  components: { ShareDocUpload },
  data() {
    return {
      // 搜索参数
      searchParams: {
        docName: '',
        docType: '',
        scene: '',
        page: 1,
        limit: 20
      },
      // 文档列表
      docs: [],
      // 总数
      total: 0,
      // 加载状态
      loading: false,
      // 选中的文档ID
      selectedIds: [],
      // 上传相关
      uploadVisible: false,
      // 编辑相关
      editVisible: false,
      editLoading: false,
      editForm: {
        id: null,
        docName: '',
        remark: ''
      },
      // 预览相关
      previewVisible: false,
      previewLoading: false,
      previewUrl: '',
      previewDocType: '',
      previewDocName: '',
      markdownContent: '',
      txtContent: ''
    }
  },
  created() {
    this.loadDocs()
  },
  methods: {
    // 加载文档列表
    async loadDocs() {
      this.loading = true
      try {
        const res = await listShareDocs(this.searchParams)
        if (res.code === 200) {
          this.docs = res.data.rows || []
          this.total = res.data.total || 0
        } else {
          this.$message.error(res.msg || '查询失败')
        }
      } catch (error) {
        console.error('加载文档列表失败:', error)
        this.$message.error('加载文档列表失败')
      } finally {
        this.loading = false
      }
    },
    // 选择变化
    handleSelectionChange(selection) {
      this.selectedIds = selection.map(item => item.id)
    },
    // 页码变化
    handlePageChange(page) {
      this.searchParams.page = page
      this.loadDocs()
    },
    // 每页数量变化
    handleSizeChange(limit) {
      this.searchParams.limit = limit
      this.searchParams.page = 1
      this.loadDocs()
    },
    // 上传成功回调
    onUploadSuccess() {
      this.loadDocs()
    },
    // 编辑文档
    handleEdit(row) {
      this.editForm = {
        id: row.id,
        docName: row.docName,
        remark: row.remark || ''
      }
      this.editVisible = true
    },
    // 提交编辑
    async submitEdit() {
      if (!this.editForm.docName) {
        this.$message.warning('请输入文档名称')
        return
      }

      this.editLoading = true
      try {
        const res = await updateShareDoc(
          this.editForm.id,
          this.editForm.docName,
          this.editForm.remark
        )
        if (res.code === 200) {
          this.$message.success('更新成功')
          this.editVisible = false
          this.loadDocs()
        } else {
          this.$message.error(res.msg || '更新失败')
        }
      } catch (error) {
        console.error('更新文档失败:', error)
        this.$message.error('更新文档失败')
      } finally {
        this.editLoading = false
      }
    },
    async toggleEnabled(row) {
      try {
        const res = await updateShareDocSettings({ id: row.id, enabled: row.enabled })
        if (res.code !== 200) {
          row.enabled = row.enabled === 1 ? 0 : 1
          this.$message.error(res.msg || '状态更新失败')
        }
      } catch (error) {
        row.enabled = row.enabled === 1 ? 0 : 1
        this.$message.error('状态更新失败')
      }
    },
    // 删除文档
    async handleDelete(row) {
      try {
        await this.$confirm('确定要删除该文档吗？', '提示', {
          type: 'warning'
        })
        const res = await deleteShareDoc(row.id)
        if (res.code === 200) {
          this.$message.success('删除成功')
          this.loadDocs()
        } else {
          this.$message.error(res.msg || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除文档失败:', error)
          this.$message.error('删除文档失败')
        }
      }
    },
    // 批量删除
    async handleBatchDelete() {
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedIds.length} 个文档吗？`, '提示', {
          type: 'warning'
        })
        const res = await deleteShareDocs(this.selectedIds)
        if (res.code === 200) {
          this.$message.success('删除成功')
          this.loadDocs()
        } else {
          this.$message.error(res.msg || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除文档失败:', error)
          this.$message.error('批量删除文档失败')
        }
      }
    },
    // 预览文档
    async handlePreview(row) {
      this.previewLoading = true
      this.previewVisible = true
      this.previewDocType = row.previewUrl ? 'pdf' : row.docType
      this.previewDocName = row.docName
      this.previewUrl = ''
      this.markdownContent = ''
      this.txtContent = ''

      try {
        const res = await getShareDocPreviewUrl(row.id)
        if (res.code === 200) {
          this.previewUrl = row.previewUrl || res.data.fileUrl

          // 如果是Markdown，直接获取内容并渲染
          if (row.docType === 'md') {
            const response = await fetch(res.data.fileUrl)
            const text = await response.text()
            this.markdownContent = this.renderMarkdown(text)
          }
          // 如果是TXT，获取文本内容并识别编码
          if (row.docType === 'txt') {
            this.txtContent = await this.fetchTextContent(res.data.fileUrl)
          }
        } else {
          this.$message.error(res.msg || '获取预览失败')
        }
      } catch (error) {
        console.error('预览文档失败:', error)
        this.$message.error('预览文档失败')
      } finally {
        this.previewLoading = false
      }
    },
    // 获取Office在线预览URL
    getOfficePreviewUrl(url) {
      // 使用微软Office Online预览
      return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url)
    },
    // 获取远程文本内容
    async fetchTextContent(url) {
      const response = await fetch(url)
      const bytes = await response.arrayBuffer()
      return this.decodeTextContent(bytes)
    },
    // 按BOM和字节特征解码，兼容UTF-8/UTF-16/GBK
    decodeTextContent(bytes) {
      if (!bytes || bytes.byteLength === 0) return ''

      const view = new Uint8Array(bytes)
      if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) {
        return new TextDecoder('utf-8').decode(view.subarray(3))
      }
      if (view.length >= 2 && view[0] === 0xff && view[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(view.subarray(2))
      }
      if (view.length >= 2 && view[0] === 0xfe && view[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(view.subarray(2))
      }

      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(view)
      } catch (error) {
        try {
          return new TextDecoder('gbk').decode(view)
        } catch (gbkError) {
          return new TextDecoder('utf-8').decode(view)
        }
      }
    },
    // 简易Markdown渲染
    renderMarkdown(text) {
      if (!text) return ''
      // 转义HTML
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // 标题
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

      // 粗体和斜体
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

      // 代码块
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      html = html.replace(/`(.+?)`/g, '<code>$1</code>')

      // 链接和图片
      html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')

      // 列表
      html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
      html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')

      // 引用
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

      // 分割线
      html = html.replace(/^---$/gm, '<hr>')

      // 段落（换行）
      html = html.replace(/\n\n/g, '</p><p>')
      html = html.replace(/\n/g, '<br>')
      html = '<p>' + html + '</p>'

      // 清理空段落
      html = html.replace(/<p><\/p>/g, '')
      html = html.replace(/<p>(<h[1-6]>)/g, '$1')
      html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      html = html.replace(/<p>(<pre>)/g, '$1')
      html = html.replace(/(<\/pre>)<\/p>/g, '$1')
      html = html.replace(/<p>(<blockquote>)/g, '$1')
      html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
      html = html.replace(/<p>(<hr>)<\/p>/g, '$1')

      return html
    },
    // 下载文档
    async handleDownload(row) {
      try {
        const res = await getShareDocDownloadUrl(row.id)
        if (res.code === 200) {
          // 创建临时链接下载
          const link = document.createElement('a')
          link.href = res.data.fileUrl
          link.download = res.data.docName
          link.click()
        } else {
          this.$message.error(res.msg || '获取下载链接失败')
        }
      } catch (error) {
        console.error('下载文档失败:', error)
        this.$message.error('下载文档失败')
      }
    },
    // 获取文档图标
    getDocIcon(docType) {
      const icons = {
        excel: 'el-icon-document',
        word: 'el-icon-document',
        md: 'el-icon-document',
        pdf: 'el-icon-document',
        txt: 'el-icon-document',
        ppt: 'el-icon-document'
      }
      return icons[docType] || 'el-icon-document'
    },
    // 获取文档类型标签
    getDocTypeTag(docType) {
      const tags = {
        excel: 'success',
        word: 'primary',
        md: 'warning',
        pdf: 'danger',
        txt: 'info',
        ppt: 'warning'
      }
      return tags[docType] || 'info'
    },
    // 获取文档类型标签文本
    getDocTypeLabel(docType) {
      const labels = {
        excel: 'Excel',
        word: 'Word',
        md: 'Markdown',
        pdf: 'PDF',
        txt: 'TXT',
        ppt: 'PowerPoint'
      }
      return labels[docType] || docType
    },
    // 格式化文件大小
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
    // 格式化时间
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
    }
  }
}
</script>

<style scoped>
.share-doc-container {
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

.selected-info {
  margin-left: 16px;
  color: #409eff;
}

.doc-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-icon {
  font-size: 18px;
  color: #909399;
}

.danger-btn {
  color: #f56c6c;
}

.danger-btn:hover {
  color: #f78989;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.preview-container {
  min-height: 50vh;
}

.preview-content {
  width: 100%;
}

.markdown-preview {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
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

.markdown-preview p {
  margin-bottom: 16px;
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

/* 预览弹窗样式 */
.preview-dialog {
  margin-top: 5vh !important;
}

.preview-dialog .el-dialog__body {
  padding: 0;
  overflow: hidden;
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

.markdown-preview h3 {
  font-size: 1.25em;
}

.markdown-preview img {
  max-width: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-preview a {
  color: #409eff;
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

.txt-preview {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.txt-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  margin: 0;
}

.markdown-preview hr {
  border: none;
  border-top: 1px solid #eaecef;
  margin: 24px 0;
}
</style>
