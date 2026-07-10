<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  CreateOutline,
  DownloadOutline,
  ImageOutline,
  OpenOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { deletePicture, getMyPicturePage, getPublicPicturePage, updatePicture } from '../api/picture'
import { useAuthStore } from '../stores/authStore'
import type { PageResult, PictureSortField, PictureVO, SortOrder } from '../types/picture'

const props = defineProps<{
  mode: 'public' | 'mine'
  title: string
  subtitle: string
}>()

const message = useMessage()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const editingId = ref<number | null>(null)
const editingName = ref('')
const savingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const query = reactive({
  current: 1,
  pageSize: 12,
  name: '',
  minSizeMb: null as number | null,
  maxSizeMb: null as number | null,
  sortField: 'createTime' as PictureSortField,
  sortOrder: 'desc' as SortOrder,
})

const pageData = ref<PageResult<PictureVO>>({
  records: [],
  total: 0,
  size: 12,
  current: 1,
  pages: 0,
})

const isMine = computed(() => props.mode === 'mine')
const records = computed(() => pageData.value.records)

const sortFieldOptions = [
  { label: '上传时间', value: 'createTime' },
  { label: '名称', value: 'name' },
  { label: '大小', value: 'size' },
]

const sortOrderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
]

function buildParams() {
  return {
    current: query.current,
    pageSize: query.pageSize,
    name: query.name.trim(),
    minSize: query.minSizeMb ? Math.round(query.minSizeMb * 1024 * 1024) : null,
    maxSize: query.maxSizeMb ? Math.round(query.maxSizeMb * 1024 * 1024) : null,
    sortField: query.sortField,
    sortOrder: query.sortOrder,
  }
}

