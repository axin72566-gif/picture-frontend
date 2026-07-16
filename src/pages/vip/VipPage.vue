<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, DiamondOutline } from '@vicons/ionicons5'
import { pageMyCoupons } from '../../api/coupon'
import {
  cancelVipOrder,
  createVipOrder,
  getVipStatus,
  listVipPlans,
  mockPayVipOrder,
  pageVipOrders,
} from '../../api/vip'
import VipOrderCountdown from '../../components/VipOrderCountdown.vue'
import { useAuthStore } from '../../stores/authStore'
import type { UserCouponVO } from '../../types/coupon'
import { CouponErrorCode } from '../../types/coupon'
import type { PageResponse } from '../../types/user'
import type { VipOrderVO, VipPlanVO, VipStatusVO } from '../../types/vip'
import { VipErrorCode, VipOrderStatus } from '../../types/vip'
import { getApiErrorCode, getApiErrorMessage } from '../../utils/apiError'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const auth = useAuthStore()

const loading = ref(false)
const paying = ref(false)
const cancelling = ref(false)
const creating = ref(false)
const selectedPlanId = ref<number | null>(null)
const selectedCouponId = ref<number | null>(null)
const availableCoupons = ref<UserCouponVO[]>([])

const status = ref<VipStatusVO | null>(null)
const plans = ref<VipPlanVO[]>([])
const pendingOrder = ref<VipOrderVO | null>(null)

const orderQuery = reactive({ current: 1, pageSize: 10 })
const orderPage = ref<PageResponse<VipOrderVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const statusExpireLabel = computed(() => formatTime(status.value?.vipExpireTime))

const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value) || null)

const selectedCoupon = computed(
  () => availableCoupons.value.find((c) => c.id === selectedCouponId.value) || null,
)

const payableCents = computed(() => {
  const price = selectedPlan.value?.priceCents ?? 0
  const discount = selectedCoupon.value?.discountCents ?? 0
  return Math.max(0, price - discount)
})

const couponOptions = computed(() =>
  availableCoupons.value.map((c) => ({
    label: `${c.activityName || `券#${c.id}`} · 减 ¥${(c.discountCents / 100).toFixed(2)}`,
    value: c.id,
  })),
)

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

function statusLabel(s: string) {
  switch (s) {
    case VipOrderStatus.PENDING:
      return '待支付'
    case VipOrderStatus.PAID:
      return '已支付'
    case VipOrderStatus.CANCELLED:
      return '已取消'
    case VipOrderStatus.EXPIRED:
      return '已过期'
    default:
      return s
  }
}

function statusTagType(s: string): 'warning' | 'success' | 'default' | 'error' {
  switch (s) {
    case VipOrderStatus.PENDING:
      return 'warning'
    case VipOrderStatus.PAID:
      return 'success'
    case VipOrderStatus.EXPIRED:
      return 'error'
    default:
      return 'default'
  }
}

function orderDiscount(item: VipOrderVO) {
  return item.discountCents && item.discountCents > 0 ? item.discountCents : 0
}

function syncPendingFromOrders(records: VipOrderVO[]) {
  const pending = records.find((o) => o.status === VipOrderStatus.PENDING) || null
  pendingOrder.value = pending
}

function applyCouponQuery() {
  const raw = route.query.couponId
  if (raw == null || raw === '') return
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(id) || id <= 0) return
  if (availableCoupons.value.some((c) => c.id === id)) {
    selectedCouponId.value = id
  }
}

async function fetchStatus() {
  const response = await getVipStatus()
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '状态加载失败')
  status.value = data
}

async function fetchPlans() {
  const response = await listVipPlans()
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '套餐加载失败')
  plans.value = data
  if (selectedPlanId.value === null && data.length > 0) {
    selectedPlanId.value = data[0].id
  }
}

