<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5'
import {
  addSensitiveWord,
  deleteSensitiveWord,
  getModerationLogs,
  getSensitiveWords,
  updateSensitiveWord,
} from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import type { ChatModerationLogVO, SensitiveWordVO } from '../../types/admin'
import type { PageResponse } from '../../types/user'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const activeTab = ref<'words' | 'logs'>('words')
const wordsLoading = ref(false)
const logsLoading = ref(false)
const adding = ref(false)
const actingWordId = ref<number | null>(null)
const newWord = ref('')

const wordQuery = reactive({ current: 1, pageSize: 10 })
const logQuery = reactive({
  current: 1,
  pageSize: 10,
  conversationId: '',
  senderId: '',
})

const wordPage = ref<PageResponse<SensitiveWordVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const logPage = ref<PageResponse<ChatModerationLogVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const isAdmin = computed(() => auth.user?.userRole === 'admin')

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

function senderName(item: ChatModerationLogVO) {
  return item.sender?.userName || item.sender?.userAccount || `用户#${item.senderId}`
}

async function ensureAdmin() {
  if (!auth.isAuthenticated) {
    await router.replace({ path: '/login', query: { redirect: '/admin' } })
    return false
  }
  if (!isAdmin.value) {
    message.error('需要管理员权限')
    await router.replace('/')
    return false
  }
  return true
}

async function fetchWords() {
  wordsLoading.value = true
  try {
    const response = await getSensitiveWords({
      current: wordQuery.current,
      pageSize: wordQuery.pageSize,
    })
    const page = response.data.data
    if (!page) throw new Error(response.data.message || '加载失败')
    wordPage.value = page
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载敏感词失败')
  } finally {
    wordsLoading.value = false
  }
}

async function fetchLogs() {
  logsLoading.value = true
  try {
    const response = await getModerationLogs({
      current: logQuery.current,
      pageSize: logQuery.pageSize,
      conversationId: logQuery.conversationId ? Number(logQuery.conversationId) : undefined,
      senderId: logQuery.senderId ? Number(logQuery.senderId) : undefined,
    })
    const page = response.data.data
    if (!page) throw new Error(response.data.message || '加载失败')
    logPage.value = page
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载审计日志失败')
  } finally {
    logsLoading.value = false
  }
}

async function handleAddWord() {
  const word = newWord.value.trim()
  if (!word) {
    message.warning('请输入敏感词')
    return
  }
  adding.value = true
  try {
    await addSensitiveWord({ word })
    newWord.value = ''
    message.success('已添加')
    wordQuery.current = 1
    await fetchWords()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '添加失败')
  } finally {
    adding.value = false
  }
}

async function toggleEnabled(item: SensitiveWordVO) {
  actingWordId.value = item.id
  try {
    await updateSensitiveWord(item.id, { enabled: item.enabled === 1 ? 0 : 1 })
    message.success(item.enabled === 1 ? '已停用' : '已启用')
    await fetchWords()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    actingWordId.value = null
  }
}

async function handleDeleteWord(item: SensitiveWordVO) {
  actingWordId.value = item.id
  try {
    await deleteSensitiveWord(item.id)
    message.success('已删除')
    await fetchWords()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    actingWordId.value = null
  }
}

onMounted(async () => {
  if (!(await ensureAdmin())) return
  await fetchWords()
})
</script>

