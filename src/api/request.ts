import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { BaseResponse } from '../types/user'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 15000,
  withCredentials: true,
})

/** 与 Pinia 同步清理登录态，避免只清 sessionStorage 导致状态不一致 */
let onAuthCleared: (() => void) | null = null

export function setAuthClearedHandler(handler: (() => void) | null) {
  onAuthCleared = handler
}

function clearStoredAuth() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  onAuthCleared?.()
}

function redirectToLogin() {
  if (window.location.pathname === '/login') return

  const redirect = window.location.pathname + window.location.search
  const target =
    redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
  window.location.href = target
}

function buildError(message?: string) {
  return new Error(message || '请求失败，请稍后重试')
}

function getRequestUrl(config?: InternalAxiosRequestConfig) {
  return `${config?.baseURL || ''}${config?.url || ''}`
}

/** 文档约定的无需登录接口：不附带 Authorization，避免过期 token 污染公开请求 */
function isPublicApi(config?: InternalAxiosRequestConfig) {
  const url = getRequestUrl(config)
  if (!url) return false

  if (url.includes('/api/user/register') || url.includes('/api/user/login')) return true
  if (/\/api\/picture\/page(\?|$)/.test(url)) return true
  // GET /api/picture/{数字 id}/likes、/like/status（须先于纯 id 匹配）
  if (/\/api\/picture\/\d+\/likes(\?|$)/.test(url)) return true
  if (/\/api\/picture\/\d+\/like\/status(\?|$)/.test(url)) return true
  // GET /api/picture/{数字 id}，排除 /page、/my/page、/upload 等
  if (/\/api\/picture\/\d+(\?|$)/.test(url)) return true
  if (/\/api\/user\/\d+\/followers(\?|$)/.test(url)) return true
  if (/\/api\/user\/\d+\/following(\?|$)/.test(url)) return true
  if (/\/api\/user\/\d+\/follow\/status(\?|$)/.test(url)) return true
  // GET /api/user/{数字 id}，排除 /current、/update、/logout、/avatar 等
  if (/\/api\/user\/\d+(\?|$)/.test(url)) return true

  return false
}

/** 公开但可选登录：有 token 时附带，便于后端填充关注态 / 点赞态 */
function isOptionalAuthApi(config?: InternalAxiosRequestConfig) {
  const url = getRequestUrl(config)
  if (!url) return false
  if (/\/api\/user\/\d+\/follow\/status(\?|$)/.test(url)) return true
  if (/\/api\/picture\/page(\?|$)/.test(url)) return true
  if (/\/api\/picture\/\d+\/like\/status(\?|$)/.test(url)) return true
  if (/\/api\/picture\/\d+(\?|$)/.test(url)) return true
  return false
}

function shouldAttachAuth(config?: InternalAxiosRequestConfig) {
  return !isPublicApi(config) || isOptionalAuthApi(config)
}

function getBearerToken(config?: InternalAxiosRequestConfig) {
  const header = config?.headers?.Authorization
  const value = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : ''
  const match = /^Bearer\s+(.+)$/i.exec(value || '')
  return match?.[1] || null
}

/** 仅当 401 对应的仍是「当前 token」时才清会话，避免过期请求清掉新登录态 */
function shouldClearSessionForUnauthorized(config?: InternalAxiosRequestConfig) {
  const requestToken = getBearerToken(config)
  const currentToken = sessionStorage.getItem('token')

  if (!currentToken) return false
  if (!requestToken) return true
  return requestToken === currentToken
}

function handleUnauthorized(config?: InternalAxiosRequestConfig, message?: string) {
  if (isPublicApi(config)) {
    return Promise.reject(buildError(message || '请求失败，请稍后重试'))
  }

  if (shouldClearSessionForUnauthorized(config)) {
    clearStoredAuth()
    redirectToLogin()
  }

  return Promise.reject(buildError(message || '登录已过期，请重新登录'))
}

request.interceptors.request.use((config) => {
  if (shouldAttachAuth(config)) {
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

request.interceptors.response.use(
  (response: AxiosResponse<BaseResponse<unknown>>) => {
    const payload = response.data

    if (payload?.code === 40100) {
      return handleUnauthorized(response.config, payload.message)
    }

    if (typeof payload?.code === 'number' && payload.code !== 0) {
      return Promise.reject(buildError(payload.message))
    }

    return response
  },
  (error: AxiosError<BaseResponse<unknown>>) => {
    const status = error.response?.status
    const payload = error.response?.data

    if (status === 401 || payload?.code === 40100) {
      return handleUnauthorized(error.config, payload?.message)
    }

    return Promise.reject(buildError(payload?.message || error.message))
  },
)

export default request
