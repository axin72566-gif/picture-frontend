<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog, useMessage } from 'naive-ui'
import {
  ArrowBackOutline,
  PeopleOutline,
  CreateOutline,
  TrashOutline,
  ExitOutline,
  PersonAddOutline,
  CloudUploadOutline,
} from '@vicons/ionicons5'
import {
  cancelSpaceInvite,
  dissolveSpace,
  getSpace,
  getSpaceMembers,
  getSpacePendingInvites,
  inviteToSpace,
  leaveSpace,
  removeSpaceMember,
  updateSpace,
  updateSpaceMemberRole,
} from '../../api/space'
import PictureLibrary from '../../components/PictureLibrary.vue'
import UserAvatar from '../../components/UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import type { PageResponse } from '../../types/user'
import type { SpaceInviteVO, SpaceMemberVO, SpaceVO } from '../../types/space'
import { canUploadToSpace, getSpaceRoleLabel } from '../../utils/space'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const auth = useAuthStore()

const loading = ref(false)
const membersLoading = ref(false)
const invitesLoading = ref(false)
const saving = ref(false)
const inviting = ref(false)
const actingMemberId = ref<number | null>(null)
const actingInviteId = ref<number | null>(null)
const showEditModal = ref(false)
const showInviteModal = ref(false)
const activeTab = ref<'pictures' | 'members' | 'invites'>('pictures')

const space = ref<SpaceVO | null>(null)
const loadError = ref('')

const memberQuery = reactive({ current: 1, pageSize: 10 })
const inviteQuery = reactive({ current: 1, pageSize: 10 })

const memberPage = ref<PageResponse<SpaceMemberVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const invitePage = ref<PageResponse<SpaceInviteVO>>({
  records: [],
  total: 0,
  size: 10,
  current: 1,
  pages: 0,
})

const editForm = reactive({
  name: '',
  description: '',
})

const inviteForm = reactive({
  mode: 'account' as 'account' | 'id',
  userAccount: '',
  userId: '',
  role: 'VIEWER' as 'EDITOR' | 'VIEWER',
})

const spaceId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})

const isCreator = computed(() => space.value?.myRole === 'CREATOR')
const canUpload = computed(() => canUploadToSpace(space.value?.myRole))

function goUploadToSpace() {
  if (spaceId.value == null) return
  void router.push({ path: '/upload', query: { spaceId: String(spaceId.value) } })
}

const roleOptions = [
  { label: '编辑者', value: 'EDITOR' },
  { label: '浏览者', value: 'VIEWER' },
]

function getDisplayName(member: SpaceMemberVO) {
  return member.user?.userName || member.user?.userAccount || '用户'
}

function getAvatarText(member: SpaceMemberVO) {
  return getDisplayName(member).slice(0, 1).toUpperCase()
}

function getInviteeName(item: SpaceInviteVO) {
  return item.invitee?.userName || item.invitee?.userAccount || '用户'
}

