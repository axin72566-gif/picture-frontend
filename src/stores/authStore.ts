import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AxiosProgressEvent } from 'axios'
import * as userApi from '../api/user'
import type { UserLoginRequest, UserRegisterRequest, UserUpdateRequest, UserVO } from '../types/user'

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
  const avatarVersion = ref(0)

  const isAuthenticated = computed(() => Boolean(token.value))
  const displayName = computed(() => user.value?.userName || user.value?.userAccount || '未命名用户')
  const avatarUrl = computed(() => user.value?.userAvatar || '')
  const avatarDisplayUrl = computed(() => avatarUrl.value)
  const avatarKey = computed(() => `${avatarUrl.value || 'empty'}:${avatarVersion.value}`)
  const roleLabel = computed(() => (user.value?.userRole === 'admin' ? '管理员' : '普通用户'))

  function persistSession(nextToken: string, nextUser: UserVO) {
    token.value = nextToken
    localStorage.setItem('token', nextToken)
    persistUser(nextUser)
  }

  function persistUser(nextUser: UserVO) {
    const previousAvatar = user.value?.userAvatar || ''
    const normalizedUser = {
      ...nextUser,
      userAvatar: nextUser.userAvatar || previousAvatar || null,
    }

    user.value = normalizedUser
    if ((normalizedUser.userAvatar || '') !== previousAvatar) {
      avatarVersion.value += 1
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser))
  }

  function clearSession() {
    token.value = null
    user.value = null
    avatarVersion.value = 0
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /** 供 axios 拦截器同步清理 Pinia，避免与 localStorage 不一致 */
  function syncClearedSession() {
    token.value = null
    user.value = null
    avatarVersion.value = 0
  }

  async function login(data: UserLoginRequest) {
    const response = await userApi.userLogin(data)
    const loginResult = response.data.data
    if (!loginResult) {
      throw new Error(response.data.message || '登录失败')
    }
    persistSession(loginResult.token, loginResult.user)
    return loginResult.user
  }

  async function register(data: UserRegisterRequest) {
    const response = await userApi.userRegister(data)
    return response.data.data
  }

  async function logout() {
    const currentToken = token.value
    try {
      if (currentToken) {
        await userApi.userLogout()
      }
    } catch {
      // 退出接口失败（含 token 已失效）时仍清理本地登录态
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
    const currentUser = response.data.data
    if (!currentUser) {
      clearSession()
      throw new Error(response.data.message || '用户不存在')
    }
    persistUser(currentUser)
    return currentUser
  }

  async function updateProfile(data: UserUpdateRequest) {
    const response = await userApi.updateCurrentUser(data)
    const updatedUser = response.data.data
    if (!updatedUser) {
      throw new Error(response.data.message || '资料更新失败')
    }
    persistUser(updatedUser)
    return updatedUser
  }

  async function uploadAvatar(file: File, onUploadProgress?: (event: AxiosProgressEvent) => void) {
    const response = await userApi.uploadUserAvatar(file, onUploadProgress)
    const nextAvatarUrl = response.data.data
    if (!nextAvatarUrl) {
      throw new Error(response.data.message || '头像上传失败')
    }

    if (user.value) {
      persistUser({
        ...user.value,
        userAvatar: nextAvatarUrl,
      })
    }

    avatarVersion.value += 1
    return nextAvatarUrl
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
    avatarDisplayUrl,
    avatarKey,
    roleLabel,
    login,
    register,
    logout,
    clearSession,
    syncClearedSession,
    fetchCurrentUser,
    updateProfile,
    uploadAvatar,
    initialize,
  }
})
