import request from '@/utils/request'

export function getServerOverview() {
  return request({ url: '/system/serverConsole/overview', method: 'get' })
}

export function getServerLogFiles(service, source) {
  return request({ url: '/system/serverConsole/logFiles', method: 'get', params: { service, source } })
}

export function searchServerLogs(params) {
  return request({ url: '/system/serverConsole/logs', method: 'get', params })
}
