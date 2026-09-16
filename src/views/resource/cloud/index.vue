<template>
  <div class="bed-container">
    <!-- 左侧文件夹 -->
    <div class="bed-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">文件夹</span>
        <el-button type="text" icon="el-icon-plus" @click="showCreateFolderDialog" class="add-btn">新建</el-button>
      </div>
      <div class="sidebar-content">
        <div
          v-for="folder in folderList"
          :key="folder.path"
          :class="['folder-item', { active: currentPrefix === folder.path }]"
        >
          <div class="folder-content" @click="selectFolder(folder.path)">
            <i class="el-icon-folder"></i>
            <span class="node-label">{{ folder.displayName }}</span>
          </div>
          <div class="node-actions">
            <i class="el-icon-delete" @click.stop="handleDeleteFolder(folder)" title="删除"></i>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <el-button size="mini" icon="el-icon-refresh" @click="handleRefresh" :loading="foldersLoading">刷新</el-button>
      </div>
    </div>

    <!-- 右侧主内容区 -->
    <div class="bed-main">
      <!-- 工具栏 -->
      <div class="bed-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchFileName"
            placeholder="搜索文件名..."
            prefix-icon="el-icon-search"
            clearable
            style="width: 240px; margin-right: 12px"
            @clear="loadCurrentFolder"
            @keyup.enter.native="loadCurrentFolder"
          />
          <el-button type="primary" icon="el-icon-search" @click="loadCurrentFolder">搜索</el-button>
        </div>
        <div class="toolbar-right">
          <el-button-group class="view-switch">
            <el-button
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              icon="el-icon-menu"
              size="small"
              @click="viewMode = 'grid'"
            />
            <el-button
              :type="viewMode === 'table' ? 'primary' : 'default'"
              icon="el-icon-s-grid"
              size="small"
              @click="viewMode = 'table'"
            />
          </el-button-group>
          <el-divider direction="vertical"></el-divider>
          <el-button type="primary" icon="el-icon-upload2" @click="uploadVisible = true">上传文件</el-button>
          <el-dropdown @command="handleBatchCommand" trigger="click" style="margin-left: 8px">
            <el-button :disabled="selectedKeys.length === 0">
              批量操作 <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="delete" icon="el-icon-delete">批量删除</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="bed-stats">
        <span>共 <strong>{{ total }}</strong> 个文件</span>
        <span v-if="selectedKeys.length > 0" class="selected-info">已选择 <strong>{{ selectedKeys.length }}</strong> 个</span>
      </div>

      <!-- 网格视图 -->
      <div v-if="viewMode === 'grid'" class="image-grid" v-loading="loading">
        <div
          v-for="file in files"
          :key="file.key"
          class="image-card"
          :class="{ selected: selectedKeys.includes(file.key) }"
          @click="toggleSelect(file)"
        >
          <div class="card-image">
            <el-image
              v-if="isImage(file.fileName)"
              :src="file.url"
              fit="cover"
              :preview-src-list="[file.url]"
            >
              <div slot="error" class="image-error">
                <i class="el-icon-picture-outline"></i>
              </div>
              <div slot="placeholder" class="image-placeholder">
                <i class="el-icon-loading"></i>
              </div>
            </el-image>
            <div v-else class="image-error">
              <i :class="getFileIcon(file.fileName)"></i>
            </div>
          </div>
          <div class="card-info">
            <div class="card-name" :title="file.fileName">{{ file.fileName }}</div>
            <div class="card-meta">
              <span>{{ formatSize(file.size) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <el-checkbox :value="selectedKeys.includes(file.key)" @click.native.stop="toggleSelect(file)" class="card-checkbox" />
            <el-tooltip content="复制链接" placement="top">
              <el-button type="text" icon="el-icon-link" @click.stop="copyUrl(file)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="canPreview(file.fileName)" content="预览" placement="top">
              <el-button type="text" icon="el-icon-view" @click.stop="handlePreview(file)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="text" icon="el-icon-delete" class="danger-btn" @click.stop="deleteFile(file)"></el-button>
            </el-tooltip>
          </div>
        </div>
        <!-- 空状态 -->
        <div v-if="!loading && files.length === 0" class="empty-state">
          <i class="el-icon-folder-opened"></i>
          <p>暂无文件</p>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-else class="image-table">
        <el-table
          :data="files"
          v-loading="loading"
          border
          height="100%"
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column prop="fileName" label="文件名" min-width="150" show-overflow-tooltip />
          <el-table-column label="URL" min-width="250" show-overflow-tooltip>
            <template slot-scope="scope">
              <span style="color: #909399; font-size: 12px">{{ scope.row.url }}</span>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="100" align="center">
            <template slot-scope="scope">
              {{ formatSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="预览" width="100" align="center">
            <template slot-scope="scope">
              <el-image
                v-if="isImage(scope.row.fileName)"
                :src="scope.row.url"
                fit="cover"
                :preview-src-list="[scope.row.url]"
                style="width: 60px; height: 60px; border-radius: 4px"
              >
                <div slot="error" class="table-image-error">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
              <i v-else :class="getFileIcon(scope.row.fileName)" class="table-file-icon"></i>
            </template>
          </el-table-column>
          <el-table-column label="修改时间" width="180" align="center">
            <template slot-scope="scope">
              {{ formatTime(scope.row.lastModified) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" align="center" fixed="right">
            <template slot-scope="scope">
              <el-button v-if="canPreview(scope.row.fileName)" type="text" size="small" icon="el-icon-view" @click="handlePreview(scope.row)">预览</el-button>
              <el-button type="text" size="small" icon="el-icon-edit" @click="handleRename(scope.row)">修改</el-button>
              <el-button type="text" size="small" icon="el-icon-link" @click="copyUrl(scope.row)">复制链接</el-button>
              <el-button type="text" size="small" icon="el-icon-delete" class="danger-btn" @click="deleteFile(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="bed-pagination">
        <el-pagination
          v-if="total > 0"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[24, 48, 72, 96]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 创建文件夹弹窗 -->
    <el-dialog :visible.sync="createFolderVisible" title="新建文件夹" width="400px" append-to-body>
      <el-form :model="newFolderForm" label-width="80px">
        <el-form-item label="路径">
          <el-input v-model="newFolderForm.name" placeholder="如: / 表示根目录, /profile/blog 表示profile下新建blog" @keyup.enter.native="createFolder" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="createFolderVisible = false">取 消</el-button>
        <el-button type="primary" @click="createFolder" :loading="creatingFolder">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 重命名弹窗 -->
    <el-dialog :visible.sync="renameVisible" title="修改文件名" width="400px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="文件名">
          <el-input v-model="renameName" placeholder="请输入新文件名" @keyup.enter.native="confirmRename" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="renameVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmRename" :loading="renaming">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 上传弹窗 -->
    <cloud-upload
      :visible.sync="uploadVisible"
      :data="{ prefix: currentPrefix }"
      @success="onUploadSuccess"
    />

    <el-dialog
      :visible.sync="previewVisible"
      :title="previewFileName"
      width="85%"
      append-to-body
      custom-class="cloud-preview-dialog"
    >
      <div class="cloud-preview-container" v-loading="previewLoading">
        <div v-if="previewUrl" class="cloud-preview-content">
          <div v-if="previewFileType === 'md'" class="cloud-markdown-preview" v-html="markdownContent"></div>
          <div v-else-if="previewFileType === 'txt'" class="cloud-txt-preview"><pre>{{ txtContent }}</pre></div>
          <iframe v-else-if="previewFileType === 'pdf'" :src="previewUrl" frameborder="0"></iframe>
          <iframe v-else-if="previewFileType === 'office'" :src="getOfficePreviewUrl(previewUrl)" frameborder="0"></iframe>
          <div v-else class="cloud-preview-empty"><i class="el-icon-download"></i><p>该文件暂不支持在线预览，请下载查看</p></div>
        </div>
        <div v-else class="cloud-preview-empty"><i class="el-icon-document"></i><p>暂无预览内容</p></div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listR2Files, deleteR2File, deleteR2Files, listR2AllFolders, createR2Folder, deleteR2Folder, renameR2File, refreshFolderCache } from '@/api/bed/r2file'
import CloudUpload from '@/components/CloudUpload'

export default {
  name: 'CloudFileManager',
  components: { CloudUpload },
  data() {
    return {
      // 文件夹列表
      folderList: [],
      foldersLoading: false,
      // 当前前缀
      currentPrefix: 'profile/',
      // 文件列表
      files: [],
      loading: false,
      // 搜索
      searchFileName: '',
      // 视图模式（默认表格）
      viewMode: 'table',
      // 分页
      currentPage: 1,
      pageSize: 24,
      total: 0,
      // 选择
      selectedKeys: [],
      // 上传
      uploadVisible: false,
      // 创建文件夹
      createFolderVisible: false,
      creatingFolder: false,
      newFolderForm: {
        name: ''
      },
      // 重命名
      renameVisible: false,
      renameName: '',
      renameFile: null,
      renaming: false,
      previewVisible: false,
      previewLoading: false,
      previewUrl: '',
      previewFileName: '',
      previewFileType: '',
      markdownContent: '',
      txtContent: ''
    }
  },
  created() {
    this.loadFolders()
    this.loadCurrentFolder()
  },
  methods: {
    // ========== 文件夹操作 ==========
    async loadFolders() {
      this.foldersLoading = true
      try {
        // 一次请求获取所有层级的文件夹
        const res = await listR2AllFolders('')
        if (res.code === 200) {
          this.folderList = (res.data || []).map(f => ({
            ...f,
            displayName: '/' + f.path.replace(/\/$/, '')
          }))
        }
      } catch (error) {
        console.error('加载文件夹失败:', error)
      } finally {
        this.foldersLoading = false
      }
    },

    async handleRefresh() {
      try {
        // 先清除Redis缓存
        await refreshFolderCache()
        // 再重新加载
        await this.loadFolders()
        this.$message.success('刷新成功')
      } catch (error) {
        console.error('刷新失败:', error)
      }
    },

    selectFolder(path) {
      this.currentPrefix = path
      this.currentPage = 1
      this.selectedKeys = []
      this.loadCurrentFolder()
    },

    async loadCurrentFolder() {
      this.loading = true
      try {
        const fileRes = await listR2Files({
          prefix: this.currentPrefix,
          fileName: this.searchFileName,
          page: this.currentPage,
          limit: this.pageSize
        })

        if (fileRes.code === 200) {
          this.files = fileRes.data.rows || []
          this.total = fileRes.data.total || 0
        } else {
          this.$message.error(fileRes.msg || '加载失败')
        }
      } catch (error) {
        console.error('加载文件列表失败:', error)
        this.$message.error('加载文件列表失败')
      } finally {
        this.loading = false
      }
    },

    // ========== 文件操作 ==========
    toggleSelect(file) {
      const index = this.selectedKeys.indexOf(file.key)
      if (index > -1) {
        this.selectedKeys.splice(index, 1)
      } else {
        this.selectedKeys.push(file.key)
      }
    },

    handleSelectionChange(selection) {
      this.selectedKeys = selection.map(item => item.key)
    },

    deleteFile(file) {
      this.$confirm(`确定要删除文件 "${file.fileName}" 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const res = await deleteR2File(file.key)
          if (res.code === 200) {
            this.$message.success('删除成功')
            this.loadCurrentFolder()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (error) {
          console.error('删除文件失败:', error)
          this.$message.error('删除文件失败')
        }
      }).catch(() => {})
    },

    copyUrl(file) {
      const url = file.url
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          this.$message.success('链接已复制到剪贴板')
        }).catch(() => {
          this.fallbackCopy(url)
        })
      } else {
        this.fallbackCopy(url)
      }
    },

    fallbackCopy(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success('链接已复制到剪贴板')
      } catch (err) {
        this.$message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textarea)
    },

    canPreview(fileName) {
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'pdf', 'txt', 'md', 'markdown', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'potx'].includes(this.getExtension(fileName))
    },

    getExtension(fileName) {
      if (!fileName || !fileName.includes('.')) return ''
      return fileName.toLowerCase().split('.').pop()
    },

    getPreviewType(fileName) {
      const ext = this.getExtension(fileName)
      if (['md', 'markdown'].includes(ext)) return 'md'
      if (ext === 'txt') return 'txt'
      if (ext === 'pdf') return 'pdf'
      if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'potx'].includes(ext)) return 'office'
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
      return ''
    },

    async handlePreview(file) {
      const previewType = this.getPreviewType(file.fileName)
      if (!previewType || !file.url) {
        this.$message.info('该文件暂不支持在线预览，请下载查看')
        return
      }
      if (previewType === 'image') {
        window.open(file.url, '_blank')
        return
      }
      this.previewVisible = true
      this.previewLoading = true
      this.previewUrl = file.url
      this.previewFileName = file.fileName
      this.previewFileType = previewType
      this.markdownContent = ''
      this.txtContent = ''
      try {
        if (previewType === 'md') {
          const response = await fetch(file.url)
          this.markdownContent = this.renderMarkdown(await response.text())
        } else if (previewType === 'txt') {
          this.txtContent = await this.fetchTextContent(file.url)
        }
      } catch (error) {
        console.error('预览云文件失败:', error)
        this.$message.error('预览失败，请检查文件链接或直接下载')
      } finally {
        this.previewLoading = false
      }
    },

    getOfficePreviewUrl(url) {
      return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url)
    },

    async fetchTextContent(url) {
      const response = await fetch(url)
      return this.decodeTextContent(await response.arrayBuffer())
    },

    decodeTextContent(bytes) {
      if (!bytes || bytes.byteLength === 0) return ''
      const view = new Uint8Array(bytes)
      if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) return new TextDecoder('utf-8').decode(view.subarray(3))
      if (view.length >= 2 && view[0] === 0xff && view[1] === 0xfe) return new TextDecoder('utf-16le').decode(view.subarray(2))
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(view)
      } catch (error) {
        return new TextDecoder('gbk').decode(view)
      }
    },

    renderMarkdown(text) {
      if (!text) return ''
      let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
      html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')
      return '<p>' + html + '</p>'
    },

    // ========== 批量操作 ==========
    handleBatchCommand(command) {
      if (command === 'delete') {
        this.batchDelete()
      }
    },

    batchDelete() {
      this.$confirm(`确定要删除选中的 ${this.selectedKeys.length} 个文件吗？`, '批量删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const res = await deleteR2Files(this.selectedKeys)
          if (res.code === 200) {
            this.$message.success(res.msg || '删除成功')
            this.selectedKeys = []
            this.loadCurrentFolder()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (error) {
          console.error('批量删除失败:', error)
          this.$message.error('批量删除失败')
        }
      }).catch(() => {})
    },

    // ========== 分页 ==========
    handlePageChange(page) {
      this.currentPage = page
      this.loadCurrentFolder()
    },

    handleSizeChange(size) {
      this.pageSize = size
      this.currentPage = 1
      this.loadCurrentFolder()
    },

    onUploadSuccess() {
      this.loadCurrentFolder()
      // 上传文件不需要刷新文件夹列表，只有创建/删除文件夹才需要
    },

    // ========== 工具方法 ==========
    isImage(fileName) {
      if (!fileName) return false
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    },

    getFileIcon(fileName) {
      if (!fileName) return 'el-icon-document'
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
      const iconMap = {
        '.jpg': 'el-icon-picture',
        '.jpeg': 'el-icon-picture',
        '.png': 'el-icon-picture',
        '.gif': 'el-icon-picture',
        '.pdf': 'el-icon-document',
        '.doc': 'el-icon-tickets',
        '.docx': 'el-icon-tickets',
        '.xls': 'el-icon-s-grid',
        '.xlsx': 'el-icon-s-grid',
        '.zip': 'el-icon-box',
        '.rar': 'el-icon-box'
      }
      return iconMap[ext] || 'el-icon-document'
    },

    formatSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    handleImageError(e) {
      // el-image 会自动处理错误状态
    },

    getPath(key) {
      if (!key) return ''
      // key 如 "lucky/test1/image.png"，去掉文件名只保留路径
      const lastSlash = key.lastIndexOf('/')
      return lastSlash > -1 ? key.substring(0, lastSlash) : '/'
    },

    formatTime(timeStr) {
      if (!timeStr) return '-'
      const d = new Date(timeStr)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },

    // ========== 重命名文件 ==========
    handleRename(file) {
      this.renameFile = file
      this.renameName = file.fileName
      this.renameVisible = true
    },

    async confirmRename() {
      if (!this.renameName.trim()) {
        this.$message.warning('请输入文件名')
        return
      }
      const newName = this.renameName.trim()
      if (newName === this.renameFile.fileName) {
        this.renameVisible = false
        return
      }
      // 拼接新key：路径+新文件名
      const oldKey = this.renameFile.key
      const lastSlash = oldKey.lastIndexOf('/')
      const newKey = lastSlash > -1 ? oldKey.substring(0, lastSlash + 1) + newName : newName

      this.renaming = true
      try {
        const res = await renameR2File(oldKey, newKey)
        if (res.code === 200) {
          this.$message.success('重命名成功')
          this.renameVisible = false
          this.loadCurrentFolder()
        } else {
          this.$message.error(res.msg || '重命名失败')
        }
      } catch (error) {
        console.error('重命名失败:', error)
        this.$message.error('重命名失败')
      } finally {
        this.renaming = false
      }
    },

    // ========== 创建文件夹 ==========
    showCreateFolderDialog() {
      this.newFolderForm.name = ''
      this.createFolderVisible = true
    },

    async createFolder() {
      const input = this.newFolderForm.name.trim()
      if (!input) {
        this.$message.warning('请输入路径')
        return
      }
      this.creatingFolder = true
      try {
        // 解析路径：/ 表示根目录, /profile/blog 表示绝对路径
        let folderPath
        if (input === '/') {
          // 根目录下创建，需要用户输入文件夹名
          this.$message.warning('请输入文件夹名称，如: /newFolder')
          this.creatingFolder = false
          return
        } else if (input.startsWith('/')) {
          // 绝对路径，去掉开头的 /
          folderPath = input.substring(1)
        } else {
          // 相对当前目录
          folderPath = this.currentPrefix + input
        }
        const res = await createR2Folder(folderPath)
        if (res.code === 200) {
          this.$message.success('文件夹创建成功')
          this.createFolderVisible = false
          this.loadCurrentFolder()
          this.loadFolders()
        } else {
          this.$message.error(res.msg || '创建失败')
        }
      } catch (error) {
        console.error('创建文件夹失败:', error)
        this.$message.error('创建文件夹失败')
      } finally {
        this.creatingFolder = false
      }
    },

    handleRenameFolder(folder) {
      this.$prompt('请输入新名称', '重命名文件夹', {
        inputValue: folder.name,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }).then(async ({ value }) => {
        if (!value || !value.trim()) return
        try {
          const newPath = folder.path.replace(folder.name, value.trim())
          const createRes = await createR2Folder(newPath)
          if (createRes.code === 200) {
            const deleteRes = await deleteR2Folder(folder.path)
            if (deleteRes.code === 200) {
              this.$message.success('重命名成功')
              this.loadCurrentFolder()
              this.loadFolders()
            } else {
              this.$message.error('重命名失败')
            }
          } else {
            this.$message.error(createRes.msg || '重命名失败')
          }
        } catch (error) {
          this.$message.error('重命名失败')
        }
      }).catch(() => {})
    },

    handleDeleteFolder(folder) {
      this.$confirm(`确定删除文件夹「${folder.displayName}」吗？\n注意：只能删除空文件夹`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(async () => {
        try {
          const res = await deleteR2Folder(folder.path)
          if (res.code === 200) {
            this.$message.success('删除成功')
            this.loadCurrentFolder()
            this.loadFolders()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (error) {
          // error.message 包含后端返回的具体错误信息
          this.$message.error(error.message || '删除失败')
        }
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.bed-container {
  display: flex;
  height: calc(100vh - 96px);
  background: #f0f2f5;
  overflow: hidden;
}

// ========== 左侧文件夹 ==========
.bed-sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    color: #262626;
  }

  .add-btn {
    padding: 0;
    font-size: 13px;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #595959;

  &:hover {
    background: #f5f5f5;

    .node-actions {
      display: inline-flex;
    }
  }

  &.active {
    background: #e6f7ff;
    color: #1890ff;
    font-weight: 500;

    i {
      color: #1890ff;
    }
  }

  i {
    margin-right: 6px;
    color: #faad14;
  }

  .folder-content {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .node-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-actions {
    display: none;
    margin-left: 8px;

    i {
      margin-left: 4px;
      font-size: 12px;
      color: #8c8c8c;
      cursor: pointer;

      &:hover {
        color: #f5222d;
      }
    }
  }
}

// ========== 右侧主内容 ==========
.bed-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  min-height: 0;
}

.bed-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
  }
}

.view-switch {
  margin-right: 8px;
}

.bed-stats {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 12px;

  strong {
    color: #262626;
  }

  .selected-info {
    margin-left: 16px;
    color: #1890ff;
  }
}

// ========== 网格视图 ==========
.image-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding-bottom: 16px;
  align-content: start;
}

.image-card {
  background: #fff;
  border-radius: 8px;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .card-actions {
      opacity: 1;
    }
  }

  &.selected {
    border-color: #1890ff;
    background: #e6f7ff;
  }
}

.card-checkbox {
  margin-right: auto;
}

.card-image {
  width: 100%;
  height: 140px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  .el-image {
    width: 100%;
    height: 100%;
  }

  .image-error {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    color: #d9d9d9;
    font-size: 32px;
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    color: #c0c4cc;
    font-size: 24px;
  }
}

.card-info {
  padding: 8px 12px;
}

.card-name {
  font-size: 13px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.card-meta {
  font-size: 12px;
  color: #bfbfbf;
  display: flex;
  gap: 8px;
}

.card-actions {
  display: flex;
  align-items: center;
  padding: 3px 8px 6px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;

  .card-checkbox {
    margin-right: auto;
    margin-top: -3px;
  }

  .el-button {
    padding: 4px 6px;
  }
}

// ========== 空状态 ==========
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #bfbfbf;

  i {
    font-size: 64px;
    margin-bottom: 16px;
  }

  p {
    font-size: 14px;
    margin-bottom: 16px;
  }
}

// ========== 表格视图 ==========
.image-table {
  flex: 1;
  overflow: hidden;
  height: 0;

  .el-table {
    height: 100%;
  }
}

.table-image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: #f5f5f5;
  color: #d9d9d9;
  font-size: 20px;
  border-radius: 4px;
}

.table-file-icon {
  font-size: 32px;
  color: #909399;
}

.danger-btn {
  color: #f5222d !important;
}

.cloud-preview-container {
  min-height: 260px;
  background: #f7f9fc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: auto;
}

.cloud-preview-content iframe {
  display: block;
  width: 100%;
  height: 75vh;
  border: 0;
  background: #fff;
}

.cloud-markdown-preview,
.cloud-txt-preview {
  min-height: 260px;
  padding: 24px 30px;
  color: #303133;
  line-height: 1.75;
  background: #fff;
}

.cloud-txt-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
}

.cloud-preview-empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.cloud-preview-empty i {
  font-size: 48px;
  margin-bottom: 14px;
}

// ========== 分页 ==========
.bed-pagination {
  padding: 12px 0;
  display: flex;
  justify-content: flex-end;
}

// ========== 滚动条样式 ==========
.sidebar-content,
.image-grid,
.image-table {
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;

    &:hover {
      background: #a8a8a8;
    }
  }
}
</style>
