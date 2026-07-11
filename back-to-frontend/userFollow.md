# 用户关注功能接口文档

> 本文档供前端开发对接使用，描述用户关注（Follow）功能的所有接口。

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-07-11 | v1.0 | 初始版本，新增用户关注功能 |

---

## 数据模型变更

### UserVO（新增字段）

原先的 `UserVO` 新增了两个字段：

```json
{
  "id": 1,
  "userAccount": "alice01",
  "userName": "user_12345678",
  "userAvatar": null,
  "userProfile": null,
  "userRole": "user",
  "createTime": "2026-07-10T12:00:00",
  "updateTime": "2026-07-10T12:00:00",
  "followerCount": 42,
  "followingCount": 15
}
```

| 字段 | 类型 | 示例 | 说明 |
|------|------|------|------|
| `followerCount` | `number` | `42` | 粉丝数（关注该用户的人数） |
| `followingCount` | `number` | `15` | 关注数（该用户关注的人数） |

**影响范围**：以下接口的响应中 `UserVO` 均会携带这两个字段：
- `GET /api/user/{id}`（公共）
- `GET /api/user/current`（需登录）
- `PUT /api/user/update`（需登录）
- `GET /api/user/{id}/followers`（返回列表中的用户）
- `GET /api/user/{id}/following`（返回列表中的用户）

---

## 接口列表

---

### 1. 关注用户

```
POST /api/user/follow/{followedId}
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `followedId` | `number` | 要关注的用户 ID |

#### 请求体

无（无需 body）

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "不能关注自己" }
{ "code": 40000, "data": null, "message": "已关注该用户" }
{ "code": 41002, "data": null, "message": "用户不存在" }
{ "code": 40100, "data": null, "message": "未登录" }
```

#### 后端处理逻辑

1. 不能关注自己 → `40000`
2. 被关注用户不存在 → `41002`
3. 已关注 → `40000`
4. 插入 `user_follow` 记录

---

### 2. 取消关注

```
DELETE /api/user/follow/{followedId}
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `followedId` | `number` | 要取消关注的用户 ID |

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

#### 异常示例

```json
{ "code": 40000, "data": null, "message": "未关注该用户" }
{ "code": 40100, "data": null, "message": "未登录" }
```

#### 后端处理逻辑

1. **物理删除** `user_follow` 中 `followerId = 当前用户` 且 `followedId = {followedId}` 的记录
2. 未关注时返回 `40000`

---

### 3. 粉丝列表（分页）

```
GET /api/user/{id}/followers?current=1&pageSize=10
```

> **无需登录**，公开接口。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 目标用户 ID |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `current` | `int` | 否 | `1` | 页码 |
| `pageSize` | `int` | 否 | `10` | 每页条数 |

> 固定按关注时间倒序（最新关注排最前），不支持自定义排序。

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "id": 3,
        "userAccount": "charlie",
        "userName": "Charlie",
        "userAvatar": null,
        "userProfile": null,
        "userRole": "user",
        "createTime": "2026-07-10T12:00:00",
        "updateTime": "2026-07-10T12:00:00",
        "followerCount": 10,
        "followingCount": 5
      }
    ],
    "total": 42,
    "size": 10,
    "current": 1,
    "pages": 5
  },
  "message": "ok"
}
```

**分页响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `records` | `array` | 当前页粉丝列表（UserVO 数组），每个元素即一个粉丝的用户信息 |
| `total` | `long` | 总粉丝数 |
| `size` | `long` | 每页大小 |
| `current` | `long` | 当前页码 |
| `pages` | `long` | 总页数 |

---

### 4. 关注列表（分页）

```
GET /api/user/{id}/following?current=1&pageSize=10
```

> **无需登录**，公开接口。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 目标用户 ID |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `current` | `int` | 否 | `1` | 页码 |
| `pageSize` | `int` | 否 | `10` | 每页条数 |

> 固定按关注时间倒序，不支持自定义排序。

