import request from '@/utils/request'

/**
 * 文档列表
 * @param {Object} data - 查询参数
 * @param {string} data.docName - 文档名称搜索（可选）
 * @param {string} data.docType - 文档类型筛选（可选，excel/word/md/pdf/txt）
 * @param {number} data.page - 页码
 * @param {number} data.limit - 每页数量
 * @returns {Promise}
 */
export function listShareDocs(data) {
  return request({
    url: '/shareDoc/list',
    method: 'post',
    data
  })
}

/**
 * 上传文档
 * @param {File} file - 文件对象
 * @param {string} docName - 文档名称（可选）
 * @param {string} remark - 备注（可选）
 * @returns {Promise}
 */
export function uploadShareDoc(file, docName, remark) {
  const formData = new FormData()
  formData.append('file', file)
  if (docName) {
    formData.append('docName', docName)
  }
  if (remark) {
    formData.append('remark', remark)
  }
  return request({
    url: '/shareDoc/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 根据R2路径创建文档记录
 * @param {Object} data - 文档信息
 * @param {string} data.filePath - R2文件路径
 * @param {string} data.docName - 文档名称
 * @param {number} data.fileSize - 文件大小
 * @param {string} data.mimeType - MIME类型
 * @returns {Promise}
 */
export function createShareDocByPath(data) {
  return request({
    url: '/shareDoc/createByPath',
    method: 'post',
    data
  })
}

/**
 * 生成文档上传预签名URL（允许覆盖同名文件）
 * @param {string} fileName - 文件名
 * @param {string} contentType - MIME类型
 * @returns {Promise}
 */
export function generateDocUploadUrl(fileName, contentType) {
  return request({
    url: '/shareDoc/generateUploadUrl',
    method: 'post',
    data: { fileName, contentType },
    headers: { silentError: true, repeatSubmit: false }
  })
}

/**
 * 删除文档
 * @param {number} id - 文档ID
 * @returns {Promise}
 */
export function deleteShareDoc(id) {
  return request({
    url: '/shareDoc/delete',
    method: 'post',
    data: { id }
  })
}

/**
 * 批量删除文档
 * @param {Array} ids - 文档ID列表
 * @returns {Promise}
 */
export function deleteShareDocs(ids) {
  return request({
    url: '/shareDoc/deleteBatch',
    method: 'post',
    data: ids
  })
}

/**
 * 获取文档信息
 * @param {number} id - 文档ID
 * @returns {Promise}
 */
export function getShareDocInfo(id) {
  return request({
    url: '/shareDoc/info',
    method: 'get',
    params: { id }
  })
}

/**
 * 更新文档信息
 * @param {number} id - 文档ID
 * @param {string} docName - 文档名称（可选）
 * @param {string} remark - 备注（可选）
 * @returns {Promise}
 */
export function updateShareDoc(id, docName, remark) {
  return request({
    url: '/shareDoc/update',
    method: 'post',
    data: { id, docName, remark }
  })
}

export function updateShareDocSettings(data) {
  return request({
    url: '/shareDoc/settings',
    method: 'post',
    data
  })
}

/**
 * 获取文档预览URL
 * @param {number} id - 文档ID
 * @returns {Promise}
 */
export function getShareDocPreviewUrl(id) {
  return request({
    url: '/shareDoc/preview',
    method: 'get',
    params: { id }
  })
}

/**
 * 获取文档下载URL
 * @param {number} id - 文档ID
 * @returns {Promise}
 */
export function getShareDocDownloadUrl(id) {
  return request({
    url: '/shareDoc/download',
    method: 'get',
    params: { id }
  })
}