<template>
  <div class="admin-page">
    <section class="page-width hero">
      <n-button quaternary @click="router.back()">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        返回
      </n-button>
      <h1>
        <n-icon :component="ShieldCheckmarkOutline" />
        聊天治理
      </h1>
      <p class="subtitle">
        敏感词拦截与审计日志（仅管理员） ·
        <n-button text type="primary" @click="router.push('/admin/coupons')">优惠券活动</n-button>
      </p>
    </section>

    <section class="page-width body">
      <n-tabs v-model:value="activeTab" type="line" animated @update:value="(name: string) => {
        if (name === 'logs' && logPage.records.length === 0) void fetchLogs()
      }">
        <n-tab-pane name="words" tab="敏感词">
          <div class="toolbar">
            <n-input
              v-model:value="newWord"
              maxlength="64"
              placeholder="输入敏感词"
              style="max-width: 280px"
              @keydown.enter.prevent="handleAddWord"
            />
            <n-button type="primary" :loading="adding" @click="handleAddWord">添加</n-button>
          </div>

          <n-spin :show="wordsLoading">
            <div v-if="wordPage.records.length === 0" class="empty">暂无敏感词</div>
            <ul v-else class="list">
              <li v-for="item in wordPage.records" :key="item.id" class="card">
                <div>
                  <strong>{{ item.word }}</strong>
                  <p class="muted">
                    {{ item.enabled === 1 ? '启用中' : '已停用' }} · {{ formatTime(item.createTime) }}
                  </p>
                </div>
                <div class="actions">
                  <n-button
                    size="small"
                    secondary
                    :loading="actingWordId === item.id"
                    @click="toggleEnabled(item)"
                  >
                    {{ item.enabled === 1 ? '停用' : '启用' }}
                  </n-button>
                  <n-popconfirm positive-text="删除" negative-text="取消" @positive-click="handleDeleteWord(item)">
                    <template #trigger>
                      <n-button size="small" type="error" secondary :loading="actingWordId === item.id">
                        删除
                      </n-button>
                    </template>
                    确定删除该敏感词？
                  </n-popconfirm>
                </div>
              </li>
            </ul>

            <div v-if="wordPage.total > wordQuery.pageSize" class="pager">
              <n-pagination
                :page="wordQuery.current"
                :page-size="wordQuery.pageSize"
                :item-count="wordPage.total"
                @update:page="(page: number) => { wordQuery.current = page; void fetchWords() }"
              />
            </div>
          </n-spin>
        </n-tab-pane>

        <n-tab-pane name="logs" tab="拦截日志">
          <div class="toolbar">
            <n-input
              v-model:value="logQuery.conversationId"
              placeholder="会话 ID"
              style="max-width: 140px"
              clearable
            />
            <n-input
              v-model:value="logQuery.senderId"
              placeholder="发送者 ID"
              style="max-width: 140px"
              clearable
            />
            <n-button
              @click="() => { logQuery.current = 1; void fetchLogs() }"
            >
              查询
            </n-button>
          </div>

          <n-spin :show="logsLoading">
            <div v-if="logPage.records.length === 0" class="empty">暂无拦截记录</div>
            <ul v-else class="list">
              <li v-for="item in logPage.records" :key="item.id" class="card log-card">
                <div class="log-main">
                  <strong>{{ senderName(item) }}</strong>
                  <span class="tag">{{ item.messageType }} · {{ item.action }}</span>
                  <p class="muted">
                    会话 #{{ item.conversationId }} · {{ formatTime(item.createTime) }}
                  </p>
                  <p class="content">{{ item.originalContent || '（空）' }}</p>
                  <p class="hits">命中：{{ item.hitWords }}</p>
                </div>
              </li>
            </ul>

            <div v-if="logPage.total > logQuery.pageSize" class="pager">
              <n-pagination
                :page="logQuery.current"
                :page-size="logQuery.pageSize"
                :item-count="logPage.total"
                @update:page="(page: number) => { logQuery.current = page; void fetchLogs() }"
              />
            </div>
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  padding-bottom: 40px;
}

.page-width {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}

.hero h1 {
  margin: 12px 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.log-card {
  align-items: flex-start;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.muted {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.content {
  margin: 8px 0 0;
  color: #0f172a;
  font-size: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.hits {
  margin: 6px 0 0;
  color: #b45309;
  font-size: 13px;
}

.tag {
  margin-left: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 400;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: #94a3b8;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
