import request from './request'
import type {
  BaseResponse,
  LoginResult,
  UserLoginRequest,
  UserRegisterRequest,
  UserVO,
} from '../types/user'

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