async function fetchOrders() {
  const response = await pageVipOrders({
    current: orderQuery.current,
    pageSize: orderQuery.pageSize,
  })
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '订单加载失败')
  orderPage.value = data
  if (orderQuery.current === 1) {
    syncPendingFromOrders(data.records)
  }
}

async function fetchAvailableCoupons() {
  const response = await pageMyCoupons({
    current: 1,
    pageSize: 50,
    status: 'UNUSED',
  })
  const data = response.data.data
  if (!data) throw new Error(response.data.message || '优惠券加载失败')
  availableCoupons.value = data.records || []
  if (
    selectedCouponId.value != null &&
    !availableCoupons.value.some((c) => c.id === selectedCouponId.value)
  ) {
    selectedCouponId.value = null
  }
  applyCouponQuery()
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([fetchStatus(), fetchPlans(), fetchOrders(), fetchAvailableCoupons()])
  } catch (error) {
    message.error(getApiErrorMessage(error, '加载失败'))
  } finally {
    loading.value = false
  }
}

async function handleCreateOrder() {
  if (selectedPlanId.value === null) {
    message.warning('请选择套餐')
    return
  }
  creating.value = true
  try {
    const response = await createVipOrder({
      planId: selectedPlanId.value,
      couponId: selectedCouponId.value ?? undefined,
    })
    const order = response.data.data
    if (!order) throw new Error(response.data.message || '下单失败')
    pendingOrder.value = order
    message.success('订单已创建，请在 15 分钟内完成支付')
    selectedCouponId.value = null
    orderQuery.current = 1
    await Promise.all([fetchOrders(), fetchAvailableCoupons()])
  } catch (error) {
    const code = getApiErrorCode(error)
    if (code === VipErrorCode.PENDING_ORDER_EXISTS) {
      message.warning(getApiErrorMessage(error, '已有待支付订单'))
      orderQuery.current = 1
      await fetchOrders()
      return
    }
    if (code === CouponErrorCode.EXPIRED || code === CouponErrorCode.STATUS_ERROR) {
      message.warning(getApiErrorMessage(error, '优惠券不可用'))
      await fetchAvailableCoupons()
      return
    }
    message.error(getApiErrorMessage(error, '下单失败'))
  } finally {
    creating.value = false
  }
}

async function handleMockPay() {
  if (!pendingOrder.value) return
  paying.value = true
  try {
    const response = await mockPayVipOrder(pendingOrder.value.orderNo)
    const order = response.data.data
    if (!order) throw new Error(response.data.message || '支付失败')
    message.success('支付成功，VIP 已开通')
    pendingOrder.value = null
    await auth.fetchCurrentUser()
    orderQuery.current = 1
    await Promise.all([fetchStatus(), fetchOrders(), fetchAvailableCoupons()])
  } catch (error) {
    const code = getApiErrorCode(error)
    if (code === VipErrorCode.ORDER_EXPIRED) {
      message.error('订单已过期')
      pendingOrder.value = null
      await Promise.all([fetchOrders(), fetchAvailableCoupons()])
      return
    }
    message.error(getApiErrorMessage(error, '支付失败'))
  } finally {
    paying.value = false
  }
}

async function handleCancel() {
  if (!pendingOrder.value) return
  cancelling.value = true
  try {
    await cancelVipOrder(pendingOrder.value.orderNo)
    message.success('订单已取消')
    pendingOrder.value = null
    orderQuery.current = 1
    await Promise.all([fetchOrders(), fetchAvailableCoupons()])
  } catch (error) {
    const code = getApiErrorCode(error)
    if (code === VipErrorCode.ORDER_EXPIRED) {
      message.warning('订单已过期')
      pendingOrder.value = null
      await Promise.all([fetchOrders(), fetchAvailableCoupons()])
      return
    }
    message.error(getApiErrorMessage(error, '取消失败'))
  } finally {
    cancelling.value = false
  }
}

