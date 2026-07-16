import request from './request'
import type {
  CouponActivityCreateRequest,
  CouponActivityUpdateRequest,
  CouponActivityVO,
  UserCouponVO,
} from '../types/coupon'
import type { BaseResponse, PageResponse } from '../types/user'

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function listCouponActivities() {
  return request.get<BaseResponse<CouponActivityVO[]>>('/api/coupon/activities')
}

export function getCouponActivity(id: number) {
  return request.get<BaseResponse<CouponActivityVO>>(`/api/coupon/activities/${id}`)
}

export function claimCouponActivity(id: number) {
  return request.post<BaseResponse<UserCouponVO>>(`/api/coupon/activities/${id}/claim`)
}

export function pageMyCoupons(params: { current?: number; pageSize?: number; status?: string } = {}) {
  return request.get<BaseResponse<PageResponse<UserCouponVO>>>('/api/coupon/mine', {
    params: cleanParams({
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 10,
      status: params.status,
    }),
  })
}

export function pageAdminCouponActivities(params: { current?: number; pageSize?: number } = {}) {
  return request.get<BaseResponse<PageResponse<CouponActivityVO>>>('/api/admin/coupon/activities', {
    params: cleanParams({
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 10,
    }),
  })
}

export function createCouponActivity(data: CouponActivityCreateRequest) {
  return request.post<BaseResponse<CouponActivityVO>>('/api/admin/coupon/activities', data)
}

export function updateCouponActivity(id: number, data: CouponActivityUpdateRequest) {
  return request.put<BaseResponse<CouponActivityVO>>(`/api/admin/coupon/activities/${id}`, data)
}
