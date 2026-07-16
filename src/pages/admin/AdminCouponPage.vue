<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { ArrowBackOutline, PricetagOutline } from '@vicons/ionicons5'
import {
  createCouponActivity,
  pageAdminCouponActivities,
  updateCouponActivity,
} from '../../api/coupon'
import { useAuthStore } from '../../stores/authStore'
import type { CouponActivityVO } from '../../types/coupon'
import type { PageResponse } from '../../types/user'
import { getApiErrorMessage } from '../../utils/apiError'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

const query = reactive({ current: 1, pageSize: 10 })
const page = ref<PageResponse<CouponActivityVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const form = reactive({
  name: '',
  discountYuan: null as number | null,
  totalStock: null as number | null,
  range: null as [number, number] | null,
  couponValidDays: 7 as number | null,
  online: true,
  status: 1 as number,
})

const isAdmin = computed(() => auth.user?.userRole === 'admin')
const isEdit = computed(() => editingId.value != null)

const formRules: FormRules = {
  name: { required: true, message: '请输入活动名称', trigger: ['blur', 'input'] },
  discountYuan: {
    required: true,
    type: 'number',
    min: 0.01,
    message: '减免金额须大于 0',
    trigger: ['blur', 'change'],
  },
  totalStock: {
    required: true,
    type: 'number',
    min: 1,
    message: '库存须大于 0',
    trigger: ['blur', 'change'],
  },
  range: {
    required: true,
    type: 'array',
    message: '请选择活动时间',
    trigger: ['blur', 'change'],
  },
  couponValidDays: {
    required: true,
    type: 'number',
    min: 1,
    message: '有效天数须大于 0',
    trigger: ['blur', 'change'],
  },
}

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

