# PictureHub 后端 API 文档

> 本文档供前端开发对接使用，描述当前已实现的用户功能接口。

---

## 基本信息

| 项目 | 值 |
|------|-----|
| 基础地址 | `http://localhost:8080` |
| 全局前缀 | `/api` |
| 响应格式 | `JSON` |
| 字符编码 | `UTF-8` |
| CORS | 全开（`*`），允许携带凭据 |

---

## 统一响应结构

所有接口返回格式一致：

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 业务状态码，`0` 表示成功，非 `0` 表示异常 |
| `data` | `T` | 业务数据，成功时携带，失败时为 `null` |
| `message` | `string` | 提示信息，成功时为 `"ok"`，失败时为具体错误描述 |

---

## 业务状态码

| code | 含义 | 说明 |
|------|------|------|
| `0` | 成功 | |
| `40000` | 请求参数错误 | 参数缺失、格式不对、校验不通过等 |
| `40100` | 未登录 | **前端需拦截此码，清除 token 并跳转登录页** |
| `40101` | 无权限 | 当前角色无权访问该资源 |
| `42900` | 请求过于频繁 | 限流触发 |
| `50000` | 服务器内部错误 | 未预料的异常 |
| `41001` | 账号已存在 | 注册时账号已被占用 |
| `41002` | 用户不存在 | 登录或查询时账号不存在 |
| `41003` | 密码错误 | 登录时密码不匹配 |
| `41004` | 账号已被禁用 | 登录时检测到账号被禁用 |

---

## 鉴权机制

### 认证方式：**JWT Bearer Token**

- 登录成功后，后端返回 `token` 字符串（JWT，HS256 签名）
- 前端需将 token 存入 `localStorage` 或 `sessionStorage`
- 需要鉴权的请求在 `HTTP Header` 中携带：

```
Authorization: Bearer <token>
```

### Token 有效期

- 默认 **24 小时**（可配置 `jwt.expire`）
- Token 过期后请求会返回 `code: 40100`

### 退出登录

- 退出时前端需调用 `/api/user/logout`
- 同时**前端清除本地存储的 token**
- 退出后该 token 会被加入 Redis 黑名单，立即失效

### 401 处理

当接口返回 `code === 40100` 时，前端应：
1. 清除本地 token
2. 跳转登录页
3. 不再重试请求

> **注意**：注册和登录接口不需要鉴权，其余 `/api/**` 接口都需要 Bearer token。

---

## 接口列表

---

### 1. 用户注册

```
POST /api/user/register
Content-Type: application/json
```

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

`data` 为新增用户的 `id`（`Long`）。

#### 异常示例

```json
{
  "code": 40000,
  "data": null,
  "message": "账号长度应为 4-16 位"
}
```

```json
{
  "code": 41001,
  "data": null,
  "message": "账号已存在"
}
```

#### 后端处理逻辑

1. 参数校验 → 不通过返回 `40000`
2. 查重：`SELECT COUNT(*) FROM user WHERE user_account = ? AND is_delete = 0` → 已存在返回 `41001`
3. 密码 BCrypt 加密（成本因子 12）
4. 昵称默认 `"user_" + 8 位随机数字`
5. 角色默认 `"user"`
6. 写入数据库，返回自增 ID

---

### 2. 用户登录

```
POST /api/user/login
Content-Type: application/json
```

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
| `data.token` | `string` | JWT，需前端保存并用于后续请求 |
| `data.user` | `UserVO` | 当前登录用户信息（不含密码） |

#### 异常示例

```json
{ "code": 41002, "data": null, "message": "用户不存在" }
{ "code": 41003, "data": null, "message": "密码错误" }
```

> **安全提示**：后端对不存在的账号和密码错误返回不同错误码，前端不必混淆处理，按提示展示即可。

#### 后端处理逻辑

1. 按 `userAccount` 查数据库（只查未删除记录）
2. 用户不存在 → `41002`
3. 密码 BCrypt 比对失败 → `41003`
4. 生成 JWT（payload：`userId`、`role`、`sub`、`iat`、`exp`）
5. 写入 Redis：`user:login:{userId} = token`（24h 过期）
6. 返回 `LoginUserVO { token, userVO }`

---

### 3. 退出登录

```
POST /api/user/logout
Authorization: Bearer <token>
```

#### 请求体