async function fetchPictures() {
  loading.value = true
  try {
    const response =
      props.mode === 'mine'
        ? await getMyPicturePage(buildParams())
        : await getPublicPicturePage(buildParams())
    pageData.value = response.data.data
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '图片加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.current = 1
  void fetchPictures()
}

function resetFilters() {
  query.name = ''
  query.minSizeMb = null
  query.maxSizeMb = null
  query.sortField = 'createTime'
  query.sortOrder = 'desc'
  query.current = 1
  void fetchPictures()
}

function handlePageChange(page: number) {
  query.current = page
  void fetchPictures()
}

function startEdit(picture: PictureVO) {
  editingId.value = picture.id
  editingName.value = picture.name
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function submitEdit(picture: PictureVO) {
  const nextName = editingName.value.trim()
  if (!nextName) {
    message.warning('请输入图片名称')
    return
  }

  savingId.value = picture.id
  try {
    const response = await updatePicture({ id: picture.id, name: nextName })
    const index = pageData.value.records.findIndex((item) => item.id === picture.id)
    if (index >= 0) {
      pageData.value.records[index] = response.data.data
    }
    message.success('图片名称已更新')
    cancelEdit()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '更新失败'
    message.error(errorMessage)
  } finally {
    savingId.value = null
  }
}

async function handleDelete(picture: PictureVO) {
  deletingId.value = picture.id
  try {
    await deletePicture(picture.id)
    message.success('图片已删除')
    if (records.value.length === 1 && query.current > 1) {
      query.current -= 1
    }
    await fetchPictures()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '删除失败'
    message.error(errorMessage)
  } finally {
    deletingId.value = null
  }
}

function openImage(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function downloadImage(picture: PictureVO) {
  const link = document.createElement('a')
  link.href = picture.url
  link.download = picture.name
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.click()
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value: string) {
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

watch(
  () => props.mode,
  () => {
    query.current = 1
    void fetchPictures()
  },
)

onMounted(() => {
  void fetchPictures()
})
</script>

<template>
  <div class="library-page">
    <section class="page-width library-hero">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="hero-subtitle">{{ subtitle }}</p>
      </div>
      <div class="hero-actions">
        <n-button :loading="loading" @click="fetchPictures">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
      </div>
    </section>

    <section class="page-width filter-bar">
      <n-input
        v-model:value="query.name"
        clearable
        placeholder="按图片名称搜索"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
      <n-input-number v-model:value="query.minSizeMb" clearable :min="0" placeholder="最小 MB" />
      <n-input-number v-model:value="query.maxSizeMb" clearable :min="0" placeholder="最大 MB" />
      <n-select v-model:value="query.sortField" :options="sortFieldOptions" />
      <n-select v-model:value="query.sortOrder" :options="sortOrderOptions" />
      <n-button type="primary" @click="handleSearch">搜索</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </section>

    <section class="page-width">
      <n-spin :show="loading">
        <div v-if="records.length" class="picture-grid">
          <article v-for="picture in records" :key="picture.id" class="picture-card">
            <button class="image-button" type="button" @click="openImage(picture.url)">
              <img :src="picture.url" :alt="picture.name" loading="lazy" />
            </button>

            <div class="picture-body">
              <div v-if="editingId === picture.id" class="edit-row">
                <n-input v-model:value="editingName" size="small" @keyup.enter="submitEdit(picture)" />
                <n-button
                  size="small"
                  type="primary"
                  :loading="savingId === picture.id"
                  @click="submitEdit(picture)"
                >
                  保存
                </n-button>
                <n-button size="small" quaternary @click="cancelEdit">取消</n-button>
              </div>
              <template v-else>
                <h2 :title="picture.name">{{ picture.name }}</h2>
                <p>{{ picture.width }} x {{ picture.height }} · {{ formatFileSize(picture.size) }}</p>
              </template>

              <div class="meta-row">
                <span>{{ picture.format || picture.contentType }}</span>
                <span>{{ formatDate(picture.createTime) }}</span>
              </div>

              <div class="card-actions">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button circle quaternary @click="openImage(picture.url)">
                      <template #icon>
                        <n-icon :component="OpenOutline" />
                      </template>
                    </n-button>
                  </template>
                  打开原图
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button circle quaternary @click="downloadImage(picture)">
                      <template #icon>
                        <n-icon :component="DownloadOutline" />
                      </template>
                    </n-button>
                  </template>
                  下载图片
                </n-tooltip>
                <template v-if="isMine">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button circle quaternary @click="startEdit(picture)">
                        <template #icon>
                          <n-icon :component="CreateOutline" />
                        </template>
                      </n-button>
                    </template>
                    编辑名称
                  </n-tooltip>
                  <n-popconfirm
                    positive-text="删除"
                    negative-text="取消"
                    @positive-click="handleDelete(picture)"
                  >
                    <template #trigger>
                      <n-button circle quaternary type="error" :loading="deletingId === picture.id">
                        <template #icon>
                          <n-icon :component="TrashOutline" />
                        </template>
                      </n-button>
                    </template>
                    删除后会同步删除源文件，确定继续吗？
                  </n-popconfirm>
                </template>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <n-icon :component="ImageOutline" />
          <h2>暂无图片</h2>
          <p>{{ isMine ? '上传第一张图片后，它会出现在这里。' : '当前还没有公开图片，稍后再来看看。' }}</p>
          <n-button v-if="auth.isAuthenticated" type="primary" @click="router.push('/upload')">上传图片</n-button>
        </div>
      </n-spin>
    </section>

    <section v-if="pageData.pages > 1" class="page-width pagination-row">
      <n-pagination
        :page="query.current"
        :page-size="query.pageSize"
        :page-count="pageData.pages"
        :item-count="pageData.total"
        show-size-picker
        :page-sizes="[12, 24, 36]"
        @update:page="handlePageChange"
        @update:page-size="
          (size: number) => {
            query.pageSize = size
            query.current = 1
            fetchPictures()
          }
        "
      />
    </section>
  </div>
</template>

<style scoped>
.library-page {
  flex: 1;
  padding: 32px 0 48px;
}

.library-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 0 20px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.18;
}

.hero-subtitle {
  margin-top: 12px;
  max-width: 660px;
  color: #4b5563;
  font-size: 16px;
  line-height: 1.7;
}

.hero-actions,
.card-actions {
  display: flex;
  align-items: center;
}

.hero-actions {
  gap: 10px;
  flex-wrap: wrap;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 120px 120px 150px 120px auto auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.picture-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.picture-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.image-button {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  padding: 0;
  border: 0;
  background: #f8fafc;
  cursor: zoom-in;
}

.image-button img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.picture-body {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.picture-body h2 {
  overflow: hidden;
  color: #111827;
  font-size: 16px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picture-body p,
.meta-row {
  color: #6b7280;
  font-size: 13px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.meta-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  justify-content: flex-end;
  gap: 2px;
  min-height: 34px;
}

.edit-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}

.empty-state {
  min-height: 360px;
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

.empty-state h2 {
  color: #111827;
  font-size: 20px;
}

.pagination-row {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

@media (max-width: 980px) {
  .library-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .picture-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .library-page {
    padding-top: 18px;
  }

  .filter-bar,
  .picture-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .hero-actions .n-button,
  .filter-bar .n-button {
    width: 100%;
  }

}
</style>
