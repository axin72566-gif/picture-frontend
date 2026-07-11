<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, PeopleOutline, PersonAddOutline, PersonCircleOutline } from '@vicons/ionicons5'
import { followUser, getUserById, getUserFollowStatus, unfollowUser } from '../../api/user'
import UserAvatar from '../../components/UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import type { UserVO } from '../../types/user'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const loading = ref(false)
const followStatusLoading = ref(false)
const followActionLoading = ref(false)
const isFollowing = ref(false)
const followButtonHovered = ref(false)
const user = ref<UserVO | null>(null)
const loadError = ref('')
let followStatusRequestId = 0

const userId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})

const displayName = computed(() => user.value?.userName || user.value?.userAccount || '未命名用户')
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
const roleLabel = computed(() => (user.value?.userRole === 'admin' ? '管理员' : '普通用户'))
const profileText = computed(() => user.value?.userProfile || '暂无个人简介')
const createdAt = computed(() => formatDate(user.value?.createTime))
const updatedAt = computed(() => formatDate(user.value?.updateTime))
const followerCount = computed(() => user.value?.followerCount ?? 0)
const followingCount = computed(() => user.value?.followingCount ?? 0)
const followButtonLabel = computed(() => {
  if (!auth.isAuthenticated) return '登录后关注'
  if (isFollowing.value) return followButtonHovered.value ? '取消关注' : '已关注'
  return '关注'
})