无（无需 body）

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": true,
  "message": "ok"
}
```

`data` 为 `boolean`，固定 `true`。

#### 异常响应

若无 token 或 token 无效，返回 `40100`（同鉴权拦截器）。

#### 后端处理逻辑

1. 从请求上下文取 `userId` + `token`（由 AuthInterceptor 注入）
2. 删除 Redis key：`user:login:{userId}`
3. 将 token 加入 Redis 黑名单：`jwt:blacklist:{token} = "1"`，TTL 设为 JWT 剩余有效期
4. 未登录状态调用也返回 `true`（幂等）

---

### 4. 获取当前用户信息

```
GET /api/user/current
Authorization: Bearer <token>
```

#### 请求体

无（无 body）

#### 成功响应 `code: 0`

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

#### 异常响应

```json
{ "code": 40100, "data": null, "message": "token 无效或已过期" }
```

#### 后端处理逻辑

1. 从请求上下文取 `userId`（由拦截器注入）
2. 按 ID 查数据库
3. `UserConverter.toVO()` 转换，跳过 `userPassword` 字段
4. 用户不存在返回 `41002`

> **说明**：此接口频繁用于前端页面刷新时恢复用户登录态（刷新后从 localStorage 取 token 调此接口获取最新用户信息）。

---

## 数据模型

### UserVO（返回给前端的用户对象）

```json
{
  "id": 1,
  "userAccount": "alice01",
  "userName": "user_12345678",
  "userAvatar": null,
  "userProfile": null,
  "userRole": "user",
  "createTime": "2026-07-10T12:00:00",
  "updateTime": "2026-07-10T12:00:00"
}
```

| 字段 | 类型 | 示例 | 说明 |
|------|------|------|------|
| `id` | `number` | `1` | 用户 ID |
| `userAccount` | `string` | `"alice01"` | 登录账号 |
| `userName` | `string \| null` | `"user_12345678"` | 昵称，注册时自动生成 |
| `userAvatar` | `string \| null` | `null` | 头像 URL，后续扩展 |
| `userProfile` | `string \| null` | `null` | 个人简介，后续扩展 |
| `userRole` | `string` | `"user"` | 角色：`"user"` 普通用户、`"admin"` 管理员 |
| `createTime` | `string` | `"2026-07-10T12:00:00"` | ISO 格式，注册时间 |
| `updateTime` | `string` | `"2026-07-10T12:00:00"` | ISO 格式，最近更新时间 |

> 密码字段 `userPassword` **不会出现在任何返回数据中**。

---

## 前端对接建议

### 登录态恢复流程

```
应用启动 / 页面刷新
  ↓
localStorage 中有 token?
  ├── 无 → 视为未登录，显示登录页
  └── 有 → 调 GET /api/user/current
       ├── 成功 → token 有效，将用户信息存入全局状态
       └── 失败 (40100) → 清除 token，跳转登录页
```

### Axios 拦截器参考

```typescript
// 请求拦截器：注入 token
config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`

// 响应拦截器：统一处理 401
if (response.data.code === 40100 || response.status === 401) {
  localStorage.removeItem('token')
  window.location.href = '/login'
  return Promise.reject(new Error(response.data.message))
}
```

### TypeScript 类型定义参考

```typescript
interface BaseResponse<T> {
  code: number
  data: T
  message: string
}

interface UserRegisterRequest {
  userAccount: string
  userPassword: string
  checkPassword: string
}

interface UserLoginRequest {
  userAccount: string
  userPassword: string
}

interface UserVO {
  id: number
  userAccount: string
  userName: string | null
  userAvatar: string | null
  userProfile: string | null
  userRole: string
  createTime: string
  updateTime: string
}

interface LoginResult {
  token: string
  user: UserVO
}
```

---

## 附录

### 数据库表结构（`user` 表）

```sql
CREATE TABLE `user` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `userAccount` VARCHAR(16)  NOT NULL UNIQUE         COMMENT '账号',
    `userPassword` VARCHAR(100) NOT NULL               COMMENT 'BCrypt 密文',
    `userName`    VARCHAR(32)           DEFAULT NULL    COMMENT '昵称',
    `userAvatar`  VARCHAR(255)          DEFAULT NULL    COMMENT '头像 URL',
    `userProfile` VARCHAR(255)          DEFAULT NULL    COMMENT '个人简介',
    `userRole`    VARCHAR(16)  NOT NULL DEFAULT 'user'  COMMENT '角色',
    `createTime`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updateTime`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `isDelete`    TINYINT      NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删 1-已删',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_userAccount` (`userAccount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### Redis Key 设计

| Key | Value | TTL | 用途 |
|-----|-------|-----|------|
| `user:login:{userId}` | JWT 字符串 | 24h | 登录态校验，多端互踢 |
| `jwt:blacklist:{token}` | `"1"` | 剩余 JWT 有效期 | 退出后 token 立即失效 |

### CORS 配置

```yaml
# 无需前端额外处理
allowedOriginPatterns: "*"
allowedMethods: GET, POST, PUT, DELETE, OPTIONS
allowCredentials: true
```

### 后端技术栈速览

| 组件 | 说明 |
|------|------|
| Spring Boot 3.5.3 | 框架 |
| MyBatis-Plus 3.5.9 | ORM |
| MySQL 8.0 | 数据库 |
| Redis 7 | 登录态 + 黑名单存储 |
| JWT (jjwt 0.12.6) | 无状态令牌 |
| BCrypt (jbcrypt 0.4) | 密码加密 |
