import request from '@/utils/request'

// ==================== 概览 ====================

export function listDocument(query) {
  return request({
    url: '/ai/chat/document/list',
    method: 'get',
    params: query
  })
}

export function listModel(query) {
  return request({
    url: '/ai/chat/modelConfig/list',
    method: 'get',
    params: query
  })
}

export function listApiKey(query) {
  return request({
    url: '/ai/chat/apiKey/list',
    method: 'get',
    params: query
  })
}

export function listPlatform(query) {
  return request({
    url: '/ai/chat/platform/list',
    method: 'get',
    params: query
  })
}

export function listRole(query) {
  return request({
    url: '/ai/chat/chatRole/list',
    method: 'get',
    params: query
  })
}

export function listEmbed(query) {
  return request({
    url: '/ai/chat/embedConfig/list',
    method: 'get',
    params: query
  })
}

// ==================== 文档 ====================

export function delDocument(ids) {
  return request({
    url: '/ai/chat/document/' + ids,
    method: 'delete'
  })
}

export function getDocument(id) {
  return request({
    url: '/ai/chat/document/' + id,
    method: 'get'
  })
}

export function listDocumentChunks(id, query) {
  return request({
    url: '/ai/chat/document/' + id + '/chunks',
    method: 'get',
    params: query
  })
}

export function uploadDocument(data) {
  return request({
    url: '/ai/chat/document/upload',
    method: 'post',
    data: data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ==================== 模型配置 ====================

export function getModel(id) {
  return request({
    url: '/ai/chat/modelConfig/' + id,
    method: 'get'
  })
}

export function addModel(data) {
  return request({
    url: '/ai/chat/modelConfig',
    method: 'post',
    data: data
  })
}

export function updateModel(data) {
  return request({
    url: '/ai/chat/modelConfig',
    method: 'put',
    data: data
  })
}

export function delModel(ids) {
  return request({
    url: '/ai/chat/modelConfig/' + ids,
    method: 'delete'
  })
}

// ==================== API 密钥 ====================

export function getApiKey(id) {
  return request({
    url: '/ai/chat/apiKey/' + id,
    method: 'get'
  })
}

export function addApiKey(data) {
  return request({
    url: '/ai/chat/apiKey',
    method: 'post',
    data: data
  })
}

export function updateApiKey(data) {
  return request({
    url: '/ai/chat/apiKey',
    method: 'put',
    data: data
  })
}

export function delApiKey(ids) {
  return request({
    url: '/ai/chat/apiKey/' + ids,
    method: 'delete'
  })
}

// ==================== 平台 ====================

export function getPlatform(id) {
  return request({
    url: '/ai/chat/platform/' + id,
    method: 'get'
  })
}

export function addPlatform(data) {
  return request({
    url: '/ai/chat/platform',
    method: 'post',
    data: data
  })
}

export function updatePlatform(data) {
  return request({
    url: '/ai/chat/platform',
    method: 'put',
    data: data
  })
}

export function delPlatform(ids) {
  return request({
    url: '/ai/chat/platform/' + ids,
    method: 'delete'
  })
}

// ==================== 聊天角色 ====================

export function getRole(id) {
  return request({
    url: '/ai/chat/chatRole/' + id,
    method: 'get'
  })
}

export function addRole(data) {
  return request({
    url: '/ai/chat/chatRole',
    method: 'post',
    data: data
  })
}

export function updateRole(data) {
  return request({
    url: '/ai/chat/chatRole',
    method: 'put',
    data: data
  })
}

export function delRole(ids) {
  return request({
    url: '/ai/chat/chatRole/' + ids,
    method: 'delete'
  })
}

// ==================== 嵌入配置 ====================

export function getEmbed(id) {
  return request({
    url: '/ai/chat/embedConfig/' + id,
    method: 'get'
  })
}

export function addEmbed(data) {
  return request({
    url: '/ai/chat/embedConfig',
    method: 'post',
    data: data
  })
}

export function updateEmbed(data) {
  return request({
    url: '/ai/chat/embedConfig',
    method: 'put',
    data: data
  })
}

export function delEmbed(ids) {
  return request({
    url: '/ai/chat/embedConfig/' + ids,
    method: 'delete'
  })
}

// ==================== 配额 ====================

export function listRoleQuota() {
  return request({
    url: '/ai/chat/quota/roles',
    method: 'get'
  })
}

export function updateRoleQuota(roleKey, data) {
  return request({
    url: '/ai/chat/quota/role/' + roleKey,
    method: 'put',
    data: data
  })
}

export function resetRoleQuota(roleKey) {
  return request({
    url: '/ai/chat/quota/role/' + roleKey + '/reset',
    method: 'post'
  })
}

export function listUserQuota(query) {
  return request({
    url: '/ai/chat/quota/users',
    method: 'get',
    params: query
  })
}

export function updateUserQuota(username, data) {
  return request({
    url: '/ai/chat/quota/user/' + encodeURIComponent(username),
    method: 'put',
    data: data
  })
}

export function resetUserQuota(username) {
  return request({
    url: '/ai/chat/quota/user/' + encodeURIComponent(username) + '/reset',
    method: 'post'
  })
}

export function provisionUserQuota() {
  return request({
    url: '/ai/chat/quota/provision',
    method: 'post'
  })
}

// ==================== 会话历史 ====================

export function listSession(chatType, query) {
  return request({
    url: '/ai/chat/session/list/' + chatType,
    method: 'get',
    params: query
  })
}

export function getSession(chatType, sessionId) {
  return request({
    url: '/ai/chat/session/' + chatType + '/' + sessionId,
    method: 'get'
  })
}

export function delSession(chatType, sessionId) {
  return request({
    url: '/ai/chat/session/' + chatType + '/' + sessionId,
    method: 'delete'
  })
}

export function batchDeleteSession(chatType, ids) {
  return request({
    url: '/ai/chat/session/batch-delete/' + chatType,
    method: 'post',
    data: { ids: ids }
  })
}

export function clearChatCache() {
  return request({
    url: '/ai/chat/cache',
    method: 'delete'
  })
}
