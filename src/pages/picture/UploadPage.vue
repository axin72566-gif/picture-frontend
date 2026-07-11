<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  CheckmarkCircleOutline,
  CloudUploadOutline,
  ImageOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { updatePicture, uploadPicture } from '../../api/picture'
import type { PictureUploadResult } from '../../types/picture'
import UserAvatar from '../../components/UserAvatar.vue'

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

const router = useRouter()
const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const uploadResult = ref<PictureUploadResult | null>(null)
const uploading = ref(false)
const savingInfo = ref(false)
const progress = ref(0)
const dragActive = ref(false)
const editName = ref('')
const editDescription = ref('')

const fileSizeText = computed(() => {
  if (!selectedFile.value) return ''
  return formatFileSize(selectedFile.value.size)
})

const resultCreatedAt = computed(() => formatDate(uploadResult.value?.createTime))
const resultCreatorName = computed(
  () => uploadResult.value?.user?.userName || uploadResult.value?.user?.userAccount || '未知用户',
)
const resultCreatorAvatar = computed(() => uploadResult.value?.user?.userAvatar || '')
const resultCreatorAvatarText = computed(() => resultCreatorName.value.slice(0, 1).toUpperCase())

function goToCreatorProfile() {
  const creatorId = uploadResult.value?.userId || uploadResult.value?.user?.id
  if (!creatorId) {
    message.warning('无法查看该用户资料')
    return
  }
  void router.push(`/user/${creatorId}`)
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

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

function chooseFile() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectFile(file)
  }
  input.value = ''
}

function handleDrop(event: DragEvent) {
  dragActive.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    selectFile(file)
  }
}

function selectFile(file: File) {
  if (!allowedTypes.includes(file.type)) {
    message.error('文件类型不支持，仅支持 jpg、png、gif、webp')
    return
  }

  if (file.size > maxFileSize) {
    message.error('文件不能超过 10MB')
    return
  }

  revokePreviewUrl()
  selectedFile.value = file
  uploadResult.value = null
  editName.value = ''
  editDescription.value = ''
  progress.value = 0
  previewUrl.value = URL.createObjectURL(file)
}

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

function clearSelection() {
  revokePreviewUrl()
  selectedFile.value = null
  uploadResult.value = null
  editName.value = ''
  editDescription.value = ''
  progress.value = 0
}

async function submitUpload() {
  if (!selectedFile.value) {
    message.warning('请先选择一张图片')
    return
  }

  uploading.value = true
  progress.value = 0
  try {
    const response = await uploadPicture(selectedFile.value, (event) => {
      if (event.total) {
        progress.value = Math.round((event.loaded / event.total) * 100)
      }
    })
    const uploaded = response.data.data
    if (!uploaded) {
      throw new Error(response.data.message || '图片上传失败')
    }
    uploadResult.value = uploaded
    editName.value = uploaded.name
    editDescription.value = uploaded.description ?? ''
    progress.value = 100
    message.success('图片上传成功')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '图片上传失败'
    message.error(errorMessage)
  } finally {
    uploading.value = false
  }
}

async function submitPictureInfo() {
  if (!uploadResult.value) return

  const nextName = editName.value.trim()
  const nextDescription = editDescription.value.trim()
  if (!nextName) {
    message.warning('请输入图片名称')
    return
  }

  savingInfo.value = true
  try {
    const response = await updatePicture({
      id: uploadResult.value.id,
      name: nextName,
      description: nextDescription,
    })
    const updated = response.data.data
    if (!updated) {
      throw new Error(response.data.message || '更新失败')
    }
    uploadResult.value = updated
    editName.value = updated.name
    editDescription.value = updated.description ?? ''
    message.success('图片信息已更新')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '更新失败'
    message.error(errorMessage)
  } finally {
    savingInfo.value = false
  }
}

onBeforeUnmount(() => {
  revokePreviewUrl()
})
</script>

