<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ChatbubbleOutline, TrashOutline } from '@vicons/ionicons5'
import {
  addPictureComment,
  deletePictureComment,
  getPictureCommentReplies,
  getPictureRootComments,
} from '../api/picture'
import { useAuthStore } from '../stores/authStore'
import type { PictureCommentVO } from '../types/picture'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  pictureId: number
  pictureOwnerId: number
}>()

const message = useMessage()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const draft = ref('')
const replyDraft = ref('')
const replyTarget = ref<PictureCommentVO | null>(null)
const comments = ref<PictureCommentVO[]>([])
const total = ref(0)
const current = ref(1)
const pageSize = 10
const hasMore = computed(() => comments.value.length < total.value)

const repliesMap = ref<Record<number, PictureCommentVO[]>>({})
const repliesTotalMap = ref<Record<number, number>>({})
const repliesLoadingMap = ref<Record<number, boolean>>({})
const repliesExpanded = ref<Record<number, boolean>>({})
const deletingId = ref<number | null>(null)

const canInteract = computed(() => auth.isAuthenticated)

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

function getCommentUserName(comment: PictureCommentVO) {
  return comment.user?.userName || comment.user?.userAccount || '未知用户'
}

function getCommentAvatarText(comment: PictureCommentVO) {
  return getCommentUserName(comment).slice(0, 1).toUpperCase()
}

function canDeleteComment(comment: PictureCommentVO) {
  const userId = auth.user?.id
  if (!userId) return false
  return userId === comment.userId || userId === props.pictureOwnerId
}

async function goLogin() {
  await router.push({ path: '/login', query: { redirect: route.fullPath } })
}

