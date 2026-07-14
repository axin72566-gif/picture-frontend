<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import SpaceChatSection from '../../components/SpaceChatSection.vue'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const chatStore = useChatStore()
const auth = useAuthStore()

const conversationId = computed(() => Number(route.params.id))
const ready = ref(false)

const conversation = computed(() =>
  chatStore.conversations.find((item) => item.id === conversationId.value) || null,
)

const title = computed(() => {
  const item = conversation.value
  if (!item) return `会话 #${conversationId.value}`
  if (item.title) return item.title
  if (item.type === 'DM') {
    return item.peer?.userName || item.peer?.userAccount || '私聊'
  }
  return item.spaceName || `会话 #${conversationId.value}`
})

const isDm = computed(() => conversation.value?.type === 'DM')

watch(
  conversationId,
  async (id) => {
    ready.value = false
    if (!id || Number.isNaN(id)) {
      message.error('会话无效')
      await router.replace('/messages')
      return
    }
    try {
      if (!conversation.value) {
        await chatStore.fetchConversations()
      }
      ready.value = true
    } catch (error) {
      const errorMessage = error instanceof Error && error.message ? error.message : '加载失败'
      message.error(errorMessage)
      await router.replace('/messages')
    }
  },
  { immediate: true },
)

function goSpace() {
  const spaceId = conversation.value?.spaceId
  if (spaceId) {
    void router.push(`/spaces/${spaceId}`)
  }
}

function goPeerProfile() {
  const peerId = conversation.value?.peer?.id
  if (peerId) {
    void router.push(`/user/${peerId}`)
  }
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <n-button quaternary @click="router.push('/messages')">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        消息列表
      </n-button>
      <h1>{{ title }}</h1>
      <n-button v-if="conversation?.spaceId && !isDm" quaternary size="small" @click="goSpace">
        进入空间
      </n-button>
      <n-button v-else-if="isDm && conversation?.peer?.id" quaternary size="small" @click="goPeerProfile">
        查看资料
      </n-button>
    </header>

    <SpaceChatSection
      v-if="ready && auth.isAuthenticated"
      :conversation-id="conversationId"
      my-role=""
    />
  </section>
</template>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  flex: 1;
  font-size: 18px;
}
</style>
