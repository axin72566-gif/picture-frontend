export const UserCouponStatus = {
  UNUSED: 'UNUSED',
  LOCKED: 'LOCKED',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
} as const

export type UserCouponStatusValue = (typeof UserCouponStatus)[keyof typeof UserCouponStatus]

export interface CouponActivityVO {
  id: number
  name: string
  discountCents: number
  totalStock: number
  remainStock: number
  startTime: string
  endTime: string
  couponValidDays: number
  status: number
  ongoing: boolean
  claimed: boolean
}

export interface UserCouponVO {
  id: number
  activityId: number
  activityName: string | null
  discountCents: number
  status: UserCouponStatusValue | string
  expireTime: string
  lockOrderNo: string | null
  createTime: string
}

export interface CouponActivityCreateRequest {
  name: string
  discountCents: number
  totalStock: number
  startTime: string
  endTime: string
  couponValidDays: number
  online?: boolean
}

export interface CouponActivityUpdateRequest {
  name?: string
  discountCents?: number
  totalStock?: number
  startTime?: string
  endTime?: string
  couponValidDays?: number
  status?: number
}

/** 业务错误码：与后端 ErrorCode 对齐 */
export const CouponErrorCode = {
  ACTIVITY_NOT_FOUND: 42101,
  ACTIVITY_NOT_STARTED: 42102,
  ACTIVITY_ENDED: 42103,
  SOLD_OUT: 42104,
  ALREADY_CLAIMED: 42105,
  NOT_FOUND: 42106,
  STATUS_ERROR: 42107,
  EXPIRED: 42108,
} as const
