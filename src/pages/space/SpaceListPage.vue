<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, PeopleOutline, AddOutline, MailOutline } from '@vicons/ionicons5'
import { createSpace, getMySpaces } from '../../api/space'
import type { PageResponse } from '../../types/user'
import type { SpaceVO } from '../../types/space'
import { getSpaceRoleLabel } from '../../utils/space'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const creating = ref(false)
const showCreateModal = ref(false)
const query = reactive({
  current: 1,
  pageSize: 10,
})

const createForm = reactive({
  name: '',
  description: '',
})

const pageData = ref<PageResponse<SpaceVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

async function fetchPage() {
  loading.value = true
  try {
    const response = await getMySpaces({
      current: query.current,
      pageSize: query.pageSize,
    })
    const nextPage = response.data.data
    if (!nextPage) {
      throw new Error(response.data.message || '空间列表加载失败')
    }
    pageData.value = nextPage
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '空间列表加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  query.current = page
  void fetchPage()
}

function handlePageSizeChange(pageSize: number) {
  query.pageSize = pageSize
  query.current = 1
  void fetchPage()
}

function openCreateModal() {
  createForm.name = ''
  createForm.description = ''
  showCreateModal.value = true
}

async function handleCreate() {
  const name = createForm.name.trim()
  if (!name) {
    message.warning('请输入空间名称')
    return
  }
  creating.value = true
  try {
    const response = await createSpace({
      name,
      description: createForm.description.trim() || null,
    })
    const space = response.data.data
    if (!space) {
      throw new Error(response.data.message || '创建失败')
    }
    message.success('空间已创建')
    showCreateModal.value = false
    await router.push(`/spaces/${space.id}`)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '创建失败'
    message.error(errorMessage)
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void fetchPage()
})
</script>

<template>
  <div class="space-page">
    <section class="page-width space-hero">
      <div class="space-hero__left">
        <n-button quaternary @click="router.push('/')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回
        </n-button>
        <div>
          <h1>
            <n-icon :component="PeopleOutline" />
            我的空间
          </h1>
          <p class="hero-subtitle">管理你创建或加入的团队空间</p>
        </div>
      </div>
      <div class="space-hero__actions">
        <n-button @click="router.push('/spaces/invites')">
          <template #icon>
            <n-icon :component="MailOutline" />
          </template>
          待处理邀请
        </n-button>
        <n-button type="primary" @click="openCreateModal">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          创建空间
        </n-button>
      </div>
    </section>

    <section class="page-width space-body">
      <n-spin :show="loading">
        <div v-if="pageData.records.length === 0" class="space-empty">暂无空间，点击右上角创建</div>
        <ul v-else class="space-list">
          <li
            v-for="item in pageData.records"
            :key="item.id"
            class="space-card"
            @click="router.push(`/spaces/${item.id}`)"
          >
            <div class="space-card__main">
              <h2>{{ item.name }}</h2>
              <p v-if="item.description" class="space-card__desc">{{ item.description }}</p>
              <p v-else class="space-card__desc space-card__desc--muted">暂无简介</p>
            </div>
            <n-tag size="small" :bordered="false" type="info">
              {{ getSpaceRoleLabel(item.myRole) }}
            </n-tag>
          </li>
        </ul>

        <div v-if="pageData.total > 0" class="space-pagination">
          <n-pagination
            :page="query.current"
            :page-size="query.pageSize"
            :item-count="pageData.total"
            :page-sizes="[10, 20, 50]"
            show-size-picker
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-spin>
    </section>

    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="创建空间"
      style="width: min(480px, calc(100vw - 32px))"
      :mask-closable="!creating"
    >
      <n-form label-placement="top">
        <n-form-item label="空间名称" required>
          <n-input v-model:value="createForm.name" maxlength="64" show-count placeholder="例如：产品设计组" />
        </n-form-item>
        <n-form-item label="简介">
          <n-input
            v-model:value="createForm.description"
            type="textarea"
            maxlength="512"
            show-count
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="可选"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button :disabled="creating" @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="handleCreate">创建</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.space-page {
  padding: 24px 0 48px;
}

.page-width {
  width: min(800px, calc(100% - 32px));
  margin: 0 auto;
}

.space-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.space-hero__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.space-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-size: 26px;
  line-height: 1.25;
}

.hero-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
}

.space-body {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 20px;
}

.space-empty {
  padding: 48px 16px;
  text-align: center;
  color: #9ca3af;
}

.space-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.space-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.space-card:hover {
  background: #f9fafb;
}

.space-card__main {
  min-width: 0;
  flex: 1;
}

.space-card h2 {
  color: #111827;
  font-size: 17px;
}

.space-card__desc {
  margin-top: 6px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.space-card__desc--muted {
  color: #9ca3af;
}

.space-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 640px) {
  .space-hero {
    flex-direction: column;
  }
}
</style>
