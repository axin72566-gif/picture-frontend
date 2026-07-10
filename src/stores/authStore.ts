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
    persistUser(response.data.data)
    return response.data.data
  }

  async function updateProfile(data: UserUpdateRequest) {
    const response = await userApi.updateCurrentUser(data)
    persistUser(response.data.data)
    return response.data.data
  }

  async function uploadAvatar(file: File, onUploadProgress?: (event: AxiosProgressEvent) => void) {
    const response = await userApi.uploadUserAvatar(file, onUploadProgress)
    const nextAvatarUrl = response.data.data

    try {
      const latestUser = await fetchCurrentUser()
      if (latestUser && latestUser.userAvatar !== nextAvatarUrl) {
        persistUser({
          ...latestUser,
          userAvatar: nextAvatarUrl,
        })
      }
    } catch {
      if (user.value) {
        persistUser({
          ...user.value,
          userAvatar: nextAvatarUrl,
        })
      }
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
    fetchCurrentUser,
    updateProfile,
    uploadAvatar,
    initialize,
  }
})
