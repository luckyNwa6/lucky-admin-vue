<template>
  <div class="app-container">
    <el-card shadow="never" class="intro-card">
      <div slot="header" class="clearfix">
        <span>公开接口链接</span>
        <el-button
          style="float: right"
          type="primary"
          size="mini"
          icon="el-icon-document-copy"
          @click="copyAll"
        >
          复制全部链接
        </el-button>
      </div>
      <div class="tip">
        这些接口无需 Admin 权限即可查询；仅开放列表读取，新增、修改、删除和其他接口仍受保护。
      </div>
    </el-card>

    <el-table :data="links" border class="link-table">
      <el-table-column label="名称" prop="name" width="150" />
      <el-table-column label="方法" prop="method" width="90" align="center" />
      <el-table-column label="接口地址" min-width="420">
        <template slot-scope="scope">
          <el-input :value="scope.row.url" readonly size="small">
            <el-button slot="append" icon="el-icon-document-copy" @click="copy(scope.row.url)">复制</el-button>
          </el-input>
        </template>
      </el-table-column>
      <el-table-column label="用途" prop="description" min-width="220" />
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'PublicLinks',
  data() {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://admin.luckynwa.top/proxyApi'
      : `${window.location.origin}/proxyApi`
    return {
      links: [
        {
          name: '经期记录列表',
          method: 'GET',
          url: `${baseUrl}/reminder/period/list`,
          description: '分页查询经期记录'
        },
        {
          name: '重要日期列表',
          method: 'GET',
          url: `${baseUrl}/reminder/date/list`,
          description: '分页查询重要日期'
        },
        {
          name: '启用的重要日期',
          method: 'GET',
          url: `${baseUrl}/reminder/date/listAll`,
          description: '查询全部启用的重要日期'
        }
      ]
    }
  },
  methods: {
    copy(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('链接已复制')
        }).catch(() => this.fallbackCopy(text))
      } else {
        this.fallbackCopy(text)
      }
    },
    copyAll() {
      this.copy(this.links.map(item => item.url).join('\n'))
    },
    fallbackCopy(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success('链接已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textarea)
    }
  }
}
</script>

<style scoped>
.intro-card {
  margin-bottom: 16px;
}

.tip {
  color: #606266;
  font-size: 13px;
}

.link-table {
  width: 100%;
}
</style>
