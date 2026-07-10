# 修改个人信息 / 上传头像

Base URL: `/api/user`

> 所有接口需要在请求头携带 `Authorization: Bearer <token>`，token 通过登录接口获取。

---

## 1. 修改个人信息

修改当前登录用户的昵称、个人简介。

### 请求

```
PUT /api/user/update
```

**请求头**

| 头字段 | 值 | 必填 |
|---|---|---|
| Content-Type | application/json | 是 |
| Authorization | Bearer `<token>` | 是 |

**请求体 (JSON)**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| userName | string | 否 | 用户昵称，1~32 个字符 |
| userProfile | string | 否 | 个人简介，最多 255 个字符 |

> `userName` 和 `userProfile` 至少提供一个。

### 响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "userAccount": "zhangsan",
    "userName": "张三",
    "userAvatar": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/avatar/2026/07/10/abc123.jpg",
    "userProfile": "全栈工程师",
    "userRole": "user",
    "createTime": "2026-07-10T10:00:00",
    "updateTime": "2026-07-10T12:00:00"
  }
}
```

### 错误码

| code | message | 说明 |
|---|---|---|
| 40000 | 请至少提供一个需要修改的字段 | userName 和 userProfile 均为空 |
| 40000 | 用户昵称长度不能超过 32 个字符 | 昵称超长 |
| 40000 | 个人简介长度不能超过 255 个字符 | 简介超长 |
| 40100 | 未登录 | 未携带 token 或 token 已失效 |
| 41002 | 用户不存在 | 用户已被删除 |

### 请求示例 (fetch)

```javascript
const res = await fetch('/api/user/update', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    userName: '张三',
    userProfile: '全栈工程师'
  })
})
const data = await res.json()
```

---

## 2. 上传头像

上传图片文件作为当前登录用户的头像。上传成功后自动替换旧头像。

### 请求

```
POST /api/user/avatar/upload
```

**请求头**

| 头字段 | 值 | 必填 |
|---|---|---|
| Content-Type | multipart/form-data | 是 |
| Authorization | Bearer `<token>` | 是 |

**请求体 (form-data)**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| file | File | 是 | 图片文件，支持 jpg / png / gif / webp，最大 10MB |

### 响应

```json
{
  "code": 0,
  "message": "ok",
  "data": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/avatar/2026/07/10/def456.jpg"
}
```

`data` 字段为上传后的头像 CDN 地址，前端可直接用于 `<img src>`。

### 错误码

| code | message | 说明 |
|---|---|---|
| 40000 | 文件不能为空 | 未上传文件或文件为空 |
| 40000 | 文件类型不支持，仅支持 jpg/png/gif/webp | 上传了非图片文件或格式不支持 |
| 40000 | 文件大小不能超过 10MB | 超出大小限制 |
| 40100 | 未登录 | 未携带 token 或 token 已失效 |
| 41002 | 用户不存在 | 用户已被删除 |
| 50000 | 头像上传失败，请稍后重试 | COS 服务异常 |

### 请求示例 (fetch)

```javascript
const form = new FormData()
form.append('file', fileInput.files[0])

const res = await fetch('/api/user/avatar/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
    // 注意: 不要手动设置 Content-Type，
    // fetch 会根据 FormData 自动设置 multipart/form-data + boundary
  },
  body: form
})
const data = await res.json()
// data.data 即为头像 URL
```

### 前端使用建议

上传成功后可将返回的 URL 赋值给 `userAvatar`，再调用 `GET /api/user/current` 刷新用户信息，或直接更新本地状态。