async function fetchRootComments(reset = false) {
  if (!canInteract.value) {
    comments.value = []
    total.value = 0
    return
  }

  if (reset) {
    current.value = 1
    repliesMap.value = {}
    repliesTotalMap.value = {}
    repliesExpanded.value = {}
  }

  loading.value = true
  try {
    const response = await getPictureRootComments(props.pictureId, {
      current: current.value,
      pageSize,
    })
    const page = response.data.data
    if (!page) {
      throw new Error(response.data.message || '评论加载失败')
    }
    comments.value = reset ? page.records : [...comments.value, ...page.records]
    total.value = page.total
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '评论加载失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

async function loadMoreRoots() {
  if (!hasMore.value || loading.value) return
  current.value += 1
  await fetchRootComments(false)
}

async function loadReplies(root: PictureCommentVO, reset = false) {
  const rootId = root.id
  if (repliesLoadingMap.value[rootId]) return

  const existing = repliesMap.value[rootId] || []
  const knownTotal = repliesTotalMap.value[rootId] ?? root.replyCount ?? 0
  if (!reset && existing.length > 0 && existing.length >= knownTotal) {
    repliesExpanded.value = { ...repliesExpanded.value, [rootId]: true }
    return
  }

  const nextPage = reset ? 1 : Math.floor(existing.length / pageSize) + 1
  repliesLoadingMap.value = { ...repliesLoadingMap.value, [rootId]: true }
  try {
    const response = await getPictureCommentReplies(rootId, {
      current: nextPage,
      pageSize,
    })
    const page = response.data.data
    if (!page) {
      throw new Error(response.data.message || '回复加载失败')
    }
    repliesMap.value = {
      ...repliesMap.value,
      [rootId]: reset ? page.records : [...existing, ...page.records],
    }
    repliesTotalMap.value = { ...repliesTotalMap.value, [rootId]: page.total }
    repliesExpanded.value = { ...repliesExpanded.value, [rootId]: true }
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '回复加载失败'
    message.error(errorMessage)
  } finally {
    repliesLoadingMap.value = { ...repliesLoadingMap.value, [rootId]: false }
  }
}

function toggleReplies(root: PictureCommentVO) {
  const rootId = root.id
  if (repliesExpanded.value[rootId]) {
    repliesExpanded.value = { ...repliesExpanded.value, [rootId]: false }
    return
  }
  void loadReplies(root, !(repliesMap.value[rootId]?.length))
}

function startReply(comment: PictureCommentVO, rootId?: number | null) {
  if (!canInteract.value) {
    void goLogin()
    return
  }
  replyTarget.value = {
    ...comment,
    rootId: rootId ?? comment.rootId ?? (comment.parentId == null ? comment.id : comment.rootId),
  }
  replyDraft.value = ''
}

function cancelReply() {
  replyTarget.value = null
  replyDraft.value = ''
}

async function submitRootComment() {
  if (!canInteract.value) {
    await goLogin()
    return
  }
  const content = draft.value.trim()
  if (!content) {
    message.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    const response = await addPictureComment(props.pictureId, { content })
    const created = response.data.data
    if (!created) {
      throw new Error(response.data.message || '发表评论失败')
    }
    created.replyCount = created.replyCount ?? 0
    comments.value = [created, ...comments.value]
    total.value += 1
    draft.value = ''
    message.success('评论已发布')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '发表评论失败'
    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

async function submitReply() {
  if (!canInteract.value) {
    await goLogin()
    return
  }
  const target = replyTarget.value
  if (!target) return

  const content = replyDraft.value.trim()
  if (!content) {
    message.warning('请输入回复内容')
    return
  }

  submitting.value = true
  try {
    const response = await addPictureComment(props.pictureId, {
      content,
      parentId: target.id,
    })
    const created = response.data.data
    if (!created) {
      throw new Error(response.data.message || '回复失败')
    }

    const rootId = created.rootId ?? (target.rootId ?? target.id)
    const existing = repliesMap.value[rootId] || []
    repliesMap.value = {
      ...repliesMap.value,
      [rootId]: [...existing, created],
    }
    repliesTotalMap.value = {
      ...repliesTotalMap.value,
      [rootId]: (repliesTotalMap.value[rootId] ?? existing.length) + 1,
    }
    repliesExpanded.value = { ...repliesExpanded.value, [rootId]: true }

    const rootIndex = comments.value.findIndex((item) => item.id === rootId)
    if (rootIndex >= 0) {
      const root = comments.value[rootIndex]
      comments.value[rootIndex] = {
        ...root,
        replyCount: (root.replyCount ?? 0) + 1,
      }
    }

    cancelReply()
    message.success('回复已发布')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '回复失败'
    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(comment: PictureCommentVO, rootId?: number | null) {
  deletingId.value = comment.id
  try {
    await deletePictureComment(comment.id)
    const isRoot = comment.rootId == null && comment.parentId == null

    if (isRoot) {
      comments.value = comments.value.filter((item) => item.id !== comment.id)
      total.value = Math.max(0, total.value - 1)
      const nextReplies = { ...repliesMap.value }
      delete nextReplies[comment.id]
      repliesMap.value = nextReplies
      const nextTotals = { ...repliesTotalMap.value }
      delete nextTotals[comment.id]
      repliesTotalMap.value = nextTotals
    } else {
      const resolvedRootId = rootId ?? comment.rootId
      if (resolvedRootId != null) {
        const list = (repliesMap.value[resolvedRootId] || []).filter((item) => item.id !== comment.id)
        repliesMap.value = { ...repliesMap.value, [resolvedRootId]: list }
        repliesTotalMap.value = {
          ...repliesTotalMap.value,
          [resolvedRootId]: Math.max(0, (repliesTotalMap.value[resolvedRootId] ?? list.length + 1) - 1),
        }
        const rootIndex = comments.value.findIndex((item) => item.id === resolvedRootId)
        if (rootIndex >= 0) {
          const root = comments.value[rootIndex]
          comments.value[rootIndex] = {
            ...root,
            replyCount: Math.max(0, (root.replyCount ?? 1) - 1),
          }
        }
      }
    }
    message.success('评论已删除')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '删除失败'
    message.error(errorMessage)
  } finally {
    deletingId.value = null
  }
}

function repliesHasMore(root: PictureCommentVO) {
  const loaded = repliesMap.value[root.id]?.length ?? 0
  const knownTotal = repliesTotalMap.value[root.id] ?? root.replyCount ?? 0
  return loaded < knownTotal
}

watch(
  () => [props.pictureId, auth.isAuthenticated] as const,
  () => {
    cancelReply()
    draft.value = ''
    void fetchRootComments(true)
  },
  { immediate: true },
)
</script>

<template>
  <section class="comment-section">
    <div class="comment-header">
      <h3>
        <n-icon :component="ChatbubbleOutline" />
        评论
        <span v-if="canInteract" class="comment-count">{{ total }}</span>
      </h3>
    </div>

    <div v-if="!canInteract" class="comment-login-gate">
      <p>登录后可查看和发表评论</p>
      <n-button type="primary" size="small" @click="goLogin">去登录</n-button>
    </div>

    <template v-else>
      <div class="comment-composer">
        <n-input
          v-model:value="draft"
          type="textarea"
          maxlength="500"
          show-count
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="说点什么…"
        />
        <div class="composer-actions">
          <n-button type="primary" size="small" :loading="submitting" @click="submitRootComment">
            发表评论
          </n-button>
        </div>
      </div>

      <n-spin :show="loading && comments.length === 0">
        <div v-if="comments.length" class="comment-list">
          <article v-for="comment in comments" :key="comment.id" class="comment-item">
            <UserAvatar
              :size="28"
              :src="comment.user?.userAvatar || ''"
              :text="getCommentAvatarText(comment)"
            />
            <div class="comment-main">
              <div class="comment-meta">
                <span class="comment-author">{{ getCommentUserName(comment) }}</span>
                <span class="comment-time">{{ formatDate(comment.createTime) }}</span>
              </div>
              <p class="comment-content">{{ comment.content }}</p>
              <div class="comment-actions">
                <n-button text size="tiny" @click="startReply(comment, comment.id)">回复</n-button>
                <n-button
                  v-if="(comment.replyCount ?? 0) > 0 || (repliesMap[comment.id]?.length ?? 0) > 0"
                  text
                  size="tiny"
                  @click="toggleReplies(comment)"
                >
                  {{
                    repliesExpanded[comment.id]
                      ? '收起回复'
                      : `查看回复 (${repliesTotalMap[comment.id] ?? comment.replyCount ?? 0})`
                  }}
                </n-button>
                <n-popconfirm
                  v-if="canDeleteComment(comment)"
                  positive-text="删除"
                  negative-text="取消"
                  @positive-click="handleDelete(comment)"
                >
                  <template #trigger>
                    <n-button text size="tiny" type="error" :loading="deletingId === comment.id">
                      <template #icon>
                        <n-icon :component="TrashOutline" :size="12" />
                      </template>
                      删除
                    </n-button>
                  </template>
                  确定删除这条评论吗？其下回复也会一并删除。
                </n-popconfirm>
              </div>

              <div
                v-if="replyTarget && (replyTarget.id === comment.id || replyTarget.rootId === comment.id)"
                class="reply-composer"
              >
                <n-input
                  v-model:value="replyDraft"
                  type="textarea"
                  maxlength="500"
                  show-count
                  :autosize="{ minRows: 2, maxRows: 3 }"
                  :placeholder="`回复 @${getCommentUserName(replyTarget)}`"
                />
                <div class="composer-actions">
                  <n-button size="tiny" quaternary @click="cancelReply">取消</n-button>
                  <n-button type="primary" size="tiny" :loading="submitting" @click="submitReply">
                    回复
                  </n-button>
                </div>
              </div>

              <div v-if="repliesExpanded[comment.id]" class="reply-list">
                <article
                  v-for="reply in repliesMap[comment.id] || []"
                  :key="reply.id"
                  class="comment-item reply-item"
                >
                  <UserAvatar
                    :size="24"
                    :src="reply.user?.userAvatar || ''"
                    :text="getCommentAvatarText(reply)"
                  />
                  <div class="comment-main">
                    <div class="comment-meta">
                      <span class="comment-author">{{ getCommentUserName(reply) }}</span>
                      <span class="comment-time">{{ formatDate(reply.createTime) }}</span>
                    </div>
                    <p class="comment-content">
                      <template v-if="reply.parentId && reply.parentId !== comment.id">
                        回复
                        <span class="reply-to">
                          @{{
                            getCommentUserName(
                              (repliesMap[comment.id] || []).find((item) => item.id === reply.parentId) ||
                                comment,
                            )
                          }}
                        </span>
                      </template>
                      {{ reply.content }}
                    </p>
                    <div class="comment-actions">
                      <n-button text size="tiny" @click="startReply(reply, comment.id)">回复</n-button>
                      <n-popconfirm
                        v-if="canDeleteComment(reply)"
                        positive-text="删除"
                        negative-text="取消"
                        @positive-click="handleDelete(reply, comment.id)"
                      >
                        <template #trigger>
                          <n-button text size="tiny" type="error" :loading="deletingId === reply.id">
                            删除
                          </n-button>
                        </template>
                        确定删除这条回复吗？
                      </n-popconfirm>
                    </div>
                  </div>
                </article>

                <div v-if="repliesHasMore(comment)" class="load-more-row">
                  <n-button
                    text
                    size="tiny"
                    :loading="repliesLoadingMap[comment.id]"
                    @click="loadReplies(comment, false)"
                  >
                    加载更多回复
                  </n-button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="!loading" class="comment-empty">暂无评论，来抢沙发吧</div>
      </n-spin>

      <div v-if="hasMore" class="load-more-row">
        <n-button quaternary size="small" :loading="loading" @click="loadMoreRoots">加载更多评论</n-button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.comment-section {
  display: grid;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid #e5e7eb;
}

.comment-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  font-size: 15px;
  font-weight: 600;
}

.comment-count {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

.comment-login-gate {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.comment-login-gate p {
  margin: 0;
}

.comment-composer,
.reply-composer {
  display: grid;
  gap: 8px;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.comment-list,
.reply-list {
  display: grid;
  gap: 14px;
}

.reply-list {
  margin-top: 10px;
  padding: 10px 0 0 8px;
  border-left: 2px solid #e5e7eb;
}

.comment-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.reply-item {
  gap: 8px;
}

.comment-main {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.comment-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.comment-author {
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}

.comment-time {
  color: #9ca3af;
  font-size: 12px;
}

.comment-content {
  margin: 0;
  color: #374151;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.reply-to {
  margin-right: 4px;
  color: #2563eb;
}

.comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.comment-empty,
.load-more-row {
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}

.load-more-row {
  padding-top: 4px;
}
</style>
