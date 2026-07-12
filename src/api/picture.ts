import type { AxiosProgressEvent } from 'axios'
import request from './request'
import type { BaseResponse } from '../types/user'
import type {
  PageResult,
  PictureCommentAddRequest,
  PictureCommentPageRequest,
  PictureCommentVO,
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

export function getPictureById(id: number) {
  return request.get<BaseResponse<PictureVO>>(`/api/picture/${id}`)
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

export function addPictureComment(pictureId: number, data: PictureCommentAddRequest) {
  return request.post<BaseResponse<PictureCommentVO>>(`/api/picture/${pictureId}/comment`, data)
}

export function getPictureRootComments(pictureId: number, params: PictureCommentPageRequest = {}) {
  return request.get<BaseResponse<PageResult<PictureCommentVO>>>(`/api/picture/${pictureId}/comments`, {
    params,
  })
}

export function getPictureCommentReplies(rootId: number, params: PictureCommentPageRequest = {}) {
  return request.get<BaseResponse<PageResult<PictureCommentVO>>>(`/api/picture/comment/${rootId}/replies`, {
    params,
  })
}

export function deletePictureComment(commentId: number) {
  return request.delete<BaseResponse<null>>(`/api/picture/comment/${commentId}`)
}