async function fetchSpace() {
  if (spaceId.value === null) {
    space.value = null
    loadError.value = '无效的空间链接'
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    const response = await getSpace(spaceId.value)
    const next = response.data.data
    if (!next) {
      throw new Error(response.data.message || '空间加载失败')
    }
    space.value = next
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '空间加载失败'
    loadError.value = errorMessage
    space.value = null
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

async function fetchMembers() {
  if (spaceId.value === null) return
  membersLoading.value = true
  try {
    const response = await getSpaceMembers(spaceId.value, memberQuery)
    const next = response.data.data
    if (!next) {
      throw new Error(response.data.message || '成员加载失败')
    }
    memberPage.value = next
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '成员加载失败'
    message.error(errorMessage)
  } finally {
    membersLoading.value = false
  }
}

async function fetchInvites() {
  if (spaceId.value === null || !isCreator.value) return
  invitesLoading.value = true
  try {
    const response = await getSpacePendingInvites(spaceId.value, inviteQuery)
    const next = response.data.data
    if (!next) {
      throw new Error(response.data.message || '邀请加载失败')
    }
    invitePage.value = next
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '邀请加载失败'
    message.error(errorMessage)
  } finally {
    invitesLoading.value = false
  }
}

function openEditModal() {
  if (!space.value) return
  editForm.name = space.value.name
  editForm.description = space.value.description || ''
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (spaceId.value === null) return
  const name = editForm.name.trim()
  if (!name) {
    message.warning('空间名称不能为空')
    return
  }
  saving.value = true
  try {
    const response = await updateSpace(spaceId.value, {
      name,
      description: editForm.description.trim(),
    })
    const next = response.data.data
    if (!next) {
      throw new Error(response.data.message || '更新失败')
    }
    space.value = next
    showEditModal.value = false
    message.success('已更新')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '更新失败'
    message.error(errorMessage)
  } finally {
    saving.value = false
  }
}

function openInviteModal() {
  inviteForm.mode = 'account'
  inviteForm.userAccount = ''
  inviteForm.userId = ''
  inviteForm.role = 'VIEWER'
  showInviteModal.value = true
}

async function handleInvite() {
  if (spaceId.value === null) return
  const payload =
    inviteForm.mode === 'id'
      ? {
          userId: Number(inviteForm.userId),
          role: inviteForm.role,
        }
      : {
          userAccount: inviteForm.userAccount.trim(),
          role: inviteForm.role,
        }

  if (inviteForm.mode === 'id' && (!Number.isFinite(payload.userId) || (payload.userId as number) <= 0)) {
    message.warning('请输入有效的用户 ID')
    return
  }
  if (inviteForm.mode === 'account' && !inviteForm.userAccount.trim()) {
    message.warning('请输入用户账号')
    return
  }

  inviting.value = true
  try {
    await inviteToSpace(spaceId.value, payload)
    message.success('邀请已发送')
    showInviteModal.value = false
    activeTab.value = 'invites'
    inviteQuery.current = 1
    await fetchInvites()
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '邀请失败'
    message.error(errorMessage)
  } finally {
    inviting.value = false
  }
}

async function handleRoleChange(member: SpaceMemberVO, role: string) {
  if (spaceId.value === null || !member.user || role === member.role) return
  if (role !== 'EDITOR' && role !== 'VIEWER') return
  actingMemberId.value = member.user.id
  try {
    await updateSpaceMemberRole(spaceId.value, member.user.id, { role })
    member.role = role
    message.success('角色已更新')
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '修改失败'
    message.error(errorMessage)
  } finally {
    actingMemberId.value = null
  }
}

function handleRemoveMember(member: SpaceMemberVO) {
  if (spaceId.value === null || !member.user) return
  const userId = member.user.id
  dialog.warning({
    title: '移除成员',
    content: `确定将 ${getDisplayName(member)} 移出空间？`,
    positiveText: '移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      actingMemberId.value = userId
      try {
        await removeSpaceMember(spaceId.value!, userId)
        message.success('已移除')
        await fetchMembers()
      } catch (error) {
        const errorMessage = error instanceof Error && error.message ? error.message : '移除失败'
        message.error(errorMessage)
      } finally {
        actingMemberId.value = null
      }
    },
  })
}

function handleLeave() {
  if (spaceId.value === null) return
  dialog.warning({
    title: '退出空间',
    content: '确定退出该空间？',
    positiveText: '退出',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await leaveSpace(spaceId.value!)
        message.success('已退出空间')
        await router.push('/spaces')
      } catch (error) {
        const errorMessage = error instanceof Error && error.message ? error.message : '退出失败'
        message.error(errorMessage)
      }
    },
  })
}

function handleDissolve() {
  if (spaceId.value === null) return
  dialog.error({
    title: '解散空间',
    content: '解散后成员关系将被清除，确定继续？',
    positiveText: '解散',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await dissolveSpace(spaceId.value!)
        message.success('空间已解散')
        await router.push('/spaces')
      } catch (error) {
        const errorMessage = error instanceof Error && error.message ? error.message : '解散失败'
        message.error(errorMessage)
      }
    },
  })
}

async function handleCancelInvite(item: SpaceInviteVO) {
  if (actingInviteId.value !== null) return
  actingInviteId.value = item.id
  try {
    await cancelSpaceInvite(item.id)
    message.success('已取消邀请')
    invitePage.value.records = invitePage.value.records.filter((row) => row.id !== item.id)
    invitePage.value.total = Math.max(0, invitePage.value.total - 1)
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : '取消失败'
    message.error(errorMessage)
  } finally {
    actingInviteId.value = null
  }
}

