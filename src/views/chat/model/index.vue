<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
      <el-form-item label="模型名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入模型名称"
          clearable
          style="width: 240px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="平台" prop="platform">
        <el-select v-model="queryParams.platform" placeholder="请选择平台" clearable style="width: 240px">
          <el-option v-for="item in platformOptions" :key="item.code" :label="item.name" :value="item.code" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型" prop="modelType">
        <el-select v-model="queryParams.modelType" placeholder="请选择类型" clearable style="width: 240px">
          <el-option v-for="dict in dict.type.llm_type" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 240px">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd" v-hasPermi="['ai:chat:modelConfig:add']">
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
          v-hasPermi="['ai:chat:modelConfig:edit']"
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
          v-hasPermi="['ai:chat:modelConfig:remove']"
        >
          删除
        </el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="list" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="名称" prop="name" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="模型ID" prop="modelId" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="类型" width="110">
        <template slot-scope="scope">
          <dict-tag :options="dict.type.llm_type" :value="scope.row.modelType" />
        </template>
      </el-table-column>
      <el-table-column label="平台" width="100">
        <template slot-scope="scope">
          {{ scope.row.platformName || platformFormatter(scope.row) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="70">
        <template slot-scope="scope">
          <el-switch
            v-model="scope.row.status"
            active-value="active"
            inactive-value="disabled"
            @change="handleStatusChange(scope.row)"
          ></el-switch>
        </template>
      </el-table-column>
      <el-table-column label="OCR" align="center" width="70">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.visionOcrEnabled" type="success" size="mini">启用</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="工具调用" align="center" width="90">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.functionCallingEnabled === true" type="success" size="mini">支持</el-tag>
          <el-tag v-else-if="scope.row.functionCallingEnabled === false" type="danger" size="mini">不支持</el-tag>
          <span v-else>未知</span>
        </template>
      </el-table-column>
      <el-table-column label="次数额度" width="110">
        <template slot-scope="scope">
          {{ scope.row.quotaTotal === null ? '不限' : scope.row.quotaUsed + '/' + scope.row.quotaTotal }}
        </template>
      </el-table-column>
      <el-table-column label="Token额度" width="150">
        <template slot-scope="scope">
          {{
            scope.row.tokenQuotaTotal === null
              ? '不限'
              : Math.max(0, scope.row.tokenQuotaTotal - (scope.row.tokenQuotaUsed || 0)) + '/' + scope.row.tokenQuotaTotal
          }}
        </template>
      </el-table-column>
      <el-table-column label="过期时间" width="120">
        <template slot-scope="scope">
          {{ String(scope.row.expiresAt || '').slice(0, 10) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['ai:chat:modelConfig:edit']">
            修改
          </el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['ai:chat:modelConfig:remove']"
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

    <el-dialog :title="title" :visible.sync="open" width="900px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="128px" class="model-config-form">
        <div class="model-config-section">
          <div class="model-config-section-title">基本信息</div>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="配置名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入配置名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模型类型" prop="modelType">
                <el-select v-model="form.modelType" placeholder="请选择模型类型" @change="handleModelTypeChange">
                  <el-option v-for="dict in dict.type.llm_type" :key="dict.value" :label="dict.label" :value="dict.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="API 密钥" prop="apiKeyId">
                <el-select v-model="form.apiKeyId" placeholder="请选择 API 密钥" filterable @change="handleApiKeyChange">
                  <el-option-group v-for="group in apiKeyGroups" :key="group.code" :label="group.name">
                    <el-option v-for="item in group.keys" :key="item.id" :label="item.name" :value="item.id" />
                  </el-option-group>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="绑定平台">
                <el-input :value="selectedPlatformName" placeholder="选择 API 密钥后自动带出" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模型ID" prop="modelId">
                <el-input v-model="form.modelId" placeholder="请输入模型ID" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联角色" prop="roleId">
                <el-select v-model="form.roleId" placeholder="请选择角色" clearable filterable>
                  <el-option v-for="item in roleOptions" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="form.status">
                  <el-radio label="active">启用</el-radio>
                  <el-radio label="disabled">停用</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序" prop="sort">
                <el-input-number v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col v-if="isVisionModel" :span="24">
              <el-form-item label="扫描 PDF OCR">
                <el-checkbox v-model="form.visionOcrEnabled">
                  作为 OCR 模型（多个候选时使用启用且排序最靠前的模型）
                </el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="工具调用能力">
                <el-radio-group v-model="form.functionCallingEnabled">
                  <el-radio :label="true">支持</el-radio>
                  <el-radio :label="false">不支持</el-radio>
                  <el-radio :label="null">未知（由供应商响应判断）</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="model-config-section">
          <div class="model-config-section-title">运行与配额</div>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="温度" prop="temperature">
                <el-input-number
                  v-model="form.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :precision="1"
                  controls-position="right"
                  placeholder="留空使用厂商默认值"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大 Token" prop="maxTokens">
                <el-input-number v-model="form.maxTokens" :min="1" :step="128" controls-position="right" placeholder="留空使用厂商默认值" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上下文条数" prop="contextCount">
                <el-input-number v-model="form.contextCount" :min="1" :step="1" controls-position="right" placeholder="留空使用系统默认值" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="次数额度" prop="quotaTotal">
                <div class="quota-config">
                  <el-input-number
                    v-if="!quotaUnlimited"
                    v-model="form.quotaTotal"
                    :min="0"
                    :step="1"
                    controls-position="right"
                    style="flex: 1"
                  />
                  <el-checkbox v-model="quotaUnlimited" class="quota-unlimited">不限</el-checkbox>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <div class="quota-pair">
                <el-form-item label="Token 总额度" prop="tokenQuotaTotal">
                  <div class="quota-config">
                    <el-input-number
                      v-if="!tokenQuotaUnlimited"
                      v-model="form.tokenQuotaTotal"
                      :min="0"
                      :step="1"
                      controls-position="right"
                      style="flex: 1"
                      @change="handleTokenTotalChange"
                    />
                    <el-checkbox v-model="tokenQuotaUnlimited" class="quota-unlimited" @change="handleTokenUnlimitedChange">
                      不限
                    </el-checkbox>
                  </div>
                </el-form-item>
                <el-form-item label="剩余额度">
                  <el-input-number
                    v-if="!tokenQuotaUnlimited"
                    v-model="tokenRemaining"
                    :min="0"
                    :max="999999999999"
                    :step="1"
                    controls-position="right"
                    style="width: 100%"
                  />
                  <el-input v-else :value="'不限'" disabled />
                </el-form-item>
              </div>
            </el-col>
            <el-col :span="24">
              <el-form-item label="过期时间" prop="expiresAt">
                <el-date-picker
                  v-model="form.expiresAt"
                  type="date"
                  value-format="yyyy-MM-dd"
                  placeholder="留空表示永不过期"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="model-config-section">
          <div class="model-config-section-title">备注</div>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="512" show-word-limit placeholder="请输入备注" />
          </el-form-item>
        </div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button v-if="form.id" type="success" plain icon="el-icon-copy-document" @click="handleCopy">复制并新建</el-button>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listModel, getModel, addModel, updateModel, delModel, listApiKey, listPlatform, listRole } from '@/api/chat'

export default {
  name: 'ChatModel',
  dicts: ['llm_type'],
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
      platformOptions: [],
      apiKeyOptions: [],
      roleOptions: [],
      quotaUnlimited: true,
      tokenQuotaUnlimited: true,
      tokenRemaining: null,
      usageRefreshTimer: null,
      queryParams: { pageNum: 1, pageSize: 10, name: undefined, platform: undefined, modelType: undefined, status: undefined },
      form: {},
      rules: {
        name: [{ required: true, message: '配置名称不能为空', trigger: 'blur' }],
        apiKeyId: [{ required: true, message: 'API 密钥不能为空', trigger: 'change' }],
        modelId: [{ required: true, message: '模型ID不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
    this.loadOptions()
    this.usageRefreshTimer = setInterval(() => this.getList(), 15000)
  },
  beforeDestroy() {
    clearInterval(this.usageRefreshTimer)
  },
  computed: {
    apiKeyGroups() {
      const groups = []
      const byPlatform = {}
      const indexedOptions = (this.platformOptions || []).map((item, index) => ({ ...item, index }))
      const keys = (this.apiKeyOptions || []).slice()
      keys.forEach((key) => {
        const code = key.platform || ''
        if (!byPlatform[code]) {
          const name = this.platformCodeFormatter(code)
          const matched = indexedOptions.find(item => item.code === code)
          byPlatform[code] = {
            code,
            name,
            index: matched ? matched.index : Number.MAX_SAFE_INTEGER,
            keys: []
          }
        }
        byPlatform[code].keys.push(key)
      })
      groups.push(...Object.values(byPlatform))
      groups.sort((a, b) => a.index - b.index)
      return groups
    },
    selectedPlatformName() {
      if (!this.form.apiKeyId) {
        return this.platformCodeFormatter(this.form.platform)
      }
      const key = (this.apiKeyOptions || []).find(item => item.id === this.form.apiKeyId)
      const code = key ? key.platform : this.form.platform
      return this.platformCodeFormatter(code)
    },
    isVisionModel() {
      return ['vision', 'multimodal'].includes(this.form.modelType)
    }
  },
  methods: {
    getList() {
      this.loading = true
      listModel(this.queryParams)
        .then((response) => {
          this.list = response.rows
          this.total = response.total
          this.loading = false
        })
        .catch(() => {
          this.loading = false
        })
    },
    loadOptions() {
      listPlatform({ pageNum: 1, pageSize: 100 }).then((res) => {
        this.platformOptions = res.rows || []
      })
      listApiKey({ pageNum: 1, pageSize: 100 }).then((res) => {
        this.apiKeyOptions = res.rows || []
        if (this.form.apiKeyId) {
          this.syncPlatformFromApiKey()
        }
      })
      listRole({ pageNum: 1, pageSize: 100 }).then((res) => {
        this.roleOptions = res.rows || []
      })
    },
    handleStatusChange(row) {
      const text = row.status === 'active' ? '启用' : '停用'
      this.$modal
        .confirm('确认要"' + text + '" "' + row.name + '"模型吗？')
        .then(() => {
          return updateModel(row)
        })
        .then(() => {
          this.$modal.msgSuccess(text + '成功')
        })
        .catch(() => {
          row.status = row.status === 'active' ? 'disabled' : 'active'
        })
    },
    platformFormatter(row) {
      const code = row.platform
      const option = this.platformOptions.find(item => item.code === code)
      return option ? option.name : code
    },
    handleApiKeyChange() {
      this.syncPlatformFromApiKey()
    },
    handleModelTypeChange() {
      if (!this.isVisionModel) {
        this.form.visionOcrEnabled = false
      }
    },
    syncPlatformFromApiKey() {
      const key = (this.apiKeyOptions || []).find(item => item.id === this.form.apiKeyId)
      if (key) {
        this.form.platform = key.platform
      }
    },
    platformCodeFormatter(code) {
      const option = this.platformOptions.find(item => item.code === code)
      return option ? option.name : code
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
      this.quotaUnlimited = true
      this.tokenQuotaUnlimited = true
      this.tokenRemaining = null
      this.form = {
        status: 'active',
        modelType: 'text',
        sort: 0,
        visionOcrEnabled: false,
        functionCallingEnabled: null,
        temperature: null,
        maxTokens: null,
        contextCount: null,
        expiresAt: null,
        quotaTotal: null,
        quotaUsed: 0,
        tokenQuotaTotal: null,
        tokenQuotaUsed: 0
      }
    },
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增模型配置'
    },
    handleUpdate(row) {
      this.reset()
      const id = row.id || this.ids[0]
      getModel(id).then((response) => {
        this.form = response.data
        this.form.visionOcrEnabled = Boolean(this.form.visionOcrEnabled)
        if (this.form.functionCallingEnabled !== true && this.form.functionCallingEnabled !== false) {
          this.form.functionCallingEnabled = null
        }
        if (this.form.expiresAt) {
          this.form.expiresAt = String(this.form.expiresAt).slice(0, 10)
        }
        this.quotaUnlimited = this.form.quotaTotal === null || this.form.quotaTotal === undefined
        this.syncTokenRemaining()
        this.syncPlatformFromApiKey()
        this.open = true
        this.title = '修改模型配置'
      })
    },
    syncTokenRemaining() {
      const total = this.form.tokenQuotaTotal
      this.tokenQuotaUnlimited = total === null || total === undefined
      if (this.tokenQuotaUnlimited) {
        this.tokenRemaining = null
        return
      }
      const used = Number(this.form.tokenQuotaUsed || 0)
      this.tokenRemaining = Math.max(0, Number(total) - used)
    },
    handleTokenTotalChange() {
      if (this.tokenQuotaUnlimited) {
        return
      }
      const total = Number(this.form.tokenQuotaTotal)
      if (!Number.isFinite(total)) {
        return
      }
      const used = Number(this.form.tokenQuotaUsed || 0)
      this.tokenRemaining = Math.max(0, total - used)
    },
    handleTokenUnlimitedChange(checked) {
      if (checked) {
        this.form.tokenQuotaTotal = null
        this.form.tokenQuotaUsed = 0
        this.tokenRemaining = null
      } else {
        if (this.form.tokenQuotaTotal === null || this.form.tokenQuotaTotal === undefined) {
          this.form.tokenQuotaTotal = 0
        }
        this.syncTokenRemaining()
      }
    },
    prepareData() {
      if (!this.quotaUnlimited && (this.form.quotaTotal === null || this.form.quotaTotal === undefined || this.form.quotaTotal === '')) {
        this.$modal.msgError('请填写次数额度或勾选不限')
        return null
      }
      if (!this.tokenQuotaUnlimited) {
        if (this.form.tokenQuotaTotal === null || this.form.tokenQuotaTotal === undefined || this.form.tokenQuotaTotal === '') {
          this.$modal.msgError('请填写 Token 总额度或勾选不限')
          return null
        }
        if (this.tokenRemaining === null || this.tokenRemaining === undefined || this.tokenRemaining === '') {
          this.$modal.msgError('请填写 Token 剩余额度')
          return null
        }
        const total = Number(this.form.tokenQuotaTotal)
        const remaining = Number(this.tokenRemaining)
        if (remaining > total) {
          this.$modal.msgError('剩余额度不能大于 Token 总额度')
          return null
        }
      }
      const data = { ...this.form }
      data.visionOcrEnabled = this.isVisionModel && Boolean(data.visionOcrEnabled)
      data.clearFunctionCallingEnabled = data.functionCallingEnabled === null || data.functionCallingEnabled === undefined
      data.clearTemperature = data.temperature === null || data.temperature === undefined || data.temperature === ''
      data.clearMaxTokens = data.maxTokens === null || data.maxTokens === undefined || data.maxTokens === ''
      data.clearContextCount = data.contextCount === null || data.contextCount === undefined || data.contextCount === ''
      data.clearExpiresAt = !data.expiresAt
      if (this.quotaUnlimited) {
        data.quotaTotal = null
        data.quotaUsed = 0
      }
      if (this.tokenQuotaUnlimited) {
        data.tokenQuotaTotal = null
        data.tokenQuotaUsed = 0
      } else {
        data.tokenQuotaUsed = Math.max(0, Number(data.tokenQuotaTotal) - Number(this.tokenRemaining))
      }
      if (data.expiresAt) {
        data.expiresAt = String(data.expiresAt).length > 10 ? data.expiresAt : data.expiresAt + ' 00:00:00'
      }
      return data
    },
    handleCopy() {
      if (!this.form.id) {
        return
      }
      this.$refs['form'].validate((valid) => {
        if (!valid) {
          return
        }
        const data = this.prepareData()
        if (!data) {
          return
        }
        data.id = undefined
        data.userId = undefined
        data.quotaUsed = 0
        data.tokenQuotaUsed = 0
        data.createdAt = undefined
        data.updatedAt = undefined
        data.expiryRemindedAt = undefined
        this.$modal
          .confirm('确认复制当前模型配置并新建一条？')
          .then(() => {
            return addModel(data)
          })
          .then(() => {
            this.$modal.msgSuccess('复制成功')
            this.open = false
            this.getList()
          })
          .catch(() => {})
      })
    },
    submitForm() {
      this.$refs['form'].validate((valid) => {
        if (!valid) {
          return
        }
        const data = this.prepareData()
        if (!data) {
          return
        }
        if (this.form.id) {
          updateModel(data).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.open = false
            this.getList()
          })
        } else {
          addModel(data).then(() => {
            this.$modal.msgSuccess('新增成功')
            this.open = false
            this.getList()
          })
        }
      })
    },
    handleDelete(row) {
      const ids = row.id || this.ids.join(',')
      this.$modal
        .confirm('是否确认删除选中的模型配置？')
        .then(() => {
          return delModel(ids)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    cancel() {
      this.open = false
      this.reset()
    }
  }
}
</script>

<style scoped>
.model-config-form .el-form-item {
  margin-bottom: 14px;
}

.quota-pair {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  width: 100%;
  margin-bottom: 18px;
}

.quota-pair > .el-form-item {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.model-config-form .el-form-item__content .el-select,
.model-config-form .el-form-item__content .el-radio-group,
.model-config-form .el-form-item__content .el-input {
  width: 100%;
}

.model-config-form .el-radio-group .el-radio + .el-radio {
  margin-left: 28px;
}

.model-config-section + .model-config-section {
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.model-config-section-title {
  position: relative;
  margin-bottom: 16px;
  padding-left: 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: #303133;
}

.model-config-section-title::before {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 3px;
  border-radius: 2px;
  background: #409eff;
  content: '';
}

.quota-config {
  display: flex;
  align-items: center;
  width: 100%;
}

.quota-config .el-input-number {
  flex: 1;
}

.quota-unlimited {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
