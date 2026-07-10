<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  CalendarOutline,
  CameraOutline,
  CloudUploadOutline,
  CreateOutline,
  LogOutOutline,
  RefreshOutline,
  SaveOutline,
} from '@vicons/ionicons5'
import PictureLibrary from '../../components/PictureLibrary.vue'
import UserAvatar from '../../components/UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import type { UserUpdateRequest } from '../../types/user'

const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const allowedAvatarExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const maxAvatarSize = 10 * 1024 * 1024

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()

const refreshing = ref(false)
const loggingOut = ref(false)
const savingProfile = ref(false)
const uploadingAvatar = ref(false)
const avatarProgress = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedAvatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref('')
const editUserName = ref('')
const editUserProfile = ref('')

const avatarText = computed(() => auth.displayName.slice(0, 1).toUpperCase())
const createdAt = computed(() => formatDate(auth.user?.createTime))
const updatedAt = computed(() => formatDate(auth.user?.updateTime))
const profileText = computed(() => auth.user?.userProfile || '暂无个人简介')
const avatarPreviewSrc = computed(() => avatarPreviewUrl.value || auth.avatarDisplayUrl || '')
const selectedAvatarSize = computed(() => (selectedAvatarFile.value ? formatFileSize(selectedAvatarFile.value.size) : ''))

const profileChanged = computed(() => {
  const currentName = auth.user?.userName || ''
  const currentProfile = auth.user?.userProfile || ''
  return editUserName.value.trim() !== currentName || editUserProfile.value.trim() !== currentProfile
})

watch(
  () => auth.user,
  () => {
    syncEditForm()
  },
  { immediate: true },
)

function syncEditForm() {
  editUserName.value = auth.user?.userName || ''
  editUserProfile.value = auth.user?.userProfile || ''
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function chooseAvatarFile() {
  fileInputRef.value?.click()
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectAvatarFile(file)
  }
  input.value = ''
}

function selectAvatarFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const isAllowedType = allowedAvatarTypes.includes(file.type) || allowedAvatarExtensions.includes(extension)

  if (!isAllowedType) {
    message.error('文件类型不支持，仅支持 jpg、png、gif、webp')
    return
  }

  if (file.size <= 0) {
    message.error('文件不能为空')
    return
  }

  if (file.size > maxAvatarSize) {
    message.error('文件大小不能超过 10MB')
    return
  }

  revokeAvatarPreview()
  selectedAvatarFile.value = file
  avatarProgress.value = 0
  avatarPreviewUrl.value = URL.createObjectURL(file)
}

function revokeAvatarPreview() {
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
    avatarPreviewUrl.value = ''
  }
}

function clearAvatarSelection() {
  revokeAvatarPreview()
  selectedAvatarFile.value = null
  avatarProgress.value = 0
}

async function submitProfile() {
  const nextName = editUserName.value.trim()
  const nextProfile = editUserProfile.value.trim()
  const currentName = auth.user?.userName || ''
  const currentProfile = auth.user?.userProfile || ''
  const payload: UserUpdateRequest = {}

  if (nextName !== currentName) {
    if (!nextName) {
      message.warning('昵称不能为空')
      return
    }

    if (nextName.length > 32) {
      message.warning('昵称长度不能超过 32 个字符')
      return
    }

    payload.userName = nextName
  }

  if (nextProfile !== currentProfile) {
    if (nextProfile.length > 255) {
      message.warning('个人简介长度不能超过 255 个字符')
      return
    }

    payload.userProfile = nextProfile
  }

  if (!Object.keys(payload).length) {
    message.info('资料没有变更')
    return
  }

  savingProfile.value = true
  try {
    await auth.updateProfile(payload)
    message.success('资料已保存')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '保存失败'
    message.error(errorMessage)
  } finally {
    savingProfile.value = false
  }
}

