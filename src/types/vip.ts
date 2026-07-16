export const VipOrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const

export type VipOrderStatusValue = (typeof VipOrderStatus)[keyof typeof VipOrderStatus]

export interface VipPlanVO {
  id: number
  code: string
  name: string
  durationDays: number
  priceCents: number
}

export interface VipOrderVO {
  id: number
  orderNo: string
  planId: number
  planCode: string | null
  planName: string | null
  durationDays: number
  originalAmountCents?: number | null
  discountCents?: number | null
  couponId?: number | null
  amountCents: number
  status: VipOrderStatusValue | string
  expireTime: string
  paidTime: string | null
  createTime: string
}

export interface VipStatusVO {
  vipActive: boolean
  vipExpireTime: string | null
  maxOwnedSpaces: number
  ownedSpaceCount: number
  maxMembersPerSpace: number
}

export interface VipOrderCreateRequest {
  planId: number
  couponId?: number
}

/** 业务错误码：与后端 ErrorCode 对齐 */
export const VipErrorCode = {
  PLAN_NOT_FOUND: 42001,
  ORDER_NOT_FOUND: 42002,
  ORDER_STATUS_ERROR: 42003,
  ORDER_EXPIRED: 42004,
  PENDING_ORDER_EXISTS: 42005,
  SPACE_QUOTA_EXCEEDED: 42006,
  MEMBER_QUOTA_EXCEEDED: 42007,
} as const
