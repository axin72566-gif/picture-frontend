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