async function submitAvatarUpload() {
  if (!selectedAvatarFile.value) {
    message.warning('请先选择头像图片')
    return
  }

  uploadingAvatar.value = true
  avatarProgress.value = 0
  try {
    await auth.uploadAvatar(selectedAvatarFile.value, (event) => {
      if (event.total) {
        avatarProgress.value = Math.round((event.loaded / event.total) * 100)
      }
    })
    avatarProgress.value = 100
    message.success('头像已更新')
    clearAvatarSelection()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '头像上传失败'
    message.error(errorMessage)
  } finally {
    uploadingAvatar.value = false
  }
}

async function refreshCurrentUser() {
  refreshing.value = true
  try {
    await auth.fetchCurrentUser()
    message.success('用户信息已刷新')
  } finally {
    refreshing.value = false
  }
}

async function loadCurrentUser() {
  if (!auth.isAuthenticated) return

  refreshing.value = true
  try {
    await auth.fetchCurrentUser()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '用户信息加载失败'
    message.error(errorMessage)
  } finally {
    refreshing.value = false
  }
}

async function handleLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    message.success('已退出登录')
    await router.push('/login')
  } finally {
    loggingOut.value = false
  }
}

onMounted(() => {
  void loadCurrentUser()
})

onBeforeUnmount(() => {
  revokeAvatarPreview()
})
</script>

<template>
  <div class="profile-page">
    <section class="page-width profile-layout">
      <main class="profile-main">
        <section class="profile-panel profile-summary">
          <div class="profile-header">
            <UserAvatar :key="auth.avatarKey" :size="88" :src="auth.avatarDisplayUrl" :text="avatarText" />
            <div class="profile-title">
              <h1>{{ auth.displayName }}</h1>
              <p>{{ auth.user?.userAccount }}</p>
            </div>
          </div>

          <n-descriptions :column="1" bordered label-placement="left" size="medium">
            <n-descriptions-item label="用户 ID">
              {{ auth.user?.id }}
            </n-descriptions-item>
            <n-descriptions-item label="账号">
              {{ auth.user?.userAccount }}
            </n-descriptions-item>
            <n-descriptions-item label="昵称">
              {{ auth.user?.userName || '暂无' }}
            </n-descriptions-item>
            <n-descriptions-item label="角色">
              <n-tag :type="auth.user?.userRole === 'admin' ? 'warning' : 'info'" size="small">
                {{ auth.roleLabel }}
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
        </section>

        <section class="profile-panel">
          <div class="panel-heading">
            <n-icon :component="CreateOutline" />
            <h2>编辑资料</h2>
          </div>

          <n-form class="profile-form" label-placement="top" @submit.prevent="submitProfile">
            <n-form-item label="昵称">
              <n-input
                v-model:value="editUserName"
                clearable
                maxlength="32"
                show-count
                placeholder="请输入昵称"
                @keyup.enter="submitProfile"
              />
            </n-form-item>
            <n-form-item label="个人简介">
              <n-input
                v-model:value="editUserProfile"
                type="textarea"
                clearable
                maxlength="255"
                show-count
                placeholder="介绍一下自己"
                :autosize="{ minRows: 4, maxRows: 7 }"
              />
            </n-form-item>
            <div class="form-actions">
              <n-button type="primary" :loading="savingProfile" :disabled="!profileChanged" @click="submitProfile">
                <template #icon>
                  <n-icon :component="SaveOutline" />
                </template>
                保存资料
              </n-button>
              <n-button :disabled="savingProfile" @click="syncEditForm">重置</n-button>
            </div>
          </n-form>
        </section>
      </main>

      <aside class="profile-side">
        <section class="profile-panel avatar-panel">
          <div class="panel-heading">
            <n-icon :component="CameraOutline" />
            <h2>头像</h2>
          </div>

          <input
            ref="fileInputRef"
            class="file-input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            @change="handleAvatarChange"
          />

          <button class="avatar-picker" type="button" :disabled="uploadingAvatar" @click="chooseAvatarFile">
            <UserAvatar :key="avatarPreviewSrc || avatarText" :size="112" :src="avatarPreviewSrc" :text="avatarText" />
            <span>选择头像</span>
          </button>

          <div v-if="selectedAvatarFile" class="avatar-file">
            <strong>{{ selectedAvatarFile.name }}</strong>
            <span>{{ selectedAvatarSize }}</span>
          </div>

          <n-progress
            v-if="uploadingAvatar || avatarProgress > 0"
            type="line"
            :percentage="avatarProgress"
            :processing="uploadingAvatar"
            :status="avatarProgress === 100 ? 'success' : 'default'"
            indicator-placement="inside"
          />

          <div class="avatar-actions">
            <n-button block type="primary" :loading="uploadingAvatar" @click="submitAvatarUpload">
              <template #icon>
                <n-icon :component="CloudUploadOutline" />
              </template>
              上传头像
            </n-button>
            <n-button block :disabled="uploadingAvatar || !selectedAvatarFile" @click="clearAvatarSelection">
              清除选择
            </n-button>
          </div>
        </section>

        <section class="profile-panel">
          <div class="side-item">
            <n-icon :component="CalendarOutline" />
            <div>
              <span>加入时间</span>
              <strong>{{ createdAt }}</strong>
            </div>
          </div>
          <div class="side-actions">
            <n-button block :loading="refreshing" @click="refreshCurrentUser">
              <template #icon>
                <n-icon :component="RefreshOutline" />
              </template>
              刷新资料
            </n-button>
            <n-button block type="error" ghost :loading="loggingOut" @click="handleLogout">
              <template #icon>
                <n-icon :component="LogOutOutline" />
              </template>
              退出登录
            </n-button>
          </div>
        </section>
      </aside>
    </section>

    <section class="page-width profile-pictures">
      <PictureLibrary
        mode="mine"
        title="个人图库"
        subtitle=""
        embedded
      />
    </section>
  </div>
