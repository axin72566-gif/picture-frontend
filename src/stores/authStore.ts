import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as userApi from '../api/user'
import type { UserLoginRequest, UserRegisterRequest, UserVO } from '../types/user'

function readStoredUser() {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser) as UserVO
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UserVO | null>(readStoredUser())
  const initializing = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const displayName = computed(() => user.value?.userName || user.value?.userAccount || '未命名用户')
  const avatarUrl = computed(() => user.value?.userAvatar || '')
  const roleLabel = computed(() => (user.value?.userRole === 'admin' ? '管理员' : '普通用户'))

  function persistSession(nextToken: string, nextUser: UserVO) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(data: UserLoginRequest) {
    const response = await userApi.userLogin(data)
    const loginResult = response.data.data
    persistSession(loginResult.token, loginResult.user)
    return loginResult.user
  }

  async function register(data: UserRegisterRequest) {
    const response = await userApi.userRegister(data)
    return response.data.data
  }

  async function logout() {
    try {
      if (token.value) {
        await userApi.userLogout()
      }
    } finally {
      clearSession()
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) {
      clearSession()
      return null
    }

    const response = await userApi.getCurrentUser()
    user.value = response.data.data
    localStorage.setItem('user', JSON.stringify(response.data.data))
    return response.data.data
  }

  async function initialize() {
    if (!token.value) return

    initializing.value = true
    try {
      await fetchCurrentUser()
    } catch {
      clearSession()
    } finally {
      initializing.value = false
    }
  }

  return {
    token,
    user,
    initializing,
    isAuthenticated,
    displayName,
    avatarUrl,
    roleLabel,
    login,
    register,
    logout,
    fetchCurrentUser,
    initialize,
  }
})
