<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, TicketOutline } from '@vicons/ionicons5'
import { claimCouponActivity, listCouponActivities, pageMyCoupons } from '../../api/coupon'
import type { CouponActivityVO, UserCouponVO } from '../../types/coupon'
import { CouponErrorCode, UserCouponStatus } from '../../types/coupon'
import type { PageResponse } from '../../types/user'
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiError'

const router = useRouter()
const message = useMessage()

const activeTab = ref<'activities' | 'mine'>('activities')
const loading = ref(false)
const claimingId = ref<number | null>(null)

const activities = ref<CouponActivityVO[]>([])

const mineQuery = reactive({ current: 1, pageSize: 10 })
const minePage = ref<PageResponse<UserCouponVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

function formatPrice(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`
}

function formatTime(value?: string | null) {
  if (!value) return '-'
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

function couponStatusLabel(status: string) {
  switch (status) {
    case UserCouponStatus.UNUSED:
      return '未使用'
    case UserCouponStatus.LOCKED:
      return '锁定中'
    case UserCouponStatus.USED:
      return '已使用'
    case UserCouponStatus.EXPIRED:
      return '已过期'
    default:
      return status
  }
}

function couponStatusType(status: string): 'success' | 'warning' | 'default' | 'error' {
  switch (status) {
    case UserCouponStatus.UNUSED:
      return 'success'
    case UserCouponStatus.LOCKED:
      return 'warning'
    case UserCouponStatus.EXPIRED:
      return 'error'
    default:
      return 'default'
  }
}

function claimDisabledReason(item: CouponActivityVO): string | null {
  if (item.claimed) return '已领取'
  if (!item.ongoing) {
    const now = Date.now()
    const start = new Date(item.startTime).getTime()
    if (!Number.isNaN(start) && now < start) return '未开始'
    return '已结束'
  }
  if (item.remainStock <= 0) return '已抢完'
  return null
}

async function fetchActivities() {
  const response = await listCouponActivities()
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '活动加载失败')
  activities.value = data
}

async function fetchMine() {
  const response = await pageMyCoupons({
    current: mineQuery.current,
    pageSize: mineQuery.pageSize,
  })
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '优惠券加载失败')
  minePage.value = data
}

async function loadTab() {
  loading.value = true
  try {
    if (activeTab.value === 'activities') {
      await fetchActivities()
    } else {
      await fetchMine()
    }
  } catch (error) {
    message.error(getApiErrorMessage(error, '加载失败'))
  } finally {
    loading.value = false
  }
}

async function handleClaim(item: CouponActivityVO) {
  if (claimDisabledReason(item)) return
  claimingId.value = item.id
  try {
    await claimCouponActivity(item.id)
    message.success('领取成功')
    await fetchActivities()
  } catch (error) {
    const code = getApiErrorCode(error)
    if (code === CouponErrorCode.ALREADY_CLAIMED) {
      message.warning('你已领取过该活动优惠券')
    } else if (code === CouponErrorCode.SOLD_OUT) {
      message.error('优惠券已抢完')
    } else if (code === CouponErrorCode.ACTIVITY_NOT_STARTED) {
      message.warning('活动尚未开始')
    } else if (code === CouponErrorCode.ACTIVITY_ENDED) {
      message.warning('活动已结束')
    } else {
      message.error(getApiErrorMessage(error, '领取失败'))
    }
    await fetchActivities().catch(() => undefined)
  } finally {
    claimingId.value = null
  }
}

function goUse(coupon: UserCouponVO) {
  void router.push({ path: '/vip', query: { couponId: String(coupon.id) } })
}

function handleMinePageChange(page: number) {
  mineQuery.current = page
  void fetchMine().catch((error) => {
    message.error(getApiErrorMessage(error, '优惠券加载失败'))
  })
}

function handleTabChange(tab: string) {
  activeTab.value = tab as 'activities' | 'mine'
  void loadTab()
}

onMounted(() => {
  void loadTab()
})
</script>

<template>
  <div class="coupon-page">
    <section class="page-width coupon-hero">
      <div class="coupon-hero__left">
        <n-button quaternary @click="router.push('/')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回
        </n-button>
        <div>
          <h1>
            <n-icon :component="TicketOutline" />
            优惠券秒杀
          </h1>
          <p class="hero-subtitle">抢固定金额优惠券，购买 VIP 时可抵扣</p>
        </div>
      </div>
    </section>

    <section class="page-width">
      <n-tabs :value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="activities" tab="活动" />
        <n-tab-pane name="mine" tab="我的券" />
      </n-tabs>

      <n-spin :show="loading">
        <template v-if="activeTab === 'activities'">
          <div v-if="activities.length === 0" class="muted empty">暂无上架活动</div>
          <ul v-else class="card-list">
            <li v-for="item in activities" :key="item.id" class="activity-card">
              <div class="activity-main">
                <div class="activity-name">{{ item.name }}</div>
                <div class="activity-discount">减 {{ formatPrice(item.discountCents) }}</div>
                <p class="muted">
                  库存 {{ item.remainStock }} / {{ item.totalStock }} · 领取后 {{ item.couponValidDays }} 天有效
                </p>
                <p class="muted">
                  {{ formatTime(item.startTime) }} — {{ formatTime(item.endTime) }}
                </p>
              </div>
              <div class="activity-actions">
                <n-tag v-if="item.ongoing" type="success" size="small">进行中</n-tag>
                <n-tag v-else-if="item.claimed" type="default" size="small">已领取</n-tag>
                <n-tag v-else type="warning" size="small">{{ claimDisabledReason(item) || '未进行' }}</n-tag>
                <n-button
                  type="primary"
                  :loading="claimingId === item.id"
                  :disabled="!!claimDisabledReason(item)"
                  @click="handleClaim(item)"
                >
                  {{ claimDisabledReason(item) || '立即抢' }}
                </n-button>
              </div>
            </li>
          </ul>
        </template>

        <template v-else>
          <div v-if="minePage.records.length === 0" class="muted empty">暂无优惠券</div>
          <ul v-else class="card-list">
            <li v-for="item in minePage.records" :key="item.id" class="coupon-card">
              <div>
                <div class="activity-name">{{ item.activityName || `活动#${item.activityId}` }}</div>
                <div class="activity-discount">减 {{ formatPrice(item.discountCents) }}</div>
                <p class="muted">过期时间 {{ formatTime(item.expireTime) }}</p>
              </div>
              <div class="activity-actions">
                <n-tag :type="couponStatusType(item.status)" size="small">
                  {{ couponStatusLabel(item.status) }}
                </n-tag>
                <n-button
                  v-if="item.status === UserCouponStatus.UNUSED"
                  type="primary"
                  secondary
                  @click="goUse(item)"
                >
                  去使用
                </n-button>
              </div>
            </li>
          </ul>
          <div v-if="minePage.total > mineQuery.pageSize" class="pager">
            <n-pagination
              :page="mineQuery.current"
              :page-size="mineQuery.pageSize"
              :item-count="minePage.total"
              @update:page="handleMinePageChange"
            />
          </div>
        </template>
      </n-spin>
    </section>
  </div>
</template>

<style scoped>
.coupon-page {
  padding-bottom: 48px;
}

.page-width {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
}

.coupon-hero {
  padding: 24px 0 8px;
}

.coupon-hero__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.coupon-hero h1 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 28px;
  color: #111827;
}

.hero-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
}

.muted {
  color: #9ca3af;
}

.empty {
  margin-top: 24px;
}

.card-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.activity-card,
.coupon-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.activity-name {
  font-weight: 600;
  color: #111827;
}

.activity-discount {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
  color: #dc2626;
}

.activity-main p {
  margin: 4px 0 0;
  font-size: 13px;
}

.activity-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .activity-card,
  .coupon-card {
    flex-direction: column;
    align-items: stretch;
  }

  .activity-actions {
    align-items: stretch;
  }
}
</style>
