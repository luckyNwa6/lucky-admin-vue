<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
      <el-form-item :label="viewMode === 'user' ? '用户' : '角色'" prop="keyword">
        <el-input v-model="queryParams.keyword" :placeholder="viewMode === 'user' ? '搜索用户名或昵称' : '搜索角色（如 common）'" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-refresh" size="mini" @click="getList">刷新</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button size="mini" :type="viewMode === 'user' ? 'primary' : 'default'" @click="switchMode('user')">用户配额</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button size="mini" :type="viewMode === 'role' ? 'primary' : 'default'" @click="switchMode('role')">角色默认</el-button>
      </el-col>
      <el-col :span="1.5" v-if="viewMode === 'user'">
        <el-button size="mini" type="success" plain @click="handleProvision">补齐新用户</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-if="viewMode === 'role'" v-loading="loading" :data="filteredList">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column label="角色" align="center" min-width="120">
        <template slot-scope="scope">
          <el-tag :type="scope.row.role_key === 'admin' ? 'danger' : 'info'" effect="plain">{{ scope.row.role_key }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="绑定用户数" align="center" prop="user_count" width="110" />
      <el-table-column label="今日使用" align="center" width="180">
        <template slot-scope="scope">
          <span>主站 {{ scope.row.used || 0 }}</span>
          <template v-if="typeof scope.row.embed_used === 'number'">
            <span class="sep">｜</span>
            <span>嵌入 {{ scope.row.embed_used }}/{{ scope.row.embed_limit }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="剩余" align="center" width="150">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.limit >= 999999" type="success" size="small">无限制</el-tag>
          <el-tag v-else :type="scope.row.remaining <= 0 ? 'danger' : (scope.row.remaining <= 10 ? 'warning' : 'success')" size="small">
            主站 {{ scope.row.remaining }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="每日限额" align="center" width="180">
        <template slot-scope="scope">
          <el-input-number
            v-if="scope.row.role_key !== 'admin'"
            v-model="scope.row.limit"
            :min="0"
            :max="999999"
            :step="1"
            size="small"
            style="width: 130px"
            @change="val => handleLimitChange(scope.row, val)"
          />
          <el-tag v-else type="success" size="small">不限制</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="140">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-refresh-left" @click="handleReset(scope.row)" v-hasPermi="['ai:chat:quota:edit']">重置今日</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-table v-else v-loading="loading" :data="filteredList">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column label="用户" min-width="180">
        <template slot-scope="scope"><strong>{{ scope.row.nickname || scope.row.username }}</strong><div class="quota-subtitle">{{ scope.row.username }}</div></template>
      </el-table-column>
      <el-table-column label="角色" prop="roles" width="160" />
      <el-table-column label="今日使用" width="110" prop="used" align="center" />
      <el-table-column label="每日额度" width="170" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.is_admin" type="success" size="small">无限制</el-tag>
          <el-input-number v-else v-model="scope.row.limit" :min="0" :max="999999" size="small" style="width: 130px" @change="val => handleUserChange(scope.row, { limit: val })" />
        </template>
      </el-table-column>
      <el-table-column label="RPS" width="150" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.is_admin" type="success" size="small">不限</el-tag>
          <el-input-number v-else v-model="scope.row.rps" :min="0" :max="100" size="small" style="width: 115px" @change="val => handleUserChange(scope.row, { rps: val })" />
        </template>
      </el-table-column>
      <el-table-column label="剩余" width="100" align="center"><template slot-scope="scope">{{ scope.row.is_admin ? '无限' : scope.row.remaining }}</template></el-table-column>
      <el-table-column label="操作" width="110" align="center"><template slot-scope="scope"><el-button size="mini" type="text" @click="handleUserReset(scope.row)">重置今日</el-button></template></el-table-column>
    </el-table>
  </div>
</template>

<script>
import { listRoleQuota, updateRoleQuota, resetRoleQuota, listUserQuota, updateUserQuota, resetUserQuota, provisionUserQuota } from '@/api/chat'

export default {
  name: 'ChatQuota',
  data() {
    return {
      loading: false,
      showSearch: true,
      list: [],
      viewMode: 'user',
      queryParams: { keyword: '' }
    }
  },
  computed: {
    filteredList() {
      const kw = (this.queryParams.keyword || '').trim().toLowerCase()
      if (!kw) return this.list
      return this.list.filter(item => (item.role_key || '').toLowerCase().includes(kw))
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      const loader = this.viewMode === 'user' ? listUserQuota : listRoleQuota
      loader(this.queryParams).then(response => {
        this.list = response.data || []
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    switchMode(mode) {
      this.viewMode = mode
      this.getList()
    },
    handleQuery() {},
    resetQuery() {
      this.queryParams.keyword = ''
    },
    handleLimitChange(row, newLimit) {
      updateRoleQuota(row.role_key, { limit: newLimit }).then(() => {
        this.$modal.msgSuccess(`已设置角色 ${row.role_key} 的每日配额为 ${newLimit}`)
      }).catch(() => {
        this.getList()
      })
    },
    handleReset(row) {
      this.$modal.confirm(`确定要重置「${row.role_key}」角色下所有用户的今日配额吗？`).then(() => {
        return resetRoleQuota(row.role_key)
      }).then(() => {
        this.$modal.msgSuccess('配额已重置')
        this.getList()
      }).catch(() => {})
    },
    handleUserChange(row, data) {
      updateUserQuota(row.username, data).then(() => {
        this.$modal.msgSuccess('用户配额已更新')
        this.getList()
      }).catch(() => this.getList())
    },
    handleUserReset(row) {
      this.$modal.confirm(`确定要重置「${row.username}」今日配额吗？`).then(() => resetUserQuota(row.username)).then(() => {
        this.$modal.msgSuccess('用户今日配额已重置')
        this.getList()
      }).catch(() => {})
    },
    handleProvision() {
      provisionUserQuota().then(response => {
        this.$modal.msgSuccess(response.msg || '已补齐用户配额')
        this.getList()
      })
    }
  }
}
</script>

<style scoped>
.sep {
  margin: 0 4px;
  color: #c0c4cc;
}
</style>
