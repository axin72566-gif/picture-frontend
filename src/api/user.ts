import type { AxiosProgressEvent } from 'axios'
import request from './request'
import type {
  BaseResponse,
  LoginResult,
  PageResponse,
  UserLoginRequest,
  UserRegisterRequest,
  UserUpdateRequest,
  UserVO,
} from '../types/user'

export interface UserFollowPageRequest {
  current?: number
  pageSize?: number
}

function cleanParams(params: UserFollowPageRequest) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function userRegister(data: UserRegisterRequest) {
  return request.post<BaseResponse<number>>('/api/user/register', data)
}

export function userLogin(data: UserLoginRequest) {
  return request.post<BaseResponse<LoginResult>>('/api/user/login', data)
}

export function userLogout() {
  return request.post<BaseResponse<boolean>>('/api/user/logout')
}

export function getCurrentUser() {
  return request.get<BaseResponse<UserVO>>('/api/user/current')
}

export function getUserById(id: number) {
  return request.get<BaseResponse<UserVO>>(`/api/user/${id}`)
}

export function updateCurrentUser(data: UserUpdateRequest) {
  return request.put<BaseResponse<UserVO>>('/api/user/update', data)
}

export function uploadUserAvatar(file: File, onUploadProgress?: (event: AxiosProgressEvent) => void) {
  const formData = new FormData()
  formData.append('file', file)

  return request.post<BaseResponse<string>>('/api/user/avatar/upload', formData, {
    onUploadProgress,
  })
}

export function followUser(followedId: number) {
  return request.post<BaseResponse<null>>(`/api/user/follow/${followedId}`)
}

export function unfollowUser(followedId: number) {
  return request.delete<BaseResponse<null>>(`/api/user/follow/${followedId}`)
}

export function getUserFollowers(id: number, params: UserFollowPageRequest) {
  return request.get<BaseResponse<PageResponse<UserVO>>>(`/api/user/${id}/followers`, {
    params: cleanParams(params),
  })
}

export function getUserFollowing(id: number, params: UserFollowPageRequest) {
  return request.get<BaseResponse<PageResponse<UserVO>>>(`/api/user/${id}/following`, {
    params: cleanParams(params),
  })
}

export function getUserFollowStatus(id: number) {
  return request.get<BaseResponse<boolean>>(`/api/user/${id}/follow/status`)
}
