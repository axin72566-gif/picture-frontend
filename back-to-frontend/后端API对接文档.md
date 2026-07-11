# PictureHub 后端 API 文档

> 供前端开发人员对接使用。涵盖所有已实现接口。
> 基础地址：`http://localhost:8080`，全局前缀 `/api`

---

## 目录

- [1. 通用规范](#1-通用规范)
- [2. 鉴权机制](#2-鉴权机制)
- [3. 数据模型](#3-数据模型)
- [4. 用户模块](#4-用户模块)
- [5. 图片模块](#5-图片模块)
- [6. TypeScript 类型定义](#6-typescript-类型定义)
- [7. 前端对接最佳实践](#7-前端对接最佳实践)
- [附录 A：错误码速查](#附录-a错误码速查)

---

## 1. 通用规范

### 1.1 请求格式

| Content-Type | 适用场景 |
|---|---|
| `application/json` | 绝大多数接口（POST/PUT 请求体） |
| `multipart/form-data` | 上传文件类接口（上传图片、头像） |
| 无 Body | GET/DELETE 请求 |

### 1.2 响应格式

所有接口统一返回 `BaseResponse<T>` JSON：

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `number` | 业务状态码，`0` 成功，非 `0` 异常 |
| `data` | `T \| null` | 业务数据，失败时为 `null` |
| `message` | `string` | 提示信息 |

### 1.3 分页响应格式

分页接口的 `data` 结构如下：

```json
{
  "code": 0,
  "data": {
    "records": [ ... ],
    "total": 100,
    "size": 10,
    "current": 1,
    "pages": 10
  },
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `records` | `array` | 当前页数据列表 |
| `total` | `number` | 总记录数 |
| `size` | `number` | 每页大小 |
| `current` | `number` | 当前页码 |
| `pages` | `number` | 总页数 |

### 1.4 错误码

| code | 含义 | 前端处理 |
|------|------|----------|
| `0` | 成功 | 正常处理 |
| `40000` | 请求参数错误 | 展示 `message` 给用户 |
| `40100` | 未登录 | **清除 token，跳转登录页** |
| `40101` | 无权限 | 提示无权限 |
| `42900` | 请求过于频繁 | 提示稍后重试 |
| `50000` | 服务器内部错误 | 提示服务器异常 |
| `41001` | 账号已存在 | 提示用户更换账号 |
| `41002` | 用户不存在 | 按场景处理 |
| `41003` | 密码错误 | 提示密码错误 |
| `41004` | 账号已被禁用 | 提示联系管理员 |

---

## 2. 鉴权机制

### 2.1 认证方式：JWT Bearer Token

登录成功后返回 `token`（JWT，HS256 签名）。前端需保存并在后续请求中携带：

```
Authorization: Bearer <token>
```

### 2.2 Token 有效期

- 默认 **24 小时**（服务端配置 `jwt.expire`）
- 过期后请求返回 `40100`
- 退出登录后 token 加入 Redis 黑名单，立即失效（无需等待过期）

### 2.3 需要鉴权的接口

所有 `/api/**` 接口**默认需要 token**，以下公共接口除外：

| 接口 | 说明 |
|------|------|
| `POST /api/user/register` | 注册 |
| `POST /api/user/login` | 登录 |
| `GET /api/user/{id}` | 获取用户公开资料 |
| `GET /api/picture/page` | 公共图库分页 |

### 2.4 CORS 配置

全开模式，前端无需额外处理：

```
allowedOriginPatterns: *
allowedMethods: GET, POST, PUT, DELETE, OPTIONS
allowCredentials: true
```

---

## 3. 数据模型

### 3.1 UserVO（用户公开信息）

```json
{
  "id": 1,
  "userAccount": "alice01",
  "userName": "爱丽丝",
  "userAvatar": "https://...",
  "userProfile": "热爱摄影的工程师",
  "userRole": "user",
  "createTime": "2026-07-10T12:00:00",
  "updateTime": "2026-07-11T10:30:00"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 用户 ID |
| `userAccount` | `string` | 登录账号 |
| `userName` | `string \| null` | 昵称 |
| `userAvatar` | `string \| null` | 头像 URL |
| `userProfile` | `string \| null` | 个人简介 |
| `userRole` | `string` | `"user"` 普通用户 / `"admin"` 管理员 |
| `createTime` | `string` | ISO 格式注册时间 |
| `updateTime` | `string` | ISO 格式更新时间 |

> **注意**：密码字段 `userPassword` **不会出现在任何响应中**。

### 3.2 LoginUserVO（登录返回）

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "...UserVO 字段..." }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | `string` | JWT 令牌 |
| `user` | `UserVO` | 当前登录用户信息 |

### 3.3 PictureVO（图片信息）

```json
{
  "id": 1,
  "url": "https://picture-xxx.cos.ap-nanjing.myqcloud.com/2026/07/10/abc.jpg",
  "name": "my_photo.jpg",
  "size": 204800,
  "width": 1920,
  "height": 1080,
  "contentType": "image/jpeg",
  "format": "jpg",
  "userId": 1,
  "user": { "...UserVO 字段..." },
  "createTime": "2026-07-10T10:00:00"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 图片记录 ID |
| `url` | `string` | CDN 地址，可直接用于 `<img src>` |
| `name` | `string` | 原始文件名 |
| `size` | `number` | 文件大小（字节） |
| `width` | `number` | 图片宽度（像素） |
| `height` | `number` | 图片高度（像素） |
| `contentType` | `string` | MIME 类型，如 `image/jpeg` |
| `format` | `string` | 格式后缀，如 `jpg` |
| `userId` | `number` | 上传者用户 ID（点击可跳转个人资料） |
| `user` | `UserVO \| null` | 上传者信息（**分页接口已预加载**） |
| `createTime` | `string` | 上传时间（ISO） |

---

## 4. 用户模块

### 4.1 用户注册

```
POST /api/user/register
Content-Type: application/json
```

无需登录。

#### 请求体

```json
{
  "userAccount": "alice01",
  "userPassword": "password123",
  "checkPassword": "password123"
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `userAccount` | `string` | 是 | 4-16 位，仅允许字母、数字、下划线 `^[a-zA-Z0-9_]+$` |
| `userPassword` | `string` | 是 | 8-32 位 |
| `checkPassword` | `string` | 是 | 必须与 `userPassword` 一致 |

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": 1,
  "message": "ok"
}
```

`data` 为新增用户的 `id`（`number`）。

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "账号长度应为 4-16 位" }
{ "code": 40000, "data": null, "message": "两次输入的密码不一致" }
{ "code": 41001, "data": null, "message": "账号已存在" }
```

#### 后端行为

1. 校验参数 → 不通过返回 `40000`
2. 查重 → 已存在返回 `41001`
3. BCrypt 加密密码（成本因子 12）
4. 昵称默认为 `"user_" + 8 位随机数字`
5. 角色默认为 `"user"`
6. 写入数据库，返回自增 ID

---

### 4.2 用户登录

```
POST /api/user/login
Content-Type: application/json
```

无需登录。

#### 请求体

```json
{
  "userAccount": "alice01",
  "userPassword": "password123"
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `userAccount` | `string` | 是 | |
| `userPassword` | `string` | 是 | ≥8 位 |

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwidXNlcklkIjoxLCJyb2xlIjoidXNlciIsImlhdCI6MTc1MjEwMDAwMCwiZXhwIjoxNzUyMTg2NDAwfQ.xxxxxxxxx",
    "user": {
      "id": 1,
      "userAccount": "alice01",
      "userName": "user_12345678",
      "userAvatar": null,
      "userProfile": null,
      "userRole": "user",
      "createTime": "2026-07-10T12:00:00",
      "updateTime": "2026-07-10T12:00:00"
    }
  },
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.token` | `string` | JWT，前端需保存 |
| `data.user` | `UserVO` | 当前登录用户信息 |

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "参数为空" }
{ "code": 41002, "data": null, "message": "用户不存在" }
{ "code": 41003, "data": null, "message": "密码错误" }
{ "code": 41004, "data": null, "message": "账号已被禁用" }
```

#### 后端行为

1. 按 `userAccount` 查询（仅未删除记录）
2. 不存在 → `41002`，密码不匹配 → `41003`
3. 生成 JWT（payload：`userId`、`role`）
4. 写入 Redis：`user:login:{userId} = token`（24h 过期）
5. 返回 `{ token, userVO }`

---

### 4.3 退出登录

```
POST /api/user/logout
Authorization: Bearer <token>
```

#### 请求体

无（无需 body）。

#### 成功响应

```json
{
  "code": 0,
  "data": true,
  "message": "ok"
}
```

`data` 固定为 `true`。

#### 异常响应

```json
{ "code": 40100, "data": null, "message": "缺少有效 token" }
```

#### 后端行为

1. 删除 Redis：`user:login:{userId}`
2. 将 token 加入 Redis 黑名单：`jwt:blacklist:{token}`，TTL = JWT 剩余有效期
3. 未登录状态调用也返回 `true`（幂等）

---

### 4.4 获取当前用户信息

```
GET /api/user/current
Authorization: Bearer <token>
```

#### 请求体

无。

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "userAccount": "alice01",
    "userName": "user_12345678",
    "userAvatar": null,
    "userProfile": null,
    "userRole": "user",
    "createTime": "2026-07-10T12:00:00",
    "updateTime": "2026-07-10T12:00:00"
  },
  "message": "ok"
}
```

`data` 为 `UserVO`。

#### 异常响应

```json
{ "code": 40100, "data": null, "message": "缺少有效 token" }
{ "code": 41002, "data": null, "message": "用户不存在" }
```

#### 使用场景

页面刷新时恢复登录态：从 `localStorage` 取出 token，调此接口验证有效性并获取最新用户信息。

---

### 4.5 获取用户公开资料（创建者资料页）

```
GET /api/user/{id}
```

**无需登录**（公共接口，查看任意用户资料页）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 用户 ID（即 `PictureVO.userId`） |

#### 请求示例

```
GET /api/user/1
```

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "userAccount": "alice01",
    "userName": "爱丽丝",
    "userAvatar": "https://...",
    "userProfile": "热爱摄影的工程师",
    "userRole": "user",
    "createTime": "2026-07-10T12:00:00",
    "updateTime": "2026-07-11T10:30:00"
  },
  "message": "ok"
}
```

`data` 为 `UserVO`。

#### 异常响应

```json
{ "code": 41002, "data": null, "message": "用户不存在" }
```

#### 使用场景

图片详情页 / 图片列表中，点击创建者头像或昵称 → 获取完整资料 → 跳转个人资料页。

> **提示**：`PictureVO.user` 已在分页接口中预加载了 `UserVO`，基本展示无需额外请求。此接口用于资料页获取完整、最新的信息。

---

### 4.6 修改个人资料

```
PUT /api/user/update
Authorization: Bearer <token>
Content-Type: application/json
```

#### 请求体

```json
{
  "userName": "爱丽丝",
  "userProfile": "热爱摄影的工程师"
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `userName` | `string \| null` | 否 | 1-32 字符，传 `null` 表示不修改 |
| `userProfile` | `string \| null` | 否 | ≤255 字符，传 `null` 表示不修改 |

> **注意**：两个字段至少提供一个，否则返回 `40000`。

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "userAccount": "alice01",
    "userName": "爱丽丝",
    "userAvatar": null,
    "userProfile": "热爱摄影的工程师",
    "userRole": "user",
    "createTime": "2026-07-10T12:00:00",
    "updateTime": "2026-07-11T10:30:00"
  },
  "message": "ok"
}
```

`data` 为更新后的 `UserVO`。

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "请至少提供一个需要修改的字段" }
{ "code": 40000, "data": null, "message": "用户昵称长度不能超过 32 个字符" }
{ "code": 40000, "data": null, "message": "个人简介长度不能超过 255 个字符" }
```

---

### 4.7 上传头像

```
POST /api/user/avatar/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | 图片文件，支持 jpg / png / gif / webp，最大 10MB |

#### 成功响应

```json
{
  "code": 0,
  "data": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/avatar/2026/07/11/abc123.jpg",
  "message": "ok"
}
```

`data` 为上传后的头像 URL（字符串），可直接用于 `<img src>`。

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "文件类型不支持，仅支持 jpg/png/gif/webp" }
{ "code": 40000, "data": null, "message": "文件大小不能超过 10MB" }
{ "code": 50000, "data": null, "message": "头像上传失败，请稍后重试" }
```

#### 后端行为

1. 校验文件类型和大小
2. 上传至腾讯云 COS，路径：`avatar/{YYYY}/{MM}/{DD}/{uuid}.{ext}`
3. 更新数据库用户头像字段
4. 删除旧头像 COS 文件（如果存在）

> **注意**：上传后响应返回的 URL 已更新到数据库，**无需额外调用更新接口**。前端将 URL 保存后可直接用于 `<img>` 标签展示。

---

## 5. 图片模块

### 5.1 上传图片

```
POST /api/picture/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | jpg / png / gif / webp，最大 10MB |

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "url": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/2026/07/10/a1b2c3d4e5f6.jpg",
    "name": "my_photo.jpg",
    "size": 204800,
    "width": 1920,
    "height": 1080,
    "contentType": "image/jpeg",
    "format": "jpg",
    "userId": 1,
    "user": {
      "id": 1,
      "userName": "user_12345678",
      "userAvatar": null,
      ...
    },
    "createTime": "2026-07-10T10:00:00"
  },
  "message": "ok"
}
```

`data` 为 `PictureVO`（**包含上传者 `user` 信息**）。

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "文件类型不支持，仅支持 jpg/png/gif/webp" }
{ "code": 40000, "data": null, "message": "文件内容不是有效的图片" }
{ "code": 50000, "data": null, "message": "图片上传失败，请稍后重试" }
```

#### 后端行为

1. 校验文件类型和大小
2. 通过 `ImageIO` 读取图片，获取宽高
3. 上传至 COS，路径：`{YYYY}/{MM}/{DD}/{uuid}.{ext}`
4. 写入数据库
5. 返回 `PictureVO`（包含 `user`）

---

### 5.2 公共图库分页

```
GET /api/picture/page
```

**无需登录**，公开浏览所有用户图片。

#### 查询参数（Query String）

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `current` | `number` | 否 | `1` | 页码 |
| `pageSize` | `number` | 否 | `10` | 每页条数 |
| `name` | `string` | 否 | - | 图片名模糊搜索 |
| `minSize` | `number` | 否 | - | 最小文件大小（字节） |
| `maxSize` | `number` | 否 | - | 最大文件大小（字节） |
| `sortField` | `string` | 否 | `createTime` | 排序字段：`name` / `size` / `createTime` |
| `sortOrder` | `string` | 否 | `desc` | 排序方向：`asc` / `desc` |

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "id": 1,
        "url": "https://...",
        "name": "my_photo.jpg",
        "size": 204800,
        "width": 1920,
        "height": 1080,
        "contentType": "image/jpeg",
        "format": "jpg",
        "userId": 1,
        "user": {
          "id": 1,
          "userName": "爱丽丝",
          "userAvatar": "https://..."
        },
        "createTime": "2026-07-10T10:00:00"
      }
    ],
    "total": 100,
    "size": 10,
    "current": 1,
    "pages": 10
  },
  "message": "ok"
}
```

每条 `records` 元素为 `PictureVO`（**包含上传者 `user` 信息，无需额外请求**）。

---

### 5.3 个人中心分页

```
GET /api/picture/my/page
Authorization: Bearer <token>
```

查询当前登录用户自己的图片。请求参数同公共图库分页。

#### 查询参数

同 `GET /api/picture/page`。

#### 成功响应

同公共图库分页，只返回当前用户的图片。

> **说明**：如果 token 无效或未提供，返回 `40100`。**已登录用户查看自己的图片，不是「我的」概念而是「当前用户」的概念。**

---

### 5.4 编辑图片名称

```
PUT /api/picture/update
Authorization: Bearer <token>
Content-Type: application/json
```

#### 请求体

```json
{
  "id": 1,
  "name": "新的图片名称.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | 是 | 图片 ID |
| `name` | `string` | 是 | 新的图片名称 |

#### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "url": "https://...",
    "name": "新的图片名称.jpg",
    "size": 204800,
    "width": 1920,
    "height": 1080,
    "contentType": "image/jpeg",
    "format": "jpg",
    "userId": 1,
    "user": { "...UserVO..." },
    "createTime": "2026-07-10T10:00:00"
  },
  "message": "ok"
}
```

`data` 为更新后的 `PictureVO`。

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "图片名称不能为空" }
{ "code": 40000, "data": null, "message": "图片不存在" }
{ "code": 40101, "data": null, "message": "只能编辑自己的图片" }
```

---

### 5.5 删除图片

```
DELETE /api/picture/delete/{id}
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 图片 ID |

#### 成功响应

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "图片不存在" }
{ "code": 40101, "data": null, "message": "只能删除自己的图片" }
```

#### 后端行为

1. 校验图片存在且属于当前用户
2. 删除 COS 源文件
3. 逻辑删除数据库记录（`isDelete = 1`）

---

## 6. TypeScript 类型定义

### 基础类型

```typescript
// 通用响应包装
interface BaseResponse<T> {
  code: number
  data: T | null
  message: string
}

// 分页响应
interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
```

### 用户模块

```typescript
// 用户公开信息
interface UserVO {
  id: number
  userAccount: string
  userName: string | null
  userAvatar: string | null
  userProfile: string | null
  userRole: string        // "user" | "admin"
  createTime: string      // ISO datetime
  updateTime: string      // ISO datetime
}

// 登录响应
interface LoginResult {
  token: string
  user: UserVO
}

// 注册请求
interface RegisterRequest {
  userAccount: string
  userPassword: string
  checkPassword: string
}

// 登录请求
interface LoginRequest {
  userAccount: string
  userPassword: string
}

// 修改资料请求
interface UpdateProfileRequest {
  userName?: string | null
  userProfile?: string | null
}
```

### 图片模块

```typescript
// 图片信息（含上传者）
interface PictureVO {
  id: number
  url: string
  name: string
  size: number
  width: number
  height: number
  contentType: string
  format: string
  userId: number
  user: UserVO | null
  createTime: string
}

// 图片分页查询参数
interface PictureQueryParams {
  current?: number
  pageSize?: number
  name?: string
  minSize?: number
  maxSize?: number
  sortField?: 'name' | 'size' | 'createTime'
  sortOrder?: 'asc' | 'desc'
}

// 修改图片名请求
interface UpdatePictureRequest {
  id: number
  name: string
}
```

---

## 7. 前端对接最佳实践

### 7.1 登录态恢复流程

```
应用启动 / 页面刷新
  ↓
localStorage 中有 token?
  ├── 无 → 视为未登录，显示登录页
  └── 有 → 调 GET /api/user/current
       ├── 成功 → token 有效，将用户信息存入全局状态
       └── 失败 (40100) → 清除 token，跳转登录页
```

### 7.2 401 拦截

所有接口返回 `code === 40100` 时：
1. 清除本地 token
2. 跳转登录页
3. 不再重试请求

### 7.3 创建者资料页跳转

图片列表/详情页的 `PictureVO` 已携带创建者信息（`PictureVO.user`），**展示头像和昵称无需额外请求**。点击跳转时：

```typescript
// 点击创建者头像/昵称
function goToCreatorProfile(creatorId: number) {
  fetch(`/api/user/${creatorId}`)
    .then(res => res.json())
    .then((result: BaseResponse<UserVO>) => {
      if (result.code === 0) {
        // 跳转个人资料页，用 result.data 渲染
        navigateTo(`/user/${result.data.id}`)
      } else if (result.code === 41002) {
        // 用户已注销
        showToast('该用户已注销')
      }
    })
}
```

### 7.4 Axios 拦截器参考

```typescript
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8080/api' })

// 请求拦截器：注入 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理 401
api.interceptors.response.use(
  response => {
    const { code } = response.data
    if (code === 40100) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(new Error(response.data.message))
    }
    return response
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### 7.5 文件上传封装

```typescript
/** 上传文件（通用方法） */
async function uploadFile(url: string, file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

// 上传图片
// api.post('/picture/upload', formData)

// 上传头像
// api.post('/user/avatar/upload', formData)
```

---

## 附录 A：错误码速查

| code | message | 触发场景 |
|------|---------|----------|
| `0` | `ok` | 成功 |
| `40000` | `请求参数错误` | 参数缺失、格式非法、校验不通过 |
| `40000` | `文件类型不支持，仅支持 jpg/png/gif/webp` | 上传文件 MIME 类型不在白名单 |
| `40000` | `文件大小不能超过 10MB` | 上传文件超过 10MB |
| `40100` | `未登录` / `缺少有效 token` | 未提供 token 或 token 无效 |
| `40101` | `无权限` | 操作不属于自己的资源 |
| `41001` | `账号已存在` | 注册时账号已被注册 |
| `41002` | `用户不存在` | 登录或查用户时不存在 |
| `41003` | `密码错误` | 登录时密码不匹配 |
| `41004` | `账号已被禁用` | 账号被管理员禁用 |
| `50000` | `服务器内部错误` / 具体描述 | 后端未预料的异常 |

### 前端统一错误处理建议

```typescript
function handleApiError(code: number, message: string) {
  switch (code) {
    case 40100:
      // 清除登录态，跳转登录页
      break
    case 40101:
      showToast('没有权限执行此操作')
      break
    case 40000:
    case 41001:
    case 41002:
    case 41003:
    case 41004:
      showToast(message)  // 直接展示后端返回的 message
      break
    case 50000:
      showToast('服务器异常，请稍后重试')
      break
    default:
      showToast(message || '未知错误')
  }
}
```

---

> 文档版本：v1.0 | 最后更新：2026-07-11
