import request from './request'
import type { PageResult, PicturePageRequest, PictureVO } from '../types/picture'
import type { BaseResponse, PageResponse } from '../types/user'
import type {
  SpaceCreateRequest,
  SpaceInviteRequest,
  SpaceInviteVO,
  SpaceMemberRoleUpdateRequest,
  SpaceMemberVO,
  SpacePageRequest,
  SpaceUpdateRequest,
  SpaceVO,
} from '../types/space'
import type { SpaceMessageAddRequest, SpaceMessageVO } from '../types/spaceMessage'

function cleanParams(params: SpacePageRequest | PicturePageRequest) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function createSpace(data: SpaceCreateRequest) {
  return request.post<BaseResponse<SpaceVO>>('/api/space', data)
}

export function getMySpaces(params: SpacePageRequest = {}) {
  return request.get<BaseResponse<PageResponse<SpaceVO>>>('/api/space/my', {
    params: cleanParams(params),
  })
}

export function getSpace(id: number) {
  return request.get<BaseResponse<SpaceVO>>(`/api/space/${id}`)
}

export function updateSpace(id: number, data: SpaceUpdateRequest) {
  return request.put<BaseResponse<SpaceVO>>(`/api/space/${id}`, data)
}

export function dissolveSpace(id: number) {
  return request.delete<BaseResponse<null>>(`/api/space/${id}`)
}

export function getSpaceMembers(id: number, params: SpacePageRequest = {}) {
  return request.get<BaseResponse<PageResponse<SpaceMemberVO>>>(`/api/space/${id}/members`, {
    params: cleanParams(params),
  })
}

export function getSpacePicturePage(spaceId: number, params: PicturePageRequest = {}) {
  return request.get<BaseResponse<PageResult<PictureVO>>>(`/api/space/${spaceId}/pictures`, {
    params: cleanParams(params),
  })
}

export function updateSpaceMemberRole(spaceId: number, userId: number, data: SpaceMemberRoleUpdateRequest) {
  return request.put<BaseResponse<null>>(`/api/space/${spaceId}/members/${userId}/role`, data)
}

export function removeSpaceMember(spaceId: number, userId: number) {
  return request.delete<BaseResponse<null>>(`/api/space/${spaceId}/members/${userId}`)
}

export function leaveSpace(spaceId: number) {
  return request.delete<BaseResponse<null>>(`/api/space/${spaceId}/members/me`)
}

export function inviteToSpace(spaceId: number, data: SpaceInviteRequest) {
  return request.post<BaseResponse<SpaceInviteVO>>(`/api/space/${spaceId}/invites`, data)
}

export function getSpacePendingInvites(spaceId: number, params: SpacePageRequest = {}) {
  return request.get<BaseResponse<PageResponse<SpaceInviteVO>>>(`/api/space/${spaceId}/invites`, {
    params: cleanParams(params),
  })
}

export function getMyPendingInvites(params: SpacePageRequest = {}) {
  return request.get<BaseResponse<PageResponse<SpaceInviteVO>>>('/api/space/invites/pending', {
    params: cleanParams(params),
  })
}

export function acceptSpaceInvite(inviteId: number) {
  return request.post<BaseResponse<null>>(`/api/space/invites/${inviteId}/accept`)
}

export function rejectSpaceInvite(inviteId: number) {
  return request.post<BaseResponse<null>>(`/api/space/invites/${inviteId}/reject`)
}

export function cancelSpaceInvite(inviteId: number) {
  return request.delete<BaseResponse<null>>(`/api/space/invites/${inviteId}`)
}

export function getSpaceMessages(spaceId: number, params: SpacePageRequest = {}) {
  return request.get<BaseResponse<PageResponse<SpaceMessageVO>>>(`/api/space/${spaceId}/messages`, {
    params: cleanParams(params),
  })
}

export function sendSpaceMessage(spaceId: number, data: SpaceMessageAddRequest) {
  return request.post<BaseResponse<SpaceMessageVO>>(`/api/space/${spaceId}/messages`, data)
}

export function deleteSpaceMessage(spaceId: number, messageId: number) {
  return request.delete<BaseResponse<null>>(`/api/space/${spaceId}/messages/${messageId}`)
}