function toLocalDateTime(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseToMs(value: string) {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? Date.now() : ms
}

function resetForm() {
  form.name = ''
  form.discountYuan = null
  form.totalStock = null
  form.range = null
  form.couponValidDays = 7
  form.online = true
  form.status = 1
  editingId.value = null
}

async function ensureAdmin() {
  if (!auth.isAuthenticated) {
    await router.replace({ path: '/login', query: { redirect: '/admin/coupons' } })
    return false
  }
  if (!isAdmin.value) {
    message.error('需要管理员权限')
    await router.replace('/')
    return false
  }
  return true
}

async function fetchList() {
  loading.value = true
  try {
    const response = await pageAdminCouponActivities({
      current: query.current,
      pageSize: query.pageSize,
    })
    const data = response.data.data
    if (!data) throw new Error(response.data.message || '加载失败')
    page.value = data
  } catch (error) {
    message.error(getApiErrorMessage(error, '加载活动失败'))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  const now = Date.now()
  form.range = [now, now + 7 * 24 * 60 * 60 * 1000]
  showForm.value = true
}

function openEdit(item: CouponActivityVO) {
  editingId.value = item.id
  form.name = item.name
  form.discountYuan = item.discountCents / 100
  form.totalStock = item.totalStock
  form.range = [parseToMs(item.startTime), parseToMs(item.endTime)]
  form.couponValidDays = item.couponValidDays
  form.status = item.status
  form.online = item.status === 1
  showForm.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (!form.range || form.discountYuan == null || form.totalStock == null || form.couponValidDays == null) {
    return
  }
  saving.value = true
  try {
    const discountCents = Math.round(form.discountYuan * 100)
    const startTime = toLocalDateTime(form.range[0])
    const endTime = toLocalDateTime(form.range[1])
    if (isEdit.value && editingId.value != null) {
      await updateCouponActivity(editingId.value, {
        name: form.name.trim(),
        discountCents,
        totalStock: form.totalStock,
        startTime,
        endTime,
        couponValidDays: form.couponValidDays,
        status: form.status,
      })
      message.success('活动已更新')
    } else {
      await createCouponActivity({
        name: form.name.trim(),
        discountCents,
        totalStock: form.totalStock,
        startTime,
        endTime,
        couponValidDays: form.couponValidDays,
        online: form.online,
      })
      message.success('活动已创建')
    }
    showForm.value = false
    query.current = 1
    await fetchList()
  } catch (error) {
    message.error(getApiErrorMessage(error, '保存失败'))
  } finally {
    saving.value = false
  }
}

async function toggleStatus(item: CouponActivityVO) {
  try {
    await updateCouponActivity(item.id, {
      status: item.status === 1 ? 0 : 1,
    })
    message.success(item.status === 1 ? '已下架' : '已上架')
    await fetchList()
  } catch (error) {
    message.error(getApiErrorMessage(error, '更新状态失败'))
  }
}

onMounted(async () => {
  if (!(await ensureAdmin())) return
  await fetchList()
})
</script>

<template>
  <div class="admin-page">
    <section class="page-width hero">
      <n-button quaternary @click="router.push('/admin')">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        聊天治理
      </n-button>
      <h1>
        <n-icon :component="PricetagOutline" />
        优惠券活动
      </h1>
      <p class="subtitle">配置秒杀活动与库存（仅管理员）</p>
    </section>

    <section class="page-width body">
      <div class="toolbar">
        <n-button type="primary" @click="openCreate">创建活动</n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="page.records.length === 0" class="empty">暂无活动</div>
        <ul v-else class="list">
          <li v-for="item in page.records" :key="item.id" class="card">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">
                减 {{ formatPrice(item.discountCents) }} · 库存 {{ item.remainStock }} /
                {{ item.totalStock }} · 领取后 {{ item.couponValidDays }} 天有效
              </p>
              <p class="muted">
                {{ formatTime(item.startTime) }} — {{ formatTime(item.endTime) }}
              </p>
            </div>
            <div class="actions">
              <n-tag :type="item.status === 1 ? 'success' : 'default'" size="small">
                {{ item.status === 1 ? '上架' : '下架' }}
              </n-tag>
              <n-button size="small" secondary @click="openEdit(item)">编辑</n-button>
              <n-button size="small" secondary @click="toggleStatus(item)">
                {{ item.status === 1 ? '下架' : '上架' }}
              </n-button>
            </div>
          </li>
        </ul>

        <div v-if="page.total > query.pageSize" class="pager">
          <n-pagination
            :page="query.current"
            :page-size="query.pageSize"
            :item-count="page.total"
            @update:page="
              (p: number) => {
                query.current = p
                void fetchList()
              }
            "
          />
        </div>
      </n-spin>
    </section>

    <n-modal
      v-model:show="showForm"
      preset="card"
      :title="isEdit ? '编辑活动' : '创建活动'"
      style="width: min(520px, calc(100vw - 32px))"
    >
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
        <n-form-item label="活动名称" path="name">
          <n-input v-model:value="form.name" maxlength="64" placeholder="例如：VIP 满减秒杀" />
        </n-form-item>
        <n-form-item label="减免金额（元）" path="discountYuan">
          <n-input-number
            v-model:value="form.discountYuan"
            :min="0.01"
            :precision="2"
            :step="1"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="总库存" path="totalStock">
          <n-input-number v-model:value="form.totalStock" :min="1" :precision="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="活动时间" path="range">
          <n-date-picker
            v-model:value="form.range"
            type="datetimerange"
            clearable
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="领取后有效天数" path="couponValidDays">
          <n-input-number
            v-model:value="form.couponValidDays"
            :min="1"
            :precision="0"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item v-if="!isEdit" label="创建后立即上架">
          <n-switch v-model:value="form.online" />
        </n-form-item>
        <n-form-item v-else label="上架状态">
          <n-switch
            :value="form.status === 1"
            @update:value="(v: boolean) => (form.status = v ? 1 : 0)"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showForm = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.admin-page {
  padding-bottom: 48px;
}

.page-width {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
}

.hero {
  padding: 24px 0 8px;
}

.hero h1 {
  margin: 12px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 28px;
  color: #111827;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
}

.body {
  margin-top: 8px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.muted {
  margin: 4px 0 0;
  color: #9ca3af;
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.empty {
  color: #9ca3af;
  padding: 24px 0;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .card {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    flex-wrap: wrap;
  }
}
</style>
