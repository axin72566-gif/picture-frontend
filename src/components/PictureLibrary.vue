<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  CreateOutline,
  Heart,
  HeartOutline,
  ImageOutline,
  OpenOutline,
  PeopleOutline,
  PersonAddOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  deletePicture,
  getMyPicturePage,
  getPictureById,
  getPublicPicturePage,
  likePicture,
  unlikePicture,
  updatePicture,
} from '../api/picture'
import { getSpacePicturePage } from '../api/space'
import { followUser, getUserFollowStatus, unfollowUser } from '../api/user'
import { useAuthStore } from '../stores/authStore'
import type { PageResult, PictureSortField, PictureVO, SortOrder } from '../types/picture'
import type { SpaceRole } from '../types/space'
import {
  canDeleteSpacePicture,
  canEditSpacePicture,
  canUploadToSpace,
} from '../utils/space'
import PictureCommentSection from './PictureCommentSection.vue'
import PictureLikersModal from './PictureLikersModal.vue'
import UserAvatar from './UserAvatar.vue'

const props = withDefaults(
  defineProps<{
    mode: 'public' | 'mine' | 'space'
    title: string
    subtitle: string
    embedded?: boolean
    spaceId?: number | null
    myRole?: SpaceRole | null
  }>(),
  {
    embedded: false,
    spaceId: null,
    myRole: null,
  },
)

const message = useMessage()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const editingId = ref<number | null>(null)
const editingName = ref('')
const editingDescription = ref('')
const savingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const detailPicture = ref<PictureVO | null>(null)
const detailFollowLoading = ref(false)
const detailFollowActionLoading = ref(false)
const detailCreatorFollowing = ref(false)
const detailFollowHovered = ref(false)
let detailFollowStatusRequestId = 0
const detailLikeActionLoading = ref(false)
const likersModalVisible = ref(false)

const query = reactive({
  current: 1,
  pageSize: 12,
  name: '',
  description: '',
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
const isSpace = computed(() => props.mode === 'space')
const canUploadHere = computed(() => {
  if (isSpace.value) return canUploadToSpace(props.myRole)
  return auth.isAuthenticated
})
const uploadTargetPath = computed(() => {
  if (isSpace.value && props.spaceId) {
    return { path: '/upload', query: { spaceId: String(props.spaceId) } }
  }
  return { path: '/upload' }
})
const emptyHint = computed(() => {
  if (isSpace.value) return '空间里还没有图片，有编辑权限的成员可以上传。'
  if (isMine.value) return '上传第一张图片后，它会出现在这里。'
  return '当前还没有公开图片，稍后再来看看。'
})
const records = computed(() => pageData.value.records)
const rootClass = computed(() => ({ 'library-page--embedded': props.embedded }))
const sectionClass = computed(() => (props.embedded ? 'library-section' : 'page-width'))
const detailVisible = computed({
  get: () => Boolean(detailPicture.value),
  set: (value: boolean) => {
    if (!value) {
      closePictureDetail()
    }
  },
})
const detailCreatorId = computed(() => {
  const picture = detailPicture.value
  return picture?.userId || picture?.user?.id || null
})
const canFollowDetailCreator = computed(() => {
  const creatorId = detailCreatorId.value
  return Boolean(creatorId && auth.user?.id !== creatorId)
})
const detailFollowLabel = computed(() => {
  if (!auth.isAuthenticated) return '登录后关注'
  if (detailCreatorFollowing.value) return detailFollowHovered.value ? '取消关注' : '已关注'
  return '关注'
})
const canLikeDetailPicture = computed(() => {
  const picture = detailPicture.value
  if (!picture) return false
  const ownerId = picture.userId || picture.user?.id
  return Boolean(ownerId && auth.user?.id !== ownerId)
})
const detailLiked = computed(() => Boolean(detailPicture.value?.liked))
const detailLikeCount = computed(() => detailPicture.value?.likeCount ?? 0)
const detailLikeLabel = computed(() => {
  if (!auth.isAuthenticated) return '登录后点赞'
  return detailLiked.value ? '取消点赞' : '点赞'
})

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
    description: query.description.trim(),
    minSize: query.minSizeMb ? Math.round(query.minSizeMb * 1024 * 1024) : null,
    maxSize: query.maxSizeMb ? Math.round(query.maxSizeMb * 1024 * 1024) : null,
    sortField: query.sortField,
    sortOrder: query.sortOrder,
  }
}

