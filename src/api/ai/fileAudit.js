import request from '@/utils/request'

export function scanRagFiles(staleHours = 24) {
  return request({ url: '/ai/chat/fileAudit/scan', method: 'get', params: { staleHours } })
}

export function deleteRagFiles(data) {
  return request({ url: '/ai/chat/fileAudit/delete', method: 'post', data })
}
