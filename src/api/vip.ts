import request from './request'
import type { BaseResponse, PageResponse } from '../types/user'
import type { VipOrderCreateRequest, VipOrderVO, VipPlanVO, VipStatusVO } from '../types/vip'

export function listVipPlans() {
  return request.get<BaseResponse<VipPlanVO[]>>('/api/vip/plans')
}

export function getVipStatus() {
  return request.get<BaseResponse<VipStatusVO>>('/api/vip/status')
}

export function createVipOrder(data: VipOrderCreateRequest) {
  return request.post<BaseResponse<VipOrderVO>>('/api/vip/orders', data)
}

export function mockPayVipOrder(orderNo: string) {
  return request.post<BaseResponse<VipOrderVO>>(`/api/vip/orders/${encodeURIComponent(orderNo)}/mock-pay`)
}

export function cancelVipOrder(orderNo: string) {
  return request.post<BaseResponse<VipOrderVO>>(`/api/vip/orders/${encodeURIComponent(orderNo)}/cancel`)
}

export function pageVipOrders(params: { current?: number; pageSize?: number } = {}) {
  return request.get<BaseResponse<PageResponse<VipOrderVO>>>('/api/vip/orders', {
    params: {
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 10,
    },
  })
}