<template>
  <div class="upload-page">
    <section class="page-width upload-hero">
      <div>
        <h1>上传图片</h1>
      </div>
    </section>

    <section class="page-width upload-layout">
      <div class="upload-panel">
        <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          @change="handleFileChange"
        />

        <button
          class="drop-zone"
          :class="{ 'drop-zone--active': dragActive }"
          type="button"
          @click="chooseFile"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="handleDrop"
        >
          <span class="drop-icon">
            <n-icon :component="CloudUploadOutline" />
          </span>
          <strong>选择或拖入图片</strong>
          <span>将以 multipart/form-data 的 file 字段提交</span>
        </button>

        <div v-if="selectedFile" class="file-preview">
          <div class="preview-frame">
            <img :src="previewUrl" :alt="selectedFile.name" />
          </div>
          <div v-if="!uploadResult" class="file-detail">
            <div>
              <span class="detail-label">文件名</span>
              <strong>{{ selectedFile.name }}</strong>
            </div>
            <div>
              <span class="detail-label">大小</span>
              <strong>{{ fileSizeText }}</strong>
            </div>
            <div>
              <span class="detail-label">类型</span>
              <strong>{{ selectedFile.type }}</strong>
            </div>
          </div>
        </div>

        <n-progress
          v-if="uploading || progress > 0"
          type="line"
          :percentage="progress"
          :processing="uploading"
          :status="progress === 100 ? 'success' : 'default'"
          indicator-placement="inside"
        />

        <div class="upload-actions">
          <n-button type="primary" size="large" :loading="uploading" @click="submitUpload">
            <template #icon>
              <n-icon :component="CloudUploadOutline" />
            </template>
            上传图片
          </n-button>
          <n-button size="large" :disabled="uploading" @click="chooseFile">再次选择</n-button>
          <n-button size="large" quaternary :disabled="uploading || !selectedFile" @click="clearSelection">
            <template #icon>
              <n-icon :component="TrashOutline" />
            </template>
            清除
          </n-button>
        </div>
      </div>

      <aside class="result-panel">
        <div v-if="uploadResult" class="result-content">
          <div class="result-title">
            <n-icon :component="CheckmarkCircleOutline" />
            <h2>上传成功</h2>
          </div>

          <div class="result-image">
            <img :src="uploadResult.url" :alt="uploadResult.name" />
          </div>

          <n-form class="info-form" label-placement="top" @submit.prevent="submitPictureInfo">
            <n-form-item label="图片名称">
              <n-input
                v-model:value="editName"
                clearable
                maxlength="120"
                placeholder="请输入图片名称"
                @keyup.enter="submitPictureInfo"
              />
            </n-form-item>
            <n-form-item label="图片简介">
              <n-input
                v-model:value="editDescription"
                clearable
                type="textarea"
                maxlength="512"
                show-count
                :autosize="{ minRows: 3, maxRows: 6 }"
                placeholder="请输入图片简介"
              />
            </n-form-item>
            <n-button block type="primary" :loading="savingInfo" @click="submitPictureInfo">
              保存图片信息
            </n-button>
          </n-form>

          <button class="creator-summary" type="button" @click="goToCreatorProfile">
            <UserAvatar :size="34" :src="resultCreatorAvatar" :text="resultCreatorAvatarText" />
            <div>
              <span>创建者</span>
              <strong>{{ resultCreatorName }}</strong>
            </div>
          </button>

          <n-descriptions :column="1" bordered label-placement="left" size="small">
            <n-descriptions-item label="图片 ID">
              {{ uploadResult.id }}
            </n-descriptions-item>
            <n-descriptions-item label="文件名">
              {{ uploadResult.name }}
            </n-descriptions-item>
            <n-descriptions-item label="图片简介">
              <span class="description-value">{{ uploadResult.description || '暂无简介' }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="上传时间">
              {{ resultCreatedAt }}
            </n-descriptions-item>
          </n-descriptions>

        </div>

        <div v-else class="empty-result">
          <n-icon :component="ImageOutline" />
          <h2>等待上传</h2>
          <p>上传成功后，这里会展示图片预览和后端返回的元数据。</p>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.upload-page {
  flex: 1;
  padding: 32px 0 48px;
}

.upload-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 0 24px;
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

.upload-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

.upload-panel,
.result-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.upload-panel {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.file-input {
  display: none;
}

.drop-zone {
  min-height: 220px;
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 28px;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  text-align: center;
}

.drop-zone--active,
.drop-zone:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.drop-icon {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 34px;
}

.drop-zone strong {
  color: #111827;
  font-size: 18px;
}

.drop-zone span:last-child {
  font-size: 14px;
}

.file-preview {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 18px;
  align-items: stretch;
}

.preview-frame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.preview-frame img,
.result-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.file-detail {
  display: grid;
  align-content: center;
  gap: 12px;
  min-width: 0;
}

.detail-label {
  display: block;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 13px;
}

.file-detail strong {
  display: block;
  color: #111827;
  word-break: break-word;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.result-panel {
  min-height: 460px;
  padding: 20px;
}

.result-content {
  display: grid;
  gap: 16px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #16a34a;
}

.result-title h2 {
  color: #111827;
  font-size: 20px;
}

.result-image {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.info-form {
  display: grid;
  gap: 8px;
}

.description-value {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.creator-summary {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
  color: inherit;
}

.creator-summary:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.creator-summary div {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.creator-summary span {
  color: #6b7280;
  font-size: 12px;
}

.creator-summary strong {
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-result {
  min-height: 420px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #64748b;
  text-align: center;
}

.empty-result .n-icon {
  width: 64px;
  height: 64px;
  padding: 14px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
}

.empty-result h2 {
  color: #111827;
  font-size: 20px;
}

.empty-result p {
  max-width: 260px;
  line-height: 1.7;
}

@media (max-width: 960px) {
  .upload-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .upload-page {
    padding-top: 20px;
  }

  .upload-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .upload-panel,
  .result-panel {
    padding: 18px;
  }

  .file-preview {
    grid-template-columns: 1fr;
  }

  .upload-actions,
  .upload-actions .n-button,
  .upload-hero .n-button {
    width: 100%;
  }
}
</style>
