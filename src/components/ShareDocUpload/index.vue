<template>
  <el-dialog
    title="上传文档"
    :visible.sync="dialogVisible"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
    append-to-body
  >
    <div class="upload-container">
      <el-upload
        ref="upload"
        multiple
        action="#"
        :auto-upload="false"
        :on-change="handleChange"
        :file-list="fileList"
        :limit="limit"
        :accept="acceptTypes"
        drag
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">支持 Excel、Word、Markdown、PDF、TXT、PPTX 格式；PPTX 会自动归类为模板</div>
      </el-upload>

      <!-- 上传进度列表 -->
      <div v-if="uploadFileList.length > 0" class="upload-file-list">
        <div class="list-header">
          <span>上传列表 ({{ uploadFileList.length }})</span>
          <el-button
            v-if="!uploading"
            type="text"
            icon="el-icon-delete"
            @click="clearFileList"
          >清空</el-button>
        </div>
        <div class="file-list-content">
          <div
            v-for="(file, index) in uploadFileList"
            :key="file.uid"
            class="file-item"
          >
            <div class="file-info">
              <i class="el-icon-document file-icon"></i>
              <div class="file-detail">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-meta">
                  <span>{{ formatSize(file.size) }}</span>
                  <span v-if="file.status === 'success'" class="status-success">
                    <i class="el-icon-circle-check"></i> 上传成功
                  </span>
                  <span v-else-if="file.status === 'fail'" class="status-fail">
                    <i class="el-icon-circle-close"></i> {{ file.errorMsg || '上传失败' }}
                  </span>
                  <span v-else-if="file.status === 'uploading'" class="status-uploading">
                    上传中...
                  </span>
                </div>
              </div>
            </div>
            <div class="file-progress">
              <el-progress
                v-if="file.status === 'uploading'"
                :percentage="file.progress || 0"
                :stroke-width="4"
                :show-text="false"
              />
              <el-progress
                v-else-if="file.status === 'success'"
                :percentage="100"
                :stroke-width="4"
                :show-text="false"
                status="success"
              />
              <el-progress
                v-else-if="file.status === 'fail'"
                :percentage="file.progress || 0"
                :stroke-width="4"
                :show-text="false"
                status="exception"
              />
            </div>
            <div class="file-actions">
              <el-button
                v-if="!uploading && file.status !== 'success'"
                type="text"
                icon="el-icon-close"
                @click="removeFile(index)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose" :disabled="uploading">取 消</el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
        :loading="uploading"
        :disabled="pendingCount === 0"
      >
        {{ uploading ? '上传中...' : `开始上传 (${pendingCount}个)` }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { presignedUpload } from '@/api/bed/r2file'
import { createShareDocByPath, generateDocUploadUrl } from '@/api/bed/shareDoc'

export default {
  name: 'ShareDocUpload',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    limit: {
      type: Number,
      default: 10
    }
  },
  data() {
    return {
      dialogVisible: this.visible,
      fileList: [],
      uploadFileList: [],
      uploading: false
    }
  },
  computed: {
    acceptTypes() {
      return '.xlsx,.xls,.docx,.doc,.md,.markdown,.pdf,.txt,.pptx,.potx'
    },
    pendingCount() {
      return this.uploadFileList.filter(f => f.status !== 'success' && f.status !== 'fail').length
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
    },
    dialogVisible(val) {
      this.$emit('update:visible', val)
    }
  },
  methods: {
    handleClose() {
      if (this.uploading) return
      this.dialogVisible = false
      this.fileList = []
      this.uploadFileList = []
    },
    handleChange(file, fileList) {
      this.fileList = fileList
      const existIndex = this.uploadFileList.findIndex(f => f.uid === file.uid)
      if (existIndex === -1) {
        this.uploadFileList.push({
          uid: file.uid,
          name: file.name,
          size: file.size,
          raw: file.raw,
          status: 'ready',
          progress: 0,
          errorMsg: ''
        })
      }
    },
    removeFile(index) {
      const file = this.uploadFileList[index]
      this.uploadFileList.splice(index, 1)
      const fileListIndex = this.fileList.findIndex(f => f.uid === file.uid)
      if (fileListIndex > -1) {
        this.fileList.splice(fileListIndex, 1)
      }
    },
    clearFileList() {
      this.uploadFileList = []
      this.fileList = []
    },
    async handleSubmit() {
      const pendingFiles = this.uploadFileList.filter(f => f.status !== 'success' && f.status !== 'fail')
      if (pendingFiles.length === 0) {
        this.$message.warning('请先选择要上传的文件')
        return
      }
      this.uploading = true

      for (const item of pendingFiles) {
        try {
          item.status = 'uploading'
          item.progress = 10

          const contentType = item.raw.type || 'application/octet-stream'
          const presignedRes = await generateDocUploadUrl(item.name, contentType)

          if (presignedRes.code !== 200) {
            throw new Error(presignedRes.msg || '获取上传凭证失败')
          }

          item.progress = 30
          await presignedUpload(presignedRes.data.uploadUrl, item.raw, contentType, (percent) => {
            item.progress = 30 + Math.round(percent * 0.5)
          })

          item.progress = 80
          const docRes = await createShareDocByPath({
            filePath: presignedRes.data.filePath,
            docName: item.name,
            fileSize: item.size,
            mimeType: contentType
          })

          if (docRes.code !== 200) {
            throw new Error(docRes.msg || '创建文档记录失败')
          }

          item.status = 'success'
          item.progress = 100
        } catch (err) {
          item.status = 'fail'
          item.errorMsg = err.message || '上传失败'
          console.error('上传失败:', item.name, err)
        }
      }

      this.uploading = false
      this.$emit('success')
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
    }
  }
}
</script>

<style scoped>
.upload-container {
  max-height: 60vh;
  overflow-y: auto;
}

.upload-file-list {
  margin-top: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  color: #606266;
}

.file-list-content {
  max-height: 30vh;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
}

.file-item:last-child {
  border-bottom: none;
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-icon {
  font-size: 20px;
  color: #909399;
  flex-shrink: 0;
}

.file-detail {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.status-success {
  color: #67c23a;
}

.status-fail {
  color: #f56c6c;
}

.status-uploading {
  color: #409eff;
}

.file-progress {
  width: 100px;
  margin: 0 12px;
  flex-shrink: 0;
}

.file-actions {
  flex-shrink: 0;
}
</style>
