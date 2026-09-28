import request from '@/utils/request'

export function listAgentMarket(query) { return request({ url: '/ai/agent/market/list', method: 'get', params: query }) }
export function listAgentUserResources(query) { return request({ url: '/ai/agent/market/user-resource/list', method: 'get', params: query }) }
export function getAgentUserMcp(id) { return request({ url: `/ai/agent/market/user-mcp/${id}`, method: 'get' }) }
export function updateAgentUserMcp(id, data) { return request({ url: `/ai/agent/market/user-mcp/${id}`, method: 'put', data }) }
export function deleteAgentUserMcp(id) { return request({ url: `/ai/agent/market/user-mcp/${id}`, method: 'delete' }) }
export function getAgentMarket(id) { return request({ url: `/ai/agent/market/${id}`, method: 'get' }) }
export function saveAgentMarket(data) { return request({ url: '/ai/agent/market', method: 'post', data }) }
export function deleteAgentMarket(ids) { return request({ url: `/ai/agent/market/${ids.join(',')}`, method: 'delete' }) }
export function uploadAgentMarket(file, assetType, id) {
  const data = new FormData()
  data.append('file', file)
  data.append('assetType', assetType)
  data.append('id', id)
  return request({ url: '/ai/agent/market/upload', method: 'post', data, headers: { 'Content-Type': 'multipart/form-data' } })
}
