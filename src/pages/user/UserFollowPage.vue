<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, PeopleOutline, PersonCircleOutline } from '@vicons/ionicons5'
import { getUserById, getUserFollowers, getUserFollowing, unfollowUser } from '../../api/user'
import UserAvatar from '../../components/UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import type { PageResponse, UserVO } from '../../types/user'

type FollowListType = 'followers' | 'following'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const loading = ref(false)
const targetUser = ref<UserVO | null>(null)
const loadError = ref('')
const unfollowingId = ref<number | null>(null)
const hoveredUnfollowId = ref<number | null>(null)
const query = reactive({
  current: 1,
  pageSize: 10,
})

const pageData = ref<PageResponse<UserVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const userId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})
const listType = computed<FollowListType>(() => (route.name === 'user-following' ? 'following' : 'followers'))
const isOwnFollowingList = computed(
  () => auth.user?.id === userId.value && listType.value === 'following',
)
const targetName = computed(() => targetUser.value?.userName || targetUser.value?.userAccount || '用户')
const pageTitle = computed(() => (listType.value === 'followers' ? `${targetName.value} 的粉丝` : `${targetName.value} 的关注`))
const emptyText = computed(() => (listType.value === 'followers' ? '暂无粉丝' : '暂无关注'))
const backPath = computed(() => {
  if (userId.value === null) return '/'
  return auth.user?.id === userId.value ? '/profile' : `/user/${userId.value}`
})

function getDisplayName(user: UserVO) {
  return user.userName || user.userAccount || '未命名用户'
}

function getAvatarText(user: UserVO) {
  return getDisplayName(user).slice(0, 1).toUpperCase()
}

function getUnfollowButtonLabel(id: number) {
  return hoveredUnfollowId.value === id ? '取消关注' : '已关注'
}

function goToUser(user: UserVO) {
  if (auth.user?.id === user.id) {
    void router.push('/profile')
    return
  }
  void router.push(`/user/${user.id}`)
}

function switchList(type: FollowListType) {
  if (userId.value === null || type === listType.value) return
  query.current = 1
  void router.push(`/user/${userId.value}/${type}`)
}

function syncFollowingCount(delta: number) {
  if (targetUser.value) {
    targetUser.value = {
      ...targetUser.value,
      followingCount: Math.max(0, (targetUser.value.followingCount ?? 0) + delta),
    }
  }

  if (auth.user) {
    auth.user.followingCount = Math.max(0, (auth.user.followingCount ?? 0) + delta)
    sessionStorage.setItem('user', JSON.stringify(auth.user))
  }
}

async function removeFollowingItem(followedId: number) {
  pageData.value.records = pageData.value.records.filter((item) => item.id !== followedId)
  pageData.value.total = Math.max(0, pageData.value.total - 1)
  pageData.value.pages = Math.ceil(pageData.value.total / query.pageSize) || 0
  syncFollowingCount(-1)

  if (pageData.value.records.length === 0 && query.current > 1) {
    query.current -= 1
    await fetchFollowPage()
  }
}

async function handleUnfollow(item: UserVO) {
  if (!isOwnFollowingList.value || unfollowingId.value !== null) return

  unfollowingId.value = item.id
  try {
    await unfollowUser(item.id)
    await removeFollowingItem(item.id)
    message.success('已取消关注')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    if (errorMessage.includes('未关注该用户')) {
      await removeFollowingItem(item.id)
      return
    }
    message.error(errorMessage)
  } finally {
    unfollowingId.value = null
    if (hoveredUnfollowId.value === item.id) {
      hoveredUnfollowId.value = null
    }
  }
}

