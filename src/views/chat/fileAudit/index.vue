<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>RAG 文件治理</span>
        <el-button style="float:right" size="mini" type="primary" @click="load">扫描</el-button>
        <el-button style="float:right;margin-right:8px" size="mini" type="danger" :disabled="!selected.length" @click="remove">删除选中</el-button>
      </div>
      <el-alert :title="summary" type="info" :closable="false" style="margin-bottom:16px" />
      <el-table :data="items" @selection-change="selected = $event" v-loading="loading">
        <el-table-column type="selection" width="50" />
        <el-table-column label="状态" prop="status" width="150" />
        <el-table-column label="路径" prop="relativePath" show-overflow-tooltip />
        <el-table-column label="大小" prop="size" width="120" />
        <el-table-column label="最后修改" width="180"><template slot-scope="scope">{{ formatDate(scope.row.lastModified) }}</template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { scanRagFiles, deleteRagFiles } from '@/api/ai/fileAudit'
export default {
  name: 'RagFileAudit',
  data() { return { loading: false, items: [], selected: [], info: {} } },
  computed: { summary() { const i = this.info; return `文件 ${i.totalFiles || 0} 个，${i.totalBytes || 0} bytes；已引用 ${i.referencedFiles || 0} 个；临时 ${i.temporaryFiles || 0} 个；孤儿候选 ${i.orphanFiles || 0} 个` } },
  created() { this.load() },
  methods: {
    load() { this.loading = true; scanRagFiles().then(r => { this.info = r.data || {}; this.items = this.info.items || [] }).finally(() => { this.loading = false }) },
    remove() { this.$confirm('仅删除未被对话引用的文件，是否继续？', '提示', { type: 'warning' }).then(() => deleteRagFiles({ urls: this.selected.map(x => x.url) })).then(() => { this.$modal.msgSuccess('删除完成'); this.load() }) },
    formatDate(value) { return value ? new Date(value).toLocaleString() : '-' },
  },
}
</script>
