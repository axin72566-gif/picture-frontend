import type { AxiosProgressEvent } from 'axios'
import request from './request'
import type { BaseResponse } from '../types/user'
import type {
  PageResult,
  PicturePageRequest,
  PictureUpdateRequest,
  PictureUploadResult,
  PictureVO,
} from '../types/picture'

function cleanParams(params: PicturePageRequest) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function uploadPicture(file: File, onUploadProgress?: (event: AxiosProgressEvent) => void) {
  const formData = new FormData()
  formData.append('file', file)

  return request.post<BaseResponse<PictureUploadResult>>('/api/picture/upload', formData, {
    onUploadProgress,
  })
}

export function getPublicPicturePage(params: PicturePageRequest) {
  return request.get<BaseResponse<PageResult<PictureVO>>>('/api/picture/page', {
    params: cleanParams(params),
  })
}

export function getMyPicturePage(params: PicturePageRequest) {
  return request.get<BaseResponse<PageResult<PictureVO>>>('/api/picture/my/page', {
    params: cleanParams(params),
  })
}

export function updatePicture(data: PictureUpdateRequest) {
  return request.put<BaseResponse<PictureVO>>('/api/picture/update', data)
}

export function deletePicture(id: number) {
  return request.delete<BaseResponse<null>>(`/api/picture/delete/${id}`)
}