</template>

<style scoped>
.profile-page {
  flex: 1;
  padding: 32px 0 48px;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
}

.profile-pictures {
  margin-top: 24px;
}

.profile-main,
.profile-side {
  display: grid;
  align-content: start;
  gap: 18px;
}

.profile-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
}

.profile-summary {
  padding: 28px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 26px;
}

.avatar-text,
.avatar-preview-text {
  color: #fff;
  font-weight: 700;
}

.avatar-text {
  font-size: 32px;
}

.avatar-preview-text {
  font-size: 40px;
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
  font-size: 18px;
  line-height: 1.3;
}

.profile-title {
  min-width: 0;
}

.profile-title p {
  margin-top: 8px;
  color: #6b7280;
  word-break: break-word;
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.panel-heading .n-icon {
  color: #2563eb;
  font-size: 22px;
}

.profile-form {
  display: grid;
  gap: 2px;
}

.form-actions,
.avatar-actions,
.side-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.file-input {
  display: none;
}

.avatar-panel {
  display: grid;
  gap: 16px;
}

.avatar-panel .panel-heading {
  margin-bottom: 0;
}

.avatar-picker {
  display: grid;
  place-items: center;
  gap: 10px;
  width: 100%;
  min-height: 176px;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
}

.avatar-picker:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.avatar-picker:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.avatar-file {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  min-width: 0;
}

.avatar-file strong,
.avatar-file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-file strong {
  color: #111827;
  font-size: 14px;
}

.avatar-file span {
  color: #6b7280;
  font-size: 13px;
}

.avatar-actions,
.side-actions {
  display: grid;
}

.side-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef2f7;
}

.side-item .n-icon {
  width: 42px;
  height: 42px;
  padding: 10px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.side-item span {
  display: block;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 13px;
}

.side-item strong {
  display: block;
  color: #111827;
  font-size: 15px;
  word-break: break-word;
}

.side-actions {
  margin-top: 18px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .profile-page {
    padding-top: 20px;
  }

  .profile-panel,
  .profile-summary {
    padding: 20px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-actions,
  .form-actions .n-button {
    width: 100%;
  }

  :deep(.n-descriptions-table) {
    table-layout: fixed;
  }
}
</style>