function formatDate(value?: string) {
  if (!value) return '暂无'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadUser() {
  if (userId.value === null) {
    user.value = null
    loadError.value = '无效的用户资料链接'
    return
  }

  if (auth.user?.id === userId.value) {
    await router.replace('/profile')
    return
  }

  loading.value = true
  loadError.value = ''
  user.value = null
  followStatusRequestId += 1
  isFollowing.value = false
  followButtonHovered.value = false

  try {
    const response = await getUserById(userId.value)
    const nextUser = response.data.data
    if (!nextUser) {
      loadError.value = '该用户已注销'
      return
    }
    user.value = nextUser
    await loadFollowStatus(nextUser.id)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '用户不存在'
    loadError.value = errorMessage === '用户不存在' ? '该用户已注销' : errorMessage
    message.error(loadError.value)
  } finally {
    loading.value = false
  }
}

async function loadFollowStatus(id: number) {
  const requestId = ++followStatusRequestId
  followStatusLoading.value = true
  try {
    const response = await getUserFollowStatus(id)
    if (requestId !== followStatusRequestId) return
    isFollowing.value = response.data.data === true
  } catch {
    if (requestId !== followStatusRequestId) return
    isFollowing.value = false
  } finally {
    if (requestId === followStatusRequestId) {
      followStatusLoading.value = false
    }
  }
}

function updateFollowerCount(delta: number) {
  if (!user.value) return
  user.value = {
    ...user.value,
    followerCount: Math.max(0, (user.value.followerCount ?? 0) + delta),
  }
}

async function toggleFollow() {
  if (!user.value) return

  if (!auth.isAuthenticated) {
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  followActionLoading.value = true
  try {
    if (isFollowing.value) {
      await unfollowUser(user.value.id)
      followStatusRequestId += 1
      isFollowing.value = false
      updateFollowerCount(-1)
      message.success('已取消关注')
    } else {
      await followUser(user.value.id)
      followStatusRequestId += 1
      isFollowing.value = true
      updateFollowerCount(1)
      message.success('关注成功')
    }
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    if (errorMessage.includes('已关注该用户')) {
      followStatusRequestId += 1
      isFollowing.value = true
      return
    }
    if (errorMessage.includes('未关注该用户')) {
      followStatusRequestId += 1
      isFollowing.value = false
      return
    }
    message.error(errorMessage)
  } finally {
    followActionLoading.value = false
  }
}

function goToFollowList(type: 'followers' | 'following') {
  if (userId.value === null) return
  void router.push(`/user/${userId.value}/${type}`)
}

watch(userId, () => {
  void loadUser()
}, { immediate: true })
</script>

<template>
  <div class="creator-page">
    <section class="page-width creator-panel">
      <div class="panel-toolbar">
        <n-button quaternary @click="router.push('/')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回图库
        </n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="user" class="creator-content">
          <div class="creator-header">
            <UserAvatar :size="88" :src="user.userAvatar || ''" :text="avatarText" />
            <div class="creator-title">
              <h1>{{ displayName }}</h1>
              <p>{{ user.userAccount }}</p>
            </div>
            <div class="creator-actions">
              <n-button
                :type="isFollowing ? 'default' : 'primary'"
                :loading="followActionLoading || followStatusLoading"
                :title="isFollowing ? '点击取消关注' : undefined"
                @mouseenter="followButtonHovered = true"
                @mouseleave="followButtonHovered = false"
                @click="toggleFollow"
              >
                <template #icon>
                  <n-icon :component="isFollowing ? PeopleOutline : PersonAddOutline" />
                </template>
                {{ followButtonLabel }}
              </n-button>
            </div>
          </div>

          <div class="follow-stats">
            <button class="stat-button" type="button" @click="goToFollowList('followers')">
              <strong>{{ followerCount }}</strong>
              <span>粉丝</span>
            </button>
            <button class="stat-button" type="button" @click="goToFollowList('following')">
              <strong>{{ followingCount }}</strong>
              <span>关注</span>
            </button>
          </div>

          <n-descriptions :column="1" bordered label-placement="left" size="medium">
            <n-descriptions-item label="账号">
              {{ user.userAccount }}
            </n-descriptions-item>
            <n-descriptions-item label="昵称">
              {{ user.userName || '暂无' }}
            </n-descriptions-item>
            <n-descriptions-item label="角色">
              <n-tag :type="user.userRole === 'admin' ? 'warning' : 'info'" size="small">
                {{ roleLabel }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="个人简介">
              {{ profileText }}
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ createdAt }}
            </n-descriptions-item>
            <n-descriptions-item label="更新时间">
              {{ updatedAt }}
            </n-descriptions-item>
          </n-descriptions>
        </div>

        <div v-else-if="!loading" class="empty-state">
          <n-icon :component="PersonCircleOutline" />
          <h2>{{ loadError || '用户不存在' }}</h2>
          <p>无法查看该用户的公开资料。</p>
          <n-button type="primary" @click="router.push('/')">返回公共图库</n-button>
        </div>
      </n-spin>
    </section>
  </div>
</template>

<style scoped>
.creator-page {
  flex: 1;
  padding: 32px 0 48px;
}

.creator-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
}

.panel-toolbar {
  margin-bottom: 20px;
}

.creator-content {
  max-width: 760px;
}

.creator-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.creator-title {
  min-width: 0;
}

.creator-actions {
  display: flex;
  justify-content: flex-end;
}

.follow-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.stat-button {
  min-width: 108px;
  display: grid;
  gap: 2px;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #4b5563;
  cursor: pointer;
  text-align: left;
}

.stat-button:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.stat-button strong {
  color: #111827;
  font-size: 20px;
  line-height: 1.2;
}

.stat-button span {
  font-size: 13px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 28px;
  line-height: 1.2;
}

h2 {
  color: #111827;
  font-size: 20px;
}

.creator-title p {
  margin-top: 8px;
  color: #6b7280;
  word-break: break-word;
}

.empty-state {
  min-height: 320px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: #64748b;
  text-align: center;
}

.empty-state .n-icon {
  width: 64px;
  height: 64px;
  padding: 14px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
}

.empty-state p {
  max-width: 280px;
  line-height: 1.6;
}

@media (max-width: 560px) {
  .creator-page {
    padding-top: 20px;
  }

  .creator-panel {
    padding: 20px;
  }

  .creator-header {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .creator-actions,
  .creator-actions .n-button,
  .follow-stats,
  .stat-button {
    width: 100%;
  }

  .follow-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
