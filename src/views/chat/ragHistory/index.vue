<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
      <el-form-item label="标题" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="请输入会话标题" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleBatchDelete" v-hasPermi="['ai:chat:session:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="el-icon-delete-solid" size="mini" @click="handleClearCache" v-hasPermi="['ai:chat:session:remove']">清空语义缓存</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="list" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="标题" prop="title" min-width="220" :show-overflow-tooltip="true" />
      <el-table-column label="用户" prop="username" width="120" :show-overflow-tooltip="true" />
      <el-table-column label="来源" prop="source" width="120">
        <template slot-scope="scope">
          <el-tag :type="getSourceType(scope.row.source)" size="small">{{ getSourceLabel(scope.row.source) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="消息数" prop="message_count" width="90" />
      <el-table-column label="模型配置" width="220" :show-overflow-tooltip="true">
        <template slot-scope="scope">
          <span>{{ scope.row.model_name || scope.row.model_config_id || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" prop="updated_at" width="170">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)" v-hasPermi="['ai:chat:session:query']">详情</el-button>
          <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['ai:chat:session:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="detailTitle" :visible.sync="detailOpen" width="70%" append-to-body top="5vh">
      <div class="history-detail" v-if="detail.session">
        <el-descriptions :column="3" border class="history-detail-meta">
          <el-descriptions-item label="会话标题">
            <span class="conv-id">{{ detail.session.title || '(未命名会话)' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="消息数">
            {{ detail.session.message_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ detail.session.updated_at }}
          </el-descriptions-item>
          <el-descriptions-item label="提问用户">
            <el-tag type="info" size="small">{{ detail.session.username || detail.session.user_id || '未知' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            <el-tag :type="getSourceType(detail.session.source)" size="small">{{ getSourceLabel(detail.session.source) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模型配置">
            {{ detail.session.model_name || detail.session.model_config_id || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="history-messages">
          <div v-for="(msg, idx) in detail.messages" :key="msg.id || idx" class="history-message-item">
            <div class="msg-q">
              <span class="msg-role">用户</span>
              <span class="msg-text">{{ msg.question }}</span>
            </div>
            <div class="msg-a">
              <span class="msg-role">小维</span>
              <div class="msg-a-body">
                <div class="msg-a-text markdown-body" v-html="renderMarkdown(msg.answer || '')"></div>
                <div class="msg-a-meta">
                  <el-tag v-if="typeof msg.confidence === 'number'" :type="getConfidenceType(msg.confidence)" size="small" effect="plain">
                    置信度 {{ Math.round(msg.confidence * 100) }}%
                  </el-tag>
                  <el-tag v-if="msg.cached" type="success" size="small" effect="plain">缓存</el-tag>
                  <el-tag v-for="s in msg.sources || []" :key="s.doc_id || s.doc_name" size="small" type="info" effect="plain">
                    📄 {{ s.doc_name }}
                  </el-tag>
                  <el-tag v-if="msg.stats && msg.stats.tokens_per_second" type="success" size="small" effect="plain">
                    {{ msg.stats.tokens_per_second }} token/s
                  </el-tag>
                  <el-tag v-if="msg.stats && msg.stats.elapsed_seconds" type="warning" size="small" effect="plain">
                    总耗时 {{ formatDuration(msg.stats.elapsed_seconds) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-if="!detail.messages || !detail.messages.length" description="该对话暂无消息" />
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailOpen = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listSession, getSession, delSession, batchDeleteSession, clearChatCache } from '@/api/chat'
import { marked } from 'marked'

export default {
  name: 'ChatRagHistory',
  data() {
    return {
      chatType: 'rag',
      loading: false,
      showSearch: true,
      list: [],
      total: 0,
      ids: [],
      multiple: true,
      detailOpen: false,
      detail: {},
      detailTitle: '会话详情',
      queryParams: { pageNum: 1, pageSize: 10, keyword: undefined }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listSession(this.chatType, this.queryParams).then(response => {
        this.list = response.rows
        this.total = response.total
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.multiple = !selection.length
    },
    handleView(row) {
      getSession(this.chatType, row.id).then(response => {
        this.detail = response.data || {}
        this.detailTitle = this.detail.session ? (this.detail.session.title || '会话详情') : '会话详情'
        this.detailOpen = true
      })
    },
    renderMarkdown(content) {
      if (!content) return ''
      return marked.parse(content, { gfm: true, breaks: true })
    },
    getConfidenceType(confidence) {
      if (confidence >= 0.7) return 'success'
      if (confidence >= 0.4) return 'warning'
      return 'danger'
    },
    getSourceLabel(source) {
      return { scheduled_task: '定时任务', embed: '嵌入组件', ai_platform: 'AI平台' }[source] || 'AI平台'
    },
    getSourceType(source) {
      return { scheduled_task: 'warning', embed: 'success', ai_platform: 'primary' }[source] || 'info'
    },
    formatDuration(seconds) {
      const value = Number(seconds) || 0
      if (value < 60) return (Math.round(value * 10) / 10) + ' 秒'
      let minutes = Math.floor(value / 60)
      let rest = Math.round(value % 60)
      if (rest >= 60) {
        minutes += 1
        rest = 0
      }
      return minutes + ' 分 ' + rest + ' 秒'
    },
    handleDelete(row) {
      this.$modal.confirm('是否确认删除该会话？').then(() => {
        return delSession(this.chatType, row.id)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess('删除成功')
      }).catch(() => {})
    },
    handleBatchDelete() {
      if (!this.ids.length) return
      this.$modal.confirm('是否确认删除选中的会话？').then(() => {
        return batchDeleteSession(this.chatType, this.ids)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess('删除成功')
      }).catch(() => {})
    },
    handleClearCache() {
      this.$modal.confirm('是否确认清空全部语义缓存？').then(() => {
        return clearChatCache()
      }).then(() => {
        this.$modal.msgSuccess('语义缓存已清空')
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.history-detail-meta {
  margin-bottom: 12px;
}
.history-messages {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.history-message-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
}
.msg-q,
.msg-a {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.7;
}
.msg-a {
  margin-top: 8px;
}
.msg-role {
  flex-shrink: 0;
  width: 40px;
  text-align: center;
  font-size: 12px;
  line-height: 22px;
  border-radius: 4px;
  background: #f0f2f5;
  color: #606266;
}
.msg-a .msg-role {
  background: #ecf5ff;
  color: #409eff;
}
.msg-text {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-a-body {
  flex: 1;
  min-width: 0;
}
.msg-a-text {
  white-space: normal;
}
.msg-a-meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
