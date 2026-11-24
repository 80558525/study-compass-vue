/**
 * src/api/http.js —— 统一请求封装（axios）
 *
 * 两种模式，由 .env 控制，页面与业务代码无感知：
 *   VITE_USE_MOCK=true（默认）：请求命中 mock/index.js 的 url→JSON 挡板，直接返回静态数据，零网络零后端。
 *   VITE_USE_MOCK=false：按 VITE_API_BASE 走真实后端，返回相同结构的 JSON 即可。
 */
import axios from 'axios'
import { routes } from '../../mock'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE = import.meta.env.VITE_API_BASE || '/api'

const http = axios.create({ baseURL: BASE, timeout: 10000 })

if (USE_MOCK) {
  http.interceptors.request.use(cfg => {
    const url = (cfg.url || '').split('?')[0]
    if (Object.prototype.hasOwnProperty.call(routes, url)) {
      // 深拷贝挡板，避免多个调用方相互污染同一份数据
      const data = JSON.parse(JSON.stringify(routes[url]))
      cfg.adapter = () => Promise.resolve({
        data, status: 200, statusText: 'OK (mock)', headers: {}, config: cfg
      })
    }
    return cfg
  })
}

http.interceptors.response.use(r => r, err => {
  console.error('[api]', err && (err.message || err))
  return Promise.reject(err)
})

export default http