async function fetchPictures() {
  loading.value = true
  try {
    let response
    if (props.mode === 'mine') {
      response = await getMyPicturePage(buildParams())
    } else if (props.mode === 'space') {
      if (props.spaceId == null || props.spaceId <= 0) {
        throw new Error('无效的空间')
      }
      response = await getSpacePicturePage(props.spaceId, buildParams())
    } else {
      response = await getPublicPicturePage(buildParams())
    }
    const nextPage = response.data.data
    if (!nextPage) {
      throw new Error(response.data.message || '图片加载失败')
    }
    pageData.value = nextPage
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '图片加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

function canEditPicture(picture: PictureVO) {
  if (props.mode === 'space') {
    return canEditSpacePicture(props.myRole)
  }
  if (props.mode === 'mine') {
    return picture.spaceId == null
  }
  return false
}

function canDeletePicture(picture: PictureVO) {
  if (props.mode === 'space') {
    return canDeleteSpacePicture(props.myRole)
  }
  if (props.mode === 'mine') {
    return picture.spaceId == null
  }
  return false
}

function showPictureActions(picture: PictureVO) {
  return canEditPicture(picture) || canDeletePicture(picture)
}

function goToPictureSpace(picture: PictureVO) {
  if (picture.spaceId == null) return
  void router.push(`/spaces/${picture.spaceId}`)
}

function handleSearch() {
  query.current = 1
  void fetchPictures()
}

function resetFilters() {
  query.name = ''
  query.description = ''
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
  editingDescription.value = picture.description ?? ''
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
  editingDescription.value = ''
}

async function submitEdit(picture: PictureVO) {
  const nextName = editingName.value.trim()
  const nextDescription = editingDescription.value.trim()
  if (!nextName) {
    message.warning('请输入图片名称')
    return
  }

  savingId.value = picture.id
  try {
    const response = await updatePicture({
      id: picture.id,
      name: nextName,
      description: nextDescription,
    })
    const updated = response.data.data
    if (!updated) {
      throw new Error(response.data.message || '更新失败')
    }
    const index = pageData.value.records.findIndex((item) => item.id === picture.id)
    if (index >= 0) {
      pageData.value.records[index] = updated
    }
    message.success('图片信息已更新')
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

function showPictureDetail(picture: PictureVO) {
  detailPicture.value = picture
  void loadDetailFollowStatus()
}

function closePictureDetail() {
  detailPicture.value = null
  detailFollowStatusRequestId += 1
  detailCreatorFollowing.value = false
  detailFollowLoading.value = false
  detailFollowActionLoading.value = false
  detailFollowHovered.value = false
  detailLikeActionLoading.value = false
  likersModalVisible.value = false
}

function parsePictureIdQuery() {
  const raw = route.query.pictureId
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

async function openPictureFromQuery() {
  const pictureId = parsePictureIdQuery()
  if (pictureId == null) return

  try {
    const response = await getPictureById(pictureId)
    const picture = response.data.data
    if (!picture) {
      throw new Error(response.data.message || '图片不存在')
    }

    if (picture.spaceId != null) {
      const onThisSpace = props.mode === 'space' && props.spaceId === picture.spaceId
      if (!onThisSpace) {
        await router.replace({
          path: `/spaces/${picture.spaceId}`,
          query: { pictureId: String(picture.id) },
        })
        return
      }
    }

    showPictureDetail(picture)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '图片加载失败'
    message.error(errorMessage)
  } finally {
    if (parsePictureIdQuery() == null) return
    const nextQuery = { ...route.query }
    delete nextQuery.pictureId
    await router.replace({ path: route.path, query: nextQuery })
  }
}

function openImage(url?: string) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function getCreatorName(picture: PictureVO) {
  return picture.user?.userName || picture.user?.userAccount || '未知用户'
}

function getCreatorAvatarText(picture: PictureVO) {
  return getCreatorName(picture).slice(0, 1).toUpperCase()
}

function goToCreatorProfile(picture: PictureVO) {
  const creatorId = picture.userId || picture.user?.id
  if (!creatorId) {
    message.warning('无法查看该用户资料')
    return
  }
  void router.push(`/user/${creatorId}`)
}

async function loadDetailFollowStatus() {
  const creatorId = detailCreatorId.value
  const requestId = ++detailFollowStatusRequestId
  detailCreatorFollowing.value = false
  if (!creatorId || auth.user?.id === creatorId) return

  detailFollowLoading.value = true
  try {
    const response = await getUserFollowStatus(creatorId)
    if (requestId !== detailFollowStatusRequestId) return
    detailCreatorFollowing.value = response.data.data === true
  } catch {
    if (requestId !== detailFollowStatusRequestId) return
    detailCreatorFollowing.value = false
  } finally {
    if (requestId === detailFollowStatusRequestId) {
      detailFollowLoading.value = false
    }
  }
}

function updateCreatorFollowerCount(delta: number) {
  const creatorId = detailCreatorId.value
  if (!creatorId) return

  function patchPicture(picture: PictureVO) {
    if (!picture.user || picture.user.id !== creatorId) return picture
    return {
      ...picture,
      user: {
        ...picture.user,
        followerCount: Math.max(0, (picture.user.followerCount ?? 0) + delta),
      },
    }
  }

  if (detailPicture.value) {
    detailPicture.value = patchPicture(detailPicture.value)
  }

  pageData.value.records = pageData.value.records.map(patchPicture)
}

async function toggleDetailCreatorFollow() {
  const creatorId = detailCreatorId.value
  if (!creatorId) return

  if (!auth.isAuthenticated) {
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  detailFollowActionLoading.value = true
  try {
    if (detailCreatorFollowing.value) {
      await unfollowUser(creatorId)
      detailFollowStatusRequestId += 1
      detailCreatorFollowing.value = false
      updateCreatorFollowerCount(-1)
      message.success('已取消关注')
    } else {
      await followUser(creatorId)
      detailFollowStatusRequestId += 1
      detailCreatorFollowing.value = true
      updateCreatorFollowerCount(1)
      message.success('关注成功')
    }
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    if (errorMessage.includes('已关注该用户')) {
      detailFollowStatusRequestId += 1
      detailCreatorFollowing.value = true
      return
    }
    if (errorMessage.includes('未关注该用户')) {
      detailFollowStatusRequestId += 1
      detailCreatorFollowing.value = false
      return
    }
    message.error(errorMessage)
  } finally {
    detailFollowActionLoading.value = false
  }
}

function patchPictureLike(pictureId: number, liked: boolean, likeCount: number) {
  function patchPicture(picture: PictureVO) {
    if (picture.id !== pictureId) return picture
    return {
      ...picture,
      liked,
      likeCount,
    }
  }

  if (detailPicture.value?.id === pictureId) {
    detailPicture.value = patchPicture(detailPicture.value)
  }

  pageData.value.records = pageData.value.records.map(patchPicture)
}

async function toggleDetailLike() {
  const picture = detailPicture.value
  if (!picture || !canLikeDetailPicture.value) return

  if (!auth.isAuthenticated) {
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  const nextLiked = !Boolean(picture.liked)
  const nextCount = Math.max(0, (picture.likeCount ?? 0) + (nextLiked ? 1 : -1))

  detailLikeActionLoading.value = true
  try {
    if (nextLiked) {
      await likePicture(picture.id)
      patchPictureLike(picture.id, true, nextCount)
      message.success('点赞成功')
    } else {
      await unlikePicture(picture.id)
      patchPictureLike(picture.id, false, nextCount)
      message.success('已取消点赞')
    }
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '操作失败'
    if (errorMessage.includes('已点赞')) {
      patchPictureLike(picture.id, true, Math.max(picture.likeCount ?? 0, 1))
      return
    }
    if (errorMessage.includes('未点赞')) {
      patchPictureLike(picture.id, false, Math.max(0, (picture.likeCount ?? 1) - 1))
      return
    }
    message.error(errorMessage)
  } finally {
    detailLikeActionLoading.value = false
  }
}

function openLikersModal() {
  if (!detailPicture.value) return
  likersModalVisible.value = true
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

watch(
  () => [props.mode, props.spaceId] as const,
  () => {
    query.current = 1
    void fetchPictures()
  },
)

watch(
  () => route.query.pictureId,
  () => {
    void openPictureFromQuery()
  },
)

onMounted(() => {
  void fetchPictures()
  void openPictureFromQuery()
})
</script>

<template>
  <div class="library-page" :class="rootClass">
    <section :class="[sectionClass, 'library-hero']">
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

    <section :class="[sectionClass, 'filter-bar']">
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
      <n-input
        v-model:value="query.description"
        clearable
        placeholder="按图片简介搜索"
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

    <section :class="sectionClass">
      <n-spin :show="loading">
        <div v-if="records.length" class="picture-grid">
          <article v-for="picture in records" :key="picture.id" class="picture-card">
            <button class="image-button" type="button" @click="showPictureDetail(picture)">
              <img :src="picture.url" :alt="picture.name" loading="lazy" />
            </button>

            <div class="picture-body">
              <div v-if="editingId === picture.id" class="edit-form">
                <n-input
                  v-model:value="editingName"
                  size="small"
                  maxlength="120"
                  placeholder="图片名称"
                  @keyup.enter="submitEdit(picture)"
                />
                <n-input
                  v-model:value="editingDescription"
                  size="small"
                  type="textarea"
                  maxlength="512"
                  show-count
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="图片简介"
                />
                <div class="edit-actions">
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
              </div>
              <template v-else>
                <h2 :title="picture.name">{{ picture.name }}</h2>
                <p class="picture-description" :class="{ 'picture-description--empty': !picture.description }">
                  {{ picture.description || '暂无简介' }}
                </p>
              </template>

              <div class="meta-row">
                <span>{{ formatDate(picture.createTime) }}</span>
                <span class="like-count-meta">
                  <n-icon :component="HeartOutline" />
                  {{ picture.likeCount ?? 0 }}
                </span>
              </div>

              <div v-if="isMine && picture.spaceId != null" class="space-badge-row">
                <n-tag
                  size="small"
                  type="info"
                  :bordered="false"
                  style="cursor: pointer"
                  @click="goToPictureSpace(picture)"
                >
                  空间 #{{ picture.spaceId }}
                </n-tag>
              </div>

              <button class="creator-row" type="button" @click="goToCreatorProfile(picture)">
                <UserAvatar
                  :size="26"
                  :src="picture.user?.userAvatar || ''"
                  :text="getCreatorAvatarText(picture)"
                />
                <span :title="getCreatorName(picture)">{{ getCreatorName(picture) }}</span>
              </button>

              <div v-if="showPictureActions(picture)" class="card-actions">
                <n-tooltip v-if="canEditPicture(picture)" trigger="hover">
                  <template #trigger>
                    <n-button circle quaternary @click="startEdit(picture)">
                      <template #icon>
                        <n-icon :component="CreateOutline" />
                      </template>
                    </n-button>
                  </template>
                  编辑信息
                </n-tooltip>
                <n-popconfirm
                  v-if="canDeletePicture(picture)"
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
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <n-icon :component="ImageOutline" />
          <h2>暂无图片</h2>
          <p>{{ emptyHint }}</p>
          <n-button
            v-if="canUploadHere"
            type="primary"
            @click="router.push(uploadTargetPath)"
          >
            上传图片
          </n-button>
        </div>
      </n-spin>
    </section>

    <section v-if="pageData.pages > 1" :class="[sectionClass, 'pagination-row']">
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

    <n-modal v-model:show="detailVisible" :auto-focus="false">
      <div v-if="detailPicture" class="picture-detail-dialog">
        <div class="detail-preview">
          <img :src="detailPicture.url" :alt="detailPicture.name" />
        </div>

        <div class="detail-panel">
          <div class="detail-header">
            <div>
              <h2 :title="detailPicture.name">{{ detailPicture.name }}</h2>
              <p :class="{ 'picture-description--empty': !detailPicture.description }">
                {{ detailPicture.description || '暂无简介' }}
              </p>
            </div>
            <n-button quaternary @click="closePictureDetail">关闭</n-button>
          </div>

          <div class="detail-creator">
            <button class="creator-row detail-creator-main" type="button" @click="goToCreatorProfile(detailPicture)">
              <UserAvatar
                :size="34"
                :src="detailPicture.user?.userAvatar || ''"
                :text="getCreatorAvatarText(detailPicture)"
              />
              <span :title="getCreatorName(detailPicture)">{{ getCreatorName(detailPicture) }}</span>
            </button>
            <n-button
              v-if="canFollowDetailCreator"
              size="small"
              :type="detailCreatorFollowing ? 'default' : 'primary'"
              :loading="detailFollowLoading || detailFollowActionLoading"
              :title="detailCreatorFollowing ? '点击取消关注' : undefined"
              @mouseenter="detailFollowHovered = true"
              @mouseleave="detailFollowHovered = false"
              @click="toggleDetailCreatorFollow"
            >
              <template #icon>
                <n-icon :component="detailCreatorFollowing ? PeopleOutline : PersonAddOutline" />
              </template>
              {{ detailFollowLabel }}
            </n-button>
          </div>

          <div class="detail-like-row">
            <n-button
              v-if="canLikeDetailPicture"
              size="small"
              :type="detailLiked ? 'error' : 'default'"
              :ghost="detailLiked"
              :loading="detailLikeActionLoading"
              :title="detailLikeLabel"
              @click="toggleDetailLike"
            >
              <template #icon>
                <n-icon :component="detailLiked ? Heart : HeartOutline" />
              </template>
              {{ detailLikeLabel }}
            </n-button>
            <button class="like-count-button" type="button" title="查看点赞用户" @click="openLikersModal">
              <n-icon :component="HeartOutline" />
              <span>{{ detailLikeCount }} 人点赞</span>
            </button>
          </div>

          <n-descriptions :column="1" bordered label-placement="left" size="small">
            <n-descriptions-item label="上传时间">
              {{ formatDate(detailPicture.createTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="尺寸">
              {{ detailPicture.width }} x {{ detailPicture.height }}
            </n-descriptions-item>
            <n-descriptions-item label="文件大小">
              {{ formatFileSize(detailPicture.size) }}
            </n-descriptions-item>
            <n-descriptions-item label="格式">
              {{ detailPicture.format || detailPicture.contentType }}
            </n-descriptions-item>
            <n-descriptions-item label="类型">
              {{ detailPicture.contentType }}
            </n-descriptions-item>
          </n-descriptions>

          <n-button type="primary" block @click="openImage(detailPicture.url)">
            <template #icon>
              <n-icon :component="OpenOutline" />
            </template>
            打开原图
          </n-button>

          <PictureCommentSection
            :picture-id="detailPicture.id"
            :picture-owner-id="detailPicture.userId || detailPicture.user?.id || 0"
          />
        </div>
      </div>
    </n-modal>

    <PictureLikersModal
      v-model:show="likersModalVisible"
      :picture-id="detailPicture?.id ?? null"
    />
  </div>
</template>

<style scoped>
.library-page {
  flex: 1;
  padding: 32px 0 48px;
}

.library-page--embedded {
  padding: 0;
}

.library-section {
  width: 100%;
}

.library-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 0 20px;
}

.library-page--embedded .library-hero {
  align-items: center;
  padding: 0 0 18px;
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

.library-page--embedded h1 {
  font-size: 22px;
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
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) 110px 110px 140px 110px auto auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.library-page--embedded .filter-bar {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.library-page--embedded .filter-bar .n-button {
  width: 100%;
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

.picture-description {
  min-height: 38px;
  overflow: hidden;
  display: -webkit-box;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.picture-description--empty {
  color: #9ca3af;
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

.like-count-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: #6b7280;
  font-size: 12px;
}

.space-badge-row {
  display: flex;
}

.like-count-meta .n-icon {
  width: 14px;
  height: 14px;
  color: #ef4444;
}

.detail-like-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.like-count-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}

.like-count-button:hover {
  color: #ef4444;
}

.like-count-button .n-icon {
  width: 16px;
  height: 16px;
  color: #ef4444;
}

.creator-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.creator-row:hover span:last-child {
  color: #2563eb;
}

.creator-row span:last-child {
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

.edit-form {
  display: grid;
  gap: 8px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

.picture-detail-dialog {
  width: min(860px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
}

.detail-preview {
  min-height: 420px;
  display: grid;
  place-items: center;
  background: #0f172a;
}

.detail-preview img {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 48px);
  display: block;
  object-fit: contain;
}

.detail-panel {
  min-width: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 20px;
}

.detail-header {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.detail-header h2 {
  overflow: hidden;
  color: #111827;
  font-size: 20px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-header p {
  margin-top: 8px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.detail-creator {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.detail-creator:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.detail-creator-main {
  min-width: 0;
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

  .picture-detail-dialog {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .detail-preview {
    min-height: 320px;
  }

  .detail-preview img {
    max-height: 50vh;
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

  .picture-detail-dialog {
    width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
  }

  .detail-preview {
    min-height: 240px;
  }

  .detail-panel {
    padding: 16px;
  }

  .detail-header {
    grid-template-columns: 1fr;
  }
}
</style>
