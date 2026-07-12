<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { HeartOutline, PeopleOutline } from '@vicons/ionicons5'
import { getPictureLikers } from '../api/picture'
import { useAuthStore } from '../stores/authStore'
import type { PageResult } from '../types/picture'
import type { UserVO } from '../types/user'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  show: boolean
  pictureId: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const loading = ref(false)
const query = reactive({
  current: 1,
  pageSize: 10,
})

const pageData = ref<PageResult<UserVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

function getDisplayName(user: UserVO) {
  return user.userName || user.userAccount || '未命名用户'
}

function getAvatarText(user: UserVO) {
  return getDisplayName(user).slice(0, 1).toUpperCase()
}

function goToUser(user: UserVO) {
  emit('update:show', false)
  if (auth.user?.id === user.id) {
    void router.push('/profile')
    return
  }
  void router.push(`/user/${user.id}`)
}

async function fetchLikers() {
  if (props.pictureId == null) {
    pageData.value = {
      records: [],
      total: 0,
      size: query.pageSize,
      current: query.current,
      pages: 0,
    }
    return
  }

  loading.value = true
  try {
    const response = await getPictureLikers(props.pictureId, {
      current: query.current,
      pageSize: query.pageSize,
    })
    const nextPage = response.data.data
    if (!nextPage) {
      throw new Error(response.data.message || '点赞用户加载失败')
    }
    pageData.value = nextPage
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '点赞用户加载失败'
    pageData.value.records = []
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  query.current = page
  void fetchLikers()
}

watch(
  () => [props.show, props.pictureId] as const,
  ([show]) => {
    if (!show) return
    query.current = 1
    void fetchLikers()
  },
)
</script>

<template>
  <n-modal
    :show="show"
    :auto-focus="false"
    @update:show="(value: boolean) => emit('update:show', value)"
  >
    <div class="likers-dialog">
      <div class="likers-header">
        <div class="likers-title">
          <n-icon :component="HeartOutline" />
          <h2>点赞用户</h2>
        </div>
        <n-button quaternary @click="emit('update:show', false)">关闭</n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="pageData.records.length" class="user-list">
          <article v-for="item in pageData.records" :key="item.id" class="user-card">
            <button class="user-main" type="button" @click="goToUser(item)">
              <UserAvatar :size="42" :src="item.userAvatar || ''" :text="getAvatarText(item)" />
              <span>
                <strong>{{ getDisplayName(item) }}</strong>
                <small>@{{ item.userAccount }}</small>
              </span>
            </button>
            <div class="user-stats">
              <span>{{ item.followerCount ?? 0 }} 粉丝</span>
              <span>{{ item.followingCount ?? 0 }} 关注</span>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <n-icon :component="PeopleOutline" />
          <h3>暂无点赞</h3>
          <p>还没有用户给这张图片点赞。</p>
        </div>
      </n-spin>

      <div v-if="pageData.pages > 1" class="pagination-row">
        <n-pagination
          :page="query.current"
          :page-size="query.pageSize"
          :page-count="pageData.pages"
          :item-count="pageData.total"
          @update:page="handlePageChange"
        />
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.likers-dialog {
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  border-radius: 8px;
  background: #fff;
  padding: 20px 22px 22px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
}

.likers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.likers-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111827;
}

.likers-title .n-icon {
  color: #ef4444;
}

.likers-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.user-list {
  display: grid;
  gap: 10px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.user-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.user-main span {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.user-main strong {
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-main small {
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-stats {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  color: #6b7280;
  font-size: 12px;
}

.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #64748b;
  text-align: center;
}

.empty-state .n-icon {
  width: 56px;
  height: 56px;
  padding: 12px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
}

.empty-state h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.pagination-row {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}
</style>