async function fetchFollowPage() {
  if (userId.value === null) {
    targetUser.value = null
    pageData.value.records = []
    loadError.value = '无效的用户资料链接'
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    const [userResponse, listResponse] = await Promise.all([
      getUserById(userId.value),
      listType.value === 'followers'
        ? getUserFollowers(userId.value, query)
        : getUserFollowing(userId.value, query),
    ])

    const nextUser = userResponse.data.data
    const nextPage = listResponse.data.data
    if (!nextUser || !nextPage) {
      throw new Error('数据加载失败')
    }

    targetUser.value = nextUser
    pageData.value = nextPage
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '列表加载失败'
    loadError.value = errorMessage
    pageData.value.records = []
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  query.current = page
  void fetchFollowPage()
}

watch(
  () => [userId.value, listType.value],
  () => {
    query.current = 1
    void fetchFollowPage()
  },
  { immediate: true },
)
</script>

<template>
  <div class="follow-page">
    <section class="page-width follow-panel">
      <div class="panel-toolbar">
        <n-button quaternary @click="router.push(backPath)">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回资料页
        </n-button>
      </div>

      <div class="follow-heading">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p v-if="targetUser">@{{ targetUser.userAccount }}</p>
        </div>
        <n-button-group>
          <n-button :type="listType === 'followers' ? 'primary' : 'default'" @click="switchList('followers')">
            粉丝
          </n-button>
          <n-button :type="listType === 'following' ? 'primary' : 'default'" @click="switchList('following')">
            关注
          </n-button>
        </n-button-group>
      </div>

      <n-spin :show="loading">
        <div v-if="pageData.records.length" class="user-list">
          <article
            v-for="item in pageData.records"
            :key="item.id"
            class="user-card"
            :class="{ 'user-card--with-action': isOwnFollowingList }"
          >
            <button class="user-main" type="button" @click="goToUser(item)">
              <UserAvatar :size="46" :src="item.userAvatar || ''" :text="getAvatarText(item)" />
              <span>
                <strong>{{ getDisplayName(item) }}</strong>
                <small>@{{ item.userAccount }}</small>
              </span>
            </button>
            <div class="user-meta">
              <div class="user-stats">
                <span>{{ item.followerCount ?? 0 }} 粉丝</span>
                <span>{{ item.followingCount ?? 0 }} 关注</span>
              </div>
              <n-button
                v-if="isOwnFollowingList"
                size="small"
                title="点击取消关注"
                :loading="unfollowingId === item.id"
                :disabled="unfollowingId !== null && unfollowingId !== item.id"
                @mouseenter="hoveredUnfollowId = item.id"
                @mouseleave="hoveredUnfollowId = null"
                @click.stop="handleUnfollow(item)"
              >
                {{ getUnfollowButtonLabel(item.id) }}
              </n-button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <n-icon :component="loadError ? PersonCircleOutline : PeopleOutline" />
          <h2>{{ loadError || emptyText }}</h2>
          <p>{{ loadError ? '无法查看该用户的关注信息。' : '列表里暂时没有用户。' }}</p>
        </div>
      </n-spin>

      <div v-if="pageData.pages > 1" class="pagination-row">
        <n-pagination
          :page="query.current"
          :page-size="query.pageSize"
          :page-count="pageData.pages"
          :item-count="pageData.total"
          show-size-picker
          :page-sizes="[10, 20, 30]"
          @update:page="handlePageChange"
          @update:page-size="
            (size: number) => {
              query.pageSize = size
              query.current = 1
              fetchFollowPage()
            }
          "
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.follow-page {
  flex: 1;
  padding: 32px 0 48px;
}

.follow-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
}

.panel-toolbar {
  margin-bottom: 20px;
}

.follow-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 26px;
  line-height: 1.25;
}

h2 {
  color: #111827;
  font-size: 20px;
}

.follow-heading p {
  margin-top: 6px;
  color: #6b7280;
}

.user-list {
  display: grid;
  gap: 10px;
}

.user-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.user-card:hover {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.user-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.user-main span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.user-main strong,
.user-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-main strong {
  color: #111827;
  font-size: 15px;
}

.user-main small,
.user-stats {
  color: #6b7280;
  font-size: 13px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-stats {
  display: flex;
  gap: 12px;
  white-space: nowrap;
}

.empty-state {
  min-height: 320px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #fff;
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

.pagination-row {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

@media (max-width: 640px) {
  .follow-page {
    padding-top: 20px;
  }

  .follow-panel {
    padding: 20px;
  }

  .follow-heading,
  .user-card {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .follow-heading {
    flex-direction: column;
  }

  .follow-heading .n-button-group,
  .follow-heading .n-button {
    width: 100%;
  }

  .user-meta {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .user-stats {
    justify-content: flex-start;
  }

  .user-card--with-action .user-meta .n-button {
    margin-left: auto;
  }
}
</style>