async function handlePendingExpired() {
  message.warning('支付已超时，订单已过期')
  pendingOrder.value = null
  orderQuery.current = 1
  await Promise.all([fetchOrders(), fetchAvailableCoupons()])
}

function handleOrderPageChange(page: number) {
  orderQuery.current = page
  void fetchOrders().catch((error) => {
    message.error(getApiErrorMessage(error, '订单加载失败'))
  })
}

watch(
  () => route.query.couponId,
  () => {
    applyCouponQuery()
  },
)

onMounted(() => {
  void loadAll()
})
</script>

<template>
  <div class="vip-page">
    <section class="page-width vip-hero">
      <div class="vip-hero__left">
        <n-button quaternary @click="router.push('/')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回
        </n-button>
        <div>
          <h1>
            <n-icon :component="DiamondOutline" />
            VIP 会员
          </h1>
          <p class="hero-subtitle">提升可创建团队空间数与单空间成员上限</p>
        </div>
      </div>
    </section>

    <section class="page-width">
      <n-spin :show="loading">
        <div class="vip-grid">
          <div class="panel status-panel">
            <h2>当前权益</h2>
            <template v-if="status">
              <div class="status-row">
                <n-tag :type="status.vipActive ? 'success' : 'default'" size="medium">
                  {{ status.vipActive ? 'VIP 有效' : '未开通 / 已过期' }}
                </n-tag>
                <span v-if="status.vipExpireTime" class="muted">到期：{{ statusExpireLabel }}</span>
              </div>
              <ul class="quota-list">
                <li>
                  可创建空间
                  <strong>{{ status.ownedSpaceCount }} / {{ status.maxOwnedSpaces }}</strong>
                </li>
                <li>
                  单空间成员上限
                  <strong>{{ status.maxMembersPerSpace }}</strong>
                </li>
              </ul>
              <p class="hint">
                免费：1 空间 / 5 成员；VIP：5 空间 / 50 成员。成员上限以空间创建者为准。
              </p>
              <n-button text type="primary" class="coupon-link" @click="router.push('/coupons')">
                去抢优惠券
              </n-button>
            </template>
            <p v-else class="muted">暂无状态</p>
          </div>

          <div class="panel">
            <h2>选择套餐</h2>
            <div v-if="plans.length === 0" class="muted">暂无上架套餐</div>
            <div v-else class="plan-list">
              <button
                v-for="plan in plans"
                :key="plan.id"
                type="button"
                class="plan-card"
                :class="{ 'plan-card--active': selectedPlanId === plan.id }"
                @click="selectedPlanId = plan.id"
              >
                <div class="plan-name">{{ plan.name }}</div>
                <div class="plan-price">{{ formatPrice(plan.priceCents) }}</div>
                <div class="plan-meta">{{ plan.durationDays }} 天</div>
              </button>
            </div>

            <div class="coupon-select">
              <div class="coupon-select__label">优惠券</div>
              <n-select
                v-model:value="selectedCouponId"
                :options="couponOptions"
                clearable
                placeholder="不使用优惠券"
                :disabled="!!pendingOrder"
              />
              <p v-if="selectedPlan" class="price-summary">
                <template v-if="selectedCoupon">
                  <span class="muted strike">{{ formatPrice(selectedPlan.priceCents) }}</span>
                  <span>减免 {{ formatPrice(selectedCoupon.discountCents) }}，实付</span>
                  <strong class="pay-price">{{ formatPrice(payableCents) }}</strong>
                </template>
                <template v-else>
                  实付 <strong class="pay-price">{{ formatPrice(selectedPlan.priceCents) }}</strong>
                </template>
              </p>
            </div>

            <n-button
              type="primary"
              class="buy-btn"
              :loading="creating"
              :disabled="!!pendingOrder || plans.length === 0"
              @click="handleCreateOrder"
            >
              {{ pendingOrder ? '请先完成待支付订单' : '立即开通' }}
            </n-button>
          </div>
        </div>

        <div v-if="pendingOrder" class="panel pending-panel">
          <div class="pending-head">
            <h2>待支付订单</h2>
            <VipOrderCountdown :expire-time="pendingOrder.expireTime" @expired="handlePendingExpired" />
          </div>
          <p>
            {{ pendingOrder.planName || '套餐' }} ·
            <template v-if="orderDiscount(pendingOrder) > 0">
              <span class="muted strike">{{
                formatPrice(pendingOrder.originalAmountCents ?? pendingOrder.amountCents)
              }}</span>
              减免 {{ formatPrice(orderDiscount(pendingOrder)) }}，实付
            </template>
            {{ formatPrice(pendingOrder.amountCents) }} · 订单号 {{ pendingOrder.orderNo }}
          </p>
          <div class="pending-actions">
            <n-button type="primary" :loading="paying" @click="handleMockPay">模拟支付</n-button>
            <n-button :loading="cancelling" @click="handleCancel">取消订单</n-button>
          </div>
          <p class="hint">当前为开发环境模拟支付，支付成功后立即开通 / 续期 VIP。</p>
        </div>

        <div class="panel">
          <h2>我的订单</h2>
          <div v-if="orderPage.records.length === 0" class="muted">暂无订单</div>
          <ul v-else class="order-list">
            <li v-for="item in orderPage.records" :key="item.id" class="order-item">
              <div>
                <strong>{{ item.planName || item.planCode || `套餐#${item.planId}` }}</strong>
                <p class="muted">
                  {{ item.orderNo }} ·
                  <template v-if="orderDiscount(item) > 0">
                    <span class="strike">{{
                      formatPrice(item.originalAmountCents ?? item.amountCents)
                    }}</span>
                    → {{ formatPrice(item.amountCents) }}
                  </template>
                  <template v-else>{{ formatPrice(item.amountCents) }}</template>
                  · {{ formatTime(item.createTime) }}
                </p>
              </div>
              <n-tag :type="statusTagType(item.status)" size="small">
                {{ statusLabel(item.status) }}
              </n-tag>
            </li>
          </ul>
          <div v-if="orderPage.total > orderQuery.pageSize" class="pager">
            <n-pagination
              :page="orderQuery.current"
              :page-size="orderQuery.pageSize"
              :item-count="orderPage.total"
              @update:page="handleOrderPageChange"
            />
          </div>
        </div>
      </n-spin>
    </section>
  </div>