function goToUser(userId?: number | null) {
  if (!userId) return
  if (auth.user?.id === userId) {
    void router.push('/profile')
    return
  }
  void router.push(`/user/${userId}`)
}

watch(
  spaceId,
  async () => {
    activeTab.value = 'pictures'
    memberQuery.current = 1
    inviteQuery.current = 1
    await fetchSpace()
    if (space.value) {
      await fetchMembers()
      if (isCreator.value) {
        await fetchInvites()
      }
    }
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  if (tab === 'invites' && isCreator.value) {
    void fetchInvites()
  }
})
</script>

<template>
  <div class="detail-page">
    <section class="page-width detail-panel">
      <div class="panel-toolbar">
        <n-button quaternary @click="router.push('/spaces')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回空间列表
        </n-button>
      </div>

      <n-spin :show="loading">
        <div v-if="loadError || !space" class="empty-state">
          <n-icon :component="PeopleOutline" />
          <h2>{{ loadError || '空间不存在' }}</h2>
        </div>

        <template v-else>
          <div class="detail-heading">
            <div class="detail-heading__main">
              <h1>{{ space.name }}</h1>
              <p v-if="space.description">{{ space.description }}</p>
              <p v-else class="muted">暂无简介</p>
              <n-tag size="small" type="info" :bordered="false">
                我的角色：{{ getSpaceRoleLabel(space.myRole) }}
              </n-tag>
            </div>
            <div class="detail-heading__actions">
              <n-button v-if="canUpload" type="primary" @click="goUploadToSpace">
                <template #icon>
                  <n-icon :component="CloudUploadOutline" />
                </template>
                上传到空间
              </n-button>
              <template v-if="isCreator">
                <n-button @click="openInviteModal">
                  <template #icon>
                    <n-icon :component="PersonAddOutline" />
                  </template>
                  邀请
                </n-button>
                <n-button @click="openEditModal">
                  <template #icon>
                    <n-icon :component="CreateOutline" />
                  </template>
                  编辑
                </n-button>
                <n-button type="error" secondary @click="handleDissolve">
                  <template #icon>
                    <n-icon :component="TrashOutline" />
                  </template>
                  解散
                </n-button>
              </template>
              <n-button v-else type="warning" secondary @click="handleLeave">
                <template #icon>
                  <n-icon :component="ExitOutline" />
                </template>
                退出空间
              </n-button>
            </div>
          </div>

          <n-tabs v-model:value="activeTab" type="segment" animated>
            <n-tab-pane name="pictures" tab="图片">
              <PictureLibrary
                mode="space"
                embedded
                :space-id="space.id"
                :my-role="space.myRole"
                title="空间图片"
                subtitle="成员可见；编辑者可上传与修改信息，创建者可删除"
              />
            </n-tab-pane>

            <n-tab-pane name="members" tab="成员">
              <n-spin :show="membersLoading">
                <div v-if="memberPage.records.length === 0" class="tab-empty">暂无成员</div>
                <ul v-else class="member-list">
                  <li v-for="item in memberPage.records" :key="item.id" class="member-card">
                    <button class="member-main" type="button" @click="goToUser(item.user?.id)">
                      <UserAvatar
                        :size="42"
                        :src="item.user?.userAvatar || ''"
                        :text="getAvatarText(item)"
                      />
                      <span>
                        <strong>{{ getDisplayName(item) }}</strong>
                        <small v-if="item.user">@{{ item.user.userAccount }}</small>
                      </span>
                    </button>
                    <div class="member-actions">
                      <template v-if="isCreator && item.role !== 'CREATOR'">
                        <n-select
                          :value="item.role"
                          :options="roleOptions"
                          size="small"
                          style="width: 110px"
                          :loading="actingMemberId === item.user?.id"
                          @update:value="(value: string) => handleRoleChange(item, value)"
                        />
                        <n-button
                          size="small"
                          type="error"
                          secondary
                          :loading="actingMemberId === item.user?.id"
                          @click="handleRemoveMember(item)"
                        >
                          移除
                        </n-button>
                      </template>
                      <n-tag v-else size="small" :bordered="false">
                        {{ getSpaceRoleLabel(item.role) }}
                      </n-tag>
                    </div>
                  </li>
                </ul>

                <div v-if="memberPage.total > memberQuery.pageSize" class="pagination-row">
                  <n-pagination
                    :page="memberQuery.current"
                    :page-size="memberQuery.pageSize"
                    :item-count="memberPage.total"
                    @update:page="
                      (page: number) => {
                        memberQuery.current = page
                        fetchMembers()
                      }
                    "
                  />
                </div>
              </n-spin>
            </n-tab-pane>

            <n-tab-pane v-if="isCreator" name="invites" tab="待处理邀请">
              <n-spin :show="invitesLoading">
                <div v-if="invitePage.records.length === 0" class="tab-empty">暂无待处理邀请</div>
                <ul v-else class="invite-list">
                  <li v-for="item in invitePage.records" :key="item.id" class="invite-card">
                    <div>
                      <strong>{{ getInviteeName(item) }}</strong>
                      <p class="muted">
                        @{{ item.invitee?.userAccount || '-' }} ·
                        {{ getSpaceRoleLabel(item.role) }}
                      </p>
                    </div>
                    <n-button
                      size="small"
                      :loading="actingInviteId === item.id"
                      :disabled="actingInviteId !== null && actingInviteId !== item.id"
                      @click="handleCancelInvite(item)"
                    >
                      取消
                    </n-button>
                  </li>
                </ul>

                <div v-if="invitePage.total > inviteQuery.pageSize" class="pagination-row">
                  <n-pagination
                    :page="inviteQuery.current"
                    :page-size="inviteQuery.pageSize"
                    :item-count="invitePage.total"
                    @update:page="
                      (page: number) => {
                        inviteQuery.current = page
                        fetchInvites()
                      }
                    "
                  />
                </div>
              </n-spin>
            </n-tab-pane>
          </n-tabs>
        </template>
      </n-spin>
    </section>

    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑空间"
      style="width: min(480px, calc(100vw - 32px))"
      :mask-closable="!saving"
    >
      <n-form label-placement="top">
        <n-form-item label="空间名称" required>
          <n-input v-model:value="editForm.name" maxlength="64" show-count />
        </n-form-item>
        <n-form-item label="简介">
          <n-input
            v-model:value="editForm.description"
            type="textarea"
            maxlength="512"
            show-count
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button :disabled="saving" @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSaveEdit">保存</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showInviteModal"
      preset="card"
      title="邀请成员"
      style="width: min(480px, calc(100vw - 32px))"
      :mask-closable="!inviting"
    >
      <n-form label-placement="top">
        <n-form-item label="邀请方式">
          <n-radio-group v-model:value="inviteForm.mode">
            <n-radio-button value="account">用户账号</n-radio-button>
            <n-radio-button value="id">用户 ID</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="inviteForm.mode === 'account'" label="用户账号" required>
          <n-input v-model:value="inviteForm.userAccount" placeholder="对方的 userAccount" />
        </n-form-item>
        <n-form-item v-else label="用户 ID" required>
          <n-input v-model:value="inviteForm.userId" placeholder="数字 ID" />
        </n-form-item>
        <n-form-item label="角色" required>
          <n-select v-model:value="inviteForm.role" :options="roleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button :disabled="inviting" @click="showInviteModal = false">取消</n-button>
          <n-button type="primary" :loading="inviting" @click="handleInvite">发送邀请</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 24px 0 48px;
}

.page-width {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
}

.detail-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  overflow: visible;
}

.panel-toolbar {
  margin-bottom: 16px;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.detail-heading__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-heading__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 26px;
  line-height: 1.25;
}

.muted {
  color: #9ca3af;
  font-size: 14px;
}

.empty-state,
.tab-empty {
  padding: 40px 16px;
  text-align: center;
  color: #9ca3af;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.member-list,
.invite-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-card,
.invite-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.member-main {
  border: 0;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.member-main span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-main strong {
  color: #111827;
  font-size: 14px;
}

.member-main small,
.invite-card p {
  color: #6b7280;
  font-size: 12px;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .detail-heading {
    flex-direction: column;
  }

  .member-card {
    flex-direction: column;
    align-items: stretch;
  }

  .member-actions {
    justify-content: flex-end;
  }
}
</style>