#### 成功响应 `code: 0`

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "id": 2,
        "userAccount": "bob",
        "userName": "Bob",
        "userAvatar": null,
        "userProfile": null,
        "userRole": "user",
        "createTime": "2026-07-10T12:00:00",
        "updateTime": "2026-07-10T12:00:00",
        "followerCount": 30,
        "followingCount": 8
      }
    ],
    "total": 15,
    "size": 10,
    "current": 1,
    "pages": 2
  },
  "message": "ok"
}
```

---

### 5. 查询是否已关注

```
GET /api/user/{id}/follow/status
```

> **无需登录**。未登录或未关注时返回 `false`，已关注返回 `true`。
>
> 后端会对携带的合法 token 做可选鉴权：有登录态时按当前用户判断关注关系；无 token 时直接返回 `false`。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 目标用户 ID |

#### 成功响应

```json
{
  "code": 0,
  "data": true,
  "message": "ok"
}
```

`data` 为 `boolean`：
- `true` — 当前登录用户已关注该用户
- `false` — 未关注（或当前未登录）

---

## 前端对接指南

### 使用场景

| 场景 | 接口 | 说明 |
|------|------|------|
| 个人主页 | `GET /api/user/{id}` | 获取用户信息时自带 `followerCount` / `followingCount` |
| 关注按钮 | `POST /api/user/follow/{id}` | 点击"关注"时调用 |
| 取关按钮 | `DELETE /api/user/follow/{id}` | 点击"已关注"时调用 |
| 关注态判断 | `GET /api/user/{id}/follow/status` | 进入用户主页时调用，决定按钮显示"关注"或"已关注" |
| 粉丝列表页 | `GET /api/user/{id}/followers` | 展示"粉丝"列表 |
| 关注列表页 | `GET /api/user/{id}/following` | 展示"关注"列表 |
| 个人中心 | `GET /api/user/current` | 当前用户的资料也自带关注计数 |

### 典型前端交互流程

```
进入用户主页
  ↓
GET /api/user/{id}
  └── 渲染用户信息 + followerCount / followingCount
  ↓
GET /api/user/{id}/follow/status
  └── data === true  → 显示「已关注」按钮
  └── data === false → 显示「关注」按钮
  ↓
点击「关注」→ POST /api/user/follow/{id} → 成功后将按钮转为「已关注」
点击「已关注」→ DELETE /api/user/follow/{id} → 成功后将按钮转为「关注」
```

### 关注/取关后的本地更新建议

关注或取关成功后，前端可本地更新计数（避免重新请求接口）：

```
关注成功 → followerCount -1（对方主页）/ followingCount +1（自己主页）
取关成功 → followerCount +1（对方主页）/ followingCount -1（自己主页）
```

---

## TypeScript 类型定义

```typescript
// UserVO 新增字段
interface UserVO {
  id: number
  userAccount: string
  userName: string | null
  userAvatar: string | null
  userProfile: string | null
  userRole: string
  createTime: string
  updateTime: string
  followerCount: number
  followingCount: number
}

// 分页响应
interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// 关注状态响应
// data 为 boolean：true 已关注，false 未关注
```

---

## 附录

### 数据库表结构

```sql
CREATE TABLE `user_follow` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `followerId`  BIGINT   NOT NULL COMMENT '关注者ID',
    `followedId`  BIGINT   NOT NULL COMMENT '被关注者ID',
    `createTime`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `isDelete`    TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_follower_followed` (`followerId`, `followedId`),
    KEY `idx_followerId` (`followerId`),
    KEY `idx_followedId` (`followedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 接口鉴权汇总

| 接口 | 是否需要登录 | 说明 |
|------|------------|------|
| `POST /api/user/follow/{id}` | 是 | 关注操作 |
| `DELETE /api/user/follow/{id}` | 是 | 取关操作 |
| `GET /api/user/{id}/followers` | 否 | 公开 |
| `GET /api/user/{id}/following` | 否 | 公开 |
| `GET /api/user/{id}/follow/status` | 否 | 公开（未登录返回 false） |
| `GET /api/user/{id}` | 否 | 公开（自带关注计数） |
| `GET /api/user/current` | 是 | 当前用户（自带关注计数） |