</template>

<style scoped>
.vip-page {
  padding-bottom: 48px;
}

.page-width {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
}

.vip-hero {
  padding: 24px 0 8px;
}

.vip-hero__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.vip-hero h1 {
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

.vip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.panel {
  margin-top: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.status-panel {
  margin-top: 16px;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.quota-list {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.quota-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #374151;
}

.hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.coupon-link {
  margin-top: 8px;
  padding: 0;
}

.muted {
  color: #9ca3af;
}

.strike {
  text-decoration: line-through;
  margin-right: 6px;
}

.plan-list {
  display: grid;
  gap: 10px;
}

.plan-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fafafa;
  cursor: pointer;
}

.plan-card--active {
  border-color: #2563eb;
  background: #eff6ff;
}

.plan-name {
  font-weight: 600;
  color: #111827;
}

.plan-price {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: #1d4ed8;
}

.plan-meta {
  margin-top: 2px;
  font-size: 13px;
  color: #6b7280;
}

.coupon-select {
  margin-top: 14px;
}

.coupon-select__label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #374151;
}

.price-summary {
  margin: 10px 0 0;
  font-size: 14px;
  color: #374151;
}

.pay-price {
  color: #dc2626;
  font-size: 18px;
}

.buy-btn {
  margin-top: 14px;
  width: 100%;
}

.pending-panel {
  border-color: #fbbf24;
  background: #fffbeb;
}

.pending-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pending-head h2 {
  margin: 0;
}

.pending-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-item:last-child {
  border-bottom: 0;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .vip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
