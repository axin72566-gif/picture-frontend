export class ApiError extends Error {
  code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function getApiErrorCode(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.code
  }
  return null
}

export function getApiErrorMessage(error: unknown, fallback = '请求失败，请稍后重试') {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
