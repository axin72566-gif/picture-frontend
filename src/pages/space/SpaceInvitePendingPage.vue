<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, MailOutline } from '@vicons/ionicons5'
import { acceptSpaceInvite, getMyPendingInvites, rejectSpaceInvite } from '../../api/space'
import UserAvatar from '../../components/UserAvatar.vue'
import type { PageResponse } from '../../types/user'
import type { SpaceInviteVO } from '../../types/space'
import { VipErrorCode } from '../../types/vip'
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiError'
import { getSpaceRoleLabel } from '../../utils/space'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const actingId = ref<number | null>(null)
const query = reactive({
  current: 1,
  pageSize: 10,
})

const pageData = ref<PageResponse<SpaceInviteVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

function getInviterName(item: SpaceInviteVO) {
  return item.inviter?.userName || item.inviter?.userAccount || '用户'
}

function getAvatarText(item: SpaceInviteVO) {
  return getInviterName(item).slice(0, 1).toUpperCase()
}

async function fetchPage() {
  loading.value = true
  try {
    const response = await getMyPendingInvites({
      current: query.current,
      pageSize: query.pageSize,
    })
    const nextPage = response.data.data
    if (!nextPage) {
      throw new Error(response.data.message || '邀请加载失败')
    }
    pageData.value = nextPage
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '邀请加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  query.current = page
  void fetchPage()
}

async function removeInvite(inviteId: number) {
  pageData.value.records = pageData.value.records.filter((item) => item.id !== inviteId)
  pageData.value.total = Math.max(0, pageData.value.total - 1)
  if (pageData.value.records.length === 0 && query.current > 1) {
    query.current -= 1
    await fetchPage()
  }
}

async function handleAccept(item: SpaceInviteVO) {
  if (actingId.value !== null) return
  actingId.value = item.id
  try {
    await acceptSpaceInvite(item.id)
    message.success('已加入空间')
    await removeInvite(item.id)
    await router.push(`/spaces/${item.spaceId}`)
  } catch (error) {
    const code = getApiErrorCode(error)
    if (code === VipErrorCode.MEMBER_QUOTA_EXCEEDED) {
      message.error('空间成员已满，请联系创建者升级 VIP')
      return
    }
    message.error(getApiErrorMessage(error, '操作失败'))
  } finally {
    actingId.value = null
  }
}

async function handleReject(item: SpaceInviteVO) {
  if (actingId.value !== null) return
  actingId.value = item.id
  try {
    await rejectSpaceInvite(item.id)
    message.success('已拒绝邀请')
    await removeInvite(item.id)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    message.error(errorMessage)
  } finally {
    actingId.value = null
  }
}

onMounted(() => {
  void fetchPage()
})
</script>

<template>
  <div class="invite-page">
    <section class="page-width invite-hero">
      <div class="invite-hero__left">
        <n-button quaternary @click="router.push('/spaces')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回空间
        </n-button>
        <div>
          <h1>
            <n-icon :component="MailOutline" />
            待处理邀请
          </h1>
          <p class="hero-subtitle">同意后即可加入对应团队空间</p>
        </div>
      </div>
    </section>

    <section class="page-width invite-body">
      <n-spin :show="loading">
        <div v-if="pageData.records.length === 0" class="invite-empty">暂无待处理邀请</div>
        <ul v-else class="invite-list">
          <li v-for="item in pageData.records" :key="item.id" class="invite-card">
            <UserAvatar
              :size="44"
              :src="item.inviter?.userAvatar || ''"
              :text="getAvatarText(item)"
            />
            <div class="invite-card__body">
              <p class="invite-card__title">
                <strong>{{ getInviterName(item) }}</strong>
                邀请你加入
                <strong>{{ item.spaceName || `空间 #${item.spaceId}` }}</strong>
              </p>
              <p class="invite-card__meta">角色：{{ getSpaceRoleLabel(item.role) }}</p>
            </div>
            <div class="invite-card__actions">
              <n-button
                size="small"
                :loading="actingId === item.id"
                :disabled="actingId !== null && actingId !== item.id"
                @click="handleReject(item)"
              >
                拒绝
              </n-button>
              <n-button
                type="primary"
                size="small"
                :loading="actingId === item.id"
                :disabled="actingId !== null && actingId !== item.id"
                @click="handleAccept(item)"
              >
                同意
              </n-button>
            </div>
          </li>
        </ul>

        <div v-if="pageData.total > query.pageSize" class="invite-pagination">
          <n-pagination
            :page="query.current"
            :page-size="query.pageSize"
            :item-count="pageData.total"
            @update:page="handlePageChange"
          />
        </div>
      </n-spin>
    </section>
  </div>
</template>

<style scoped>
.invite-page {
  padding: 24px 0 48px;
}

.page-width {
  width: min(800px, calc(100% - 32px));
  margin: 0 auto;
}

.invite-hero {
  margin-bottom: 20px;
}

.invite-hero__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

h1,
p {
  margin: 0;
}

h1 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-size: 26px;
}

.hero-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
}

.invite-body {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 20px;
}

.invite-empty {
  padding: 48px 16px;
  text-align: center;
  color: #9ca3af;
}

.invite-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invite-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.invite-card__body {
  min-width: 0;
  flex: 1;
}

.invite-card__title {
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
}

.invite-card__meta {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.invite-card__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.invite-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 640px) {
  .invite-card {
    flex-wrap: wrap;
  }

  .invite-card__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
