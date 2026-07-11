export interface BaseResponse<T> {
  code: number
  data: T | null
  message: string
}

export interface UserRegisterRequest {
  userAccount: string
  userPassword: string
  checkPassword: string
}

export interface UserLoginRequest {
  userAccount: string
  userPassword: string
}

export interface UserUpdateRequest {
  userName?: string | null
  userProfile?: string | null
}

export interface UserVO {
  id: number
  userAccount: string
  userName: string | null
  userAvatar: string | null
  userProfile: string | null
  userRole: string
  createTime: string
  updateTime: string
}

export interface LoginResult {
  token: string
  user: UserVO
}
