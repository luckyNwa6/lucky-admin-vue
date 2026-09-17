import request from '@/utils/request'

// 查询经期记录列表
export function listPeriod(query) {
  return request({
    url: '/reminder/period/list',
    method: 'get',
    params: query
  })
}

// 查询经期记录详细
export function getPeriod(id) {
  return request({
    url: '/reminder/period/' + id,
    method: 'get'
  })
}

// 查询最近的经期记录
export function getRecentPeriod() {
  return request({
    url: '/reminder/period/recent',
    method: 'get'
  })
}

// 获取平均周期
export function getAverageCycle() {
  return request({
    url: '/reminder/period/averageCycle',
    method: 'get'
  })
}

// 获取平均经期持续天数
export function getAverageDuration() {
  return request({
    url: '/reminder/period/averageDuration',
    method: 'get'
  })
}

// 预测下次经期
export function predictNextPeriod() {
  return request({
    url: '/reminder/period/predict',
    method: 'get'
  })
}

// 预测下次经期结束日期
export function predictNextPeriodEnd() {
  return request({
    url: '/reminder/period/predictEnd',
    method: 'get'
  })
}

// 获取最近一次经期 AI 分析
export function getLatestAiAnalysis() {
  return request({
    url: '/reminder/period/ai/latest',
    method: 'get'
  })
}

// 获取经期 AI 分析历史
export function listAiAnalysis(limit = 20) {
  return request({
    url: '/reminder/period/ai/list',
    method: 'get',
    params: { limit }
  })
}

// 立即执行一次经期 AI 分析
export function runAiAnalysis() {
  return request({
    url: '/reminder/period/ai/run',
    method: 'post'
  })
}

// 新增经期记录
export function addPeriod(data) {
  return request({
    url: '/reminder/period',
    method: 'post',
    data: data
  })
}

// 修改经期记录
export function updatePeriod(data) {
  return request({
    url: '/reminder/period',
    method: 'put',
    data: data
  })
}

// 删除经期记录
export function delPeriod(ids) {
  return request({
    url: '/reminder/period/' + ids,
    method: 'delete'
  })
}
