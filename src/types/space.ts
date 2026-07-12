import type { UserVO } from './user'

export type SpaceRole = 'CREATOR' | 'EDITOR' | 'VIEWER'

export type SpaceInviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export interface SpaceVO {
  id: number
  name: string
  description: string | null
  ownerId: number
  myRole: SpaceRole | null
  createTime: string
  updateTime: string
}

export interface SpaceMemberVO {
  id: number
  spaceId: number
  role: SpaceRole
  createTime: string
  user: UserVO | null
}

export interface SpaceInviteVO {
  id: number
  spaceId: number
  spaceName: string | null
  role: SpaceRole
  status: SpaceInviteStatus
  createTime: string
  inviter: UserVO | null
  invitee: UserVO | null
}

export interface SpaceCreateRequest {
  name: string
  description?: string | null
}

export interface SpaceUpdateRequest {
  name?: string | null
  description?: string | null
}

export interface SpaceInviteRequest {
  userId?: number | null
  userAccount?: string | null
  role: 'EDITOR' | 'VIEWER'
}

export interface SpaceMemberRoleUpdateRequest {
  role: 'EDITOR' | 'VIEWER'
}

export interface SpacePageRequest {
  current?: number
  pageSize?: number
}
