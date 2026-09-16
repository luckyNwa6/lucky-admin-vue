<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
      <el-form-item label="嵌入名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入嵌入名称"
          clearable
          style="width: 240px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd" v-hasPermi="['ai:chat:embedConfig:add']">
          新增
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="el-icon-edit"
          size="mini"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['ai:chat:embedConfig:edit']"
        >
          修改
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="el-icon-delete"
          size="mini"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['ai:chat:embedConfig:remove']"
        >
          删除
        </el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="list" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="嵌入名称" prop="name" min-width="130" :show-overflow-tooltip="true" />
      <el-table-column label="配额角色" prop="quotaRoleKey" width="110" />
      <el-table-column label="API Key" min-width="130" :show-overflow-tooltip="true">
        <template slot-scope="scope">
          <span class="api-key-text">{{ scope.row.apiKey }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template slot-scope="scope">
          <el-tag :type="scope.row.isActive ? 'success' : 'info'">{{ scope.row.isActive ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建人" prop="createdByName" width="110" :show-overflow-tooltip="true">
        <template slot-scope="scope">
          <span>{{ scope.row.createdByName || scope.row.createdBy || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新人" width="110" :show-overflow-tooltip="true">
        <template slot-scope="scope">
          <span>{{ scope.row.updatedByName || scope.row.updatedBy || scope.row.createdByName || scope.row.createdBy || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" width="180">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="欢迎语" prop="welcomeMessage" min-width="120" :show-overflow-tooltip="true" />
      <el-table-column label="主题色" width="90">
        <template slot-scope="scope">
          <span class="color-dot" :style="{ background: scope.row.themeColor || '#409EFF' }"></span>
        </template>
      </el-table-column>
      <el-table-column label="域名白名单" prop="allowedOrigins" min-width="180" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button
            size="mini"
            type="text"
            icon="el-icon-link"
            @click="handleShowCode(scope.row)"
            v-hasPermi="['ai:chat:embedConfig:query']"
          >
            嵌入代码
          </el-button>
          <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['ai:chat:embedConfig:edit']">
            修改
          </el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['ai:chat:embedConfig:remove']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog :title="title" :visible.sync="open" width="600px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="嵌入名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入嵌入名称" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="form.apiKey" placeholder="请输入嵌入小部件 API Key" show-password />
        </el-form-item>
        <el-form-item label="配额角色" prop="quotaRoleKey">
          <el-select v-model="form.quotaRoleKey" placeholder="请选择配额角色" clearable filterable style="width: 100%">
            <el-option v-for="roleKey in quotaRoleOptions" :key="roleKey" :label="roleKey" :value="roleKey" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" />
        </el-form-item>
        <el-form-item label="欢迎语" prop="welcomeMessage">
          <el-input v-model="form.welcomeMessage" type="textarea" :rows="2" placeholder="请输入欢迎语" />
        </el-form-item>
        <el-form-item label="主题色" prop="themeColor">
          <el-color-picker v-model="form.themeColor" />
        </el-form-item>
        <el-form-item label="域名白名单" prop="allowedOrigins">
          <el-input v-model="form.allowedOrigins" type="textarea" :rows="2" placeholder='JSON 数组，如 ["blog.luckynwa.top"]' />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>

    <el-dialog title="嵌入代码" :visible.sync="codeDialogVisible" width="650px" append-to-body>
      <div class="code-tip">
        <p>
          将以下代码添加到您网站的
          <code>&lt;body&gt;</code>
          标签前：
        </p>
      </div>
      <el-input v-model="embedCode" type="textarea" :rows="4" readonly style="font-family: monospace" />
      <div class="code-hint">
        <p>用户访问您的网站时，右下角会显示聊天气泡，点击即可开始对话。</p>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="codeDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyEmbedCode">复制代码</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listEmbed, getEmbed, addEmbed, updateEmbed, delEmbed, listRoleQuota } from '@/api/chat'

export default {
  name: 'ChatEmbed',
  data() {
    return {
      loading: false,
      showSearch: true,
      list: [],
      total: 0,
      ids: [],
      single: true,
      multiple: true,
      open: false,
      title: '',
      codeDialogVisible: false,
      embedCode: '',
      quotaRoleOptions: [],
      queryParams: { pageNum: 1, pageSize: 10, name: undefined },
      form: {},
      rules: {
        name: [{ required: true, message: '嵌入名称不能为空', trigger: 'blur' }],
        apiKey: [{ required: true, message: 'API Key 不能为空', trigger: 'blur' }],
      },
    }
  },
  created() {
    this.getList()
    this.getQuotaRoles()
  },
  methods: {
    getList() {
      this.loading = true
      listEmbed(this.queryParams)
        .then((response) => {
          this.list = response.rows
          this.total = response.total
          this.loading = false
        })
        .catch(() => {
          this.loading = false
        })
    },
    getQuotaRoles() {
      listRoleQuota().then((response) => {
        this.quotaRoleOptions = (response.data || []).map((item) => item.role_key).filter(Boolean)
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
      this.ids = selection.map((item) => item.id)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    reset() {
      this.form = { isActive: true, themeColor: '#409EFF', quotaRoleKey: 'common' }
    },
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增嵌入配置'
    },
    handleUpdate(row) {
      this.reset()
      const id = row.id || this.ids[0]
      getEmbed(id).then((response) => {
        this.form = response.data
        this.open = true
        this.title = '修改嵌入配置'
      })
    },
    submitForm() {
      this.$refs['form'].validate((valid) => {
        if (valid) {
          const data = { ...this.form }
          try {
            if (data.allowedOrigins && typeof data.allowedOrigins === 'string' && !data.allowedOrigins.startsWith('[')) {
              data.allowedOrigins = JSON.stringify(
                data.allowedOrigins
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          } catch (e) {
            /* ignore */
          }
          if (this.form.id) {
            updateEmbed(data).then(() => {
              this.$modal.msgSuccess('修改成功')
              this.open = false
              this.getList()
            })
          } else {
            addEmbed(data).then(() => {
              this.$modal.msgSuccess('新增成功')
              this.open = false
              this.getList()
            })
          }
        }
      })
    },
    handleDelete(row) {
      const ids = row.id || this.ids.join(',')
      this.$modal
        .confirm('是否确认删除选中的嵌入配置？')
        .then(() => {
          return delEmbed(ids)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    handleShowCode(row) {
      const params = new URLSearchParams({ api_key: row.apiKey })
      this.embedCode = `<script src="https://rag.luckynwa.top/widget.js?${params.toString()}"><\/script>`
      this.codeDialogVisible = true
    },
    copyEmbedCode() {
      navigator.clipboard.writeText(this.embedCode).then(() => {
        this.$modal.msgSuccess('嵌入代码已复制到剪贴板')
      })
    },
    cancel() {
      this.open = false
      this.reset()
    },
  },
}
</script>

<style scoped>
.color-dot {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  vertical-align: middle;
}
.api-key-text {
  font-family: monospace;
  word-break: break-all;
}
</style>
