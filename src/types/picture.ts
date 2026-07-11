import type { UserVO } from './user'

export interface PictureVO {
  id: number
  url: string
  name: string
  description: string | null
  size: number
  width: number
  height: number
  contentType: string
  format: string
  userId: number
  user: UserVO | null
  createTime: string
}

export type PictureUploadResult = PictureVO

export type PictureSortField = 'name' | 'size' | 'createTime'
export type SortOrder = 'asc' | 'desc'

export interface PicturePageRequest {
  current?: number
  pageSize?: number
  name?: string
  description?: string
  minSize?: number | null
  maxSize?: number | null
  sortField?: PictureSortField
  sortOrder?: SortOrder
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface PictureUpdateRequest {
  id: number
  name?: string
  description?: string
}
