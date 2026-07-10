import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import type { BaseResponse } from '../types/user'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 15000,
  withCredentials: true,
})

function clearStoredAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    const redirect = window.location.pathname + window.location.search
    const target = redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
    window.location.href = target
  }
}

function buildError(message?: string) {
  return new Error(message || '请求失败，请稍后重试')
}

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response: AxiosResponse<BaseResponse<unknown>>) => {
    const payload = response.data

    if (payload?.code === 40100) {
      clearStoredAuth()
      redirectToLogin()
      return Promise.reject(buildError(payload.message || '登录已过期，请重新登录'))
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
      clearStoredAuth()
      redirectToLogin()
    }

    return Promise.reject(buildError(payload?.message || error.message))
  },
)

export default request
