import type { SpaceRole } from '../types/space'

const ROLE_LABELS: Record<SpaceRole, string> = {
  CREATOR: '创建者',
  EDITOR: '编辑者',
  VIEWER: '浏览者',
}

export function getSpaceRoleLabel(role?: SpaceRole | string | null) {
  if (!role) return '-'
  return ROLE_LABELS[role as SpaceRole] || role
}

export function canUploadToSpace(role: SpaceRole | string | null | undefined) {
  return role === 'CREATOR' || role === 'EDITOR'
}

export function canEditSpacePicture(role: SpaceRole | string | null | undefined) {
  return role === 'CREATOR' || role === 'EDITOR'
}

export function canDeleteSpacePicture(role: SpaceRole | string | null | undefined) {
  return role === 'CREATOR'
}

export function canDeleteSpaceMessage(
  role: SpaceRole | string | null | undefined,
  senderId: number | null | undefined,
  currentUserId: number | null | undefined,
) {
  if (!currentUserId) return false
  if (senderId != null && currentUserId === senderId) return true
  return role === 'CREATOR'
}
