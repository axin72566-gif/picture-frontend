# 图片管理接口文档

> 供前端开发人员对接使用

---

## 通用说明

| 项目 | 值 |
|------|-----|
| **Content-Type** | `application/json`（上传接口除外） |
| **字符编码** | UTF-8 |

### 认证方式

除公共图库外，其余接口需在请求头携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 通过登录接口获取。

### 通用响应格式

```json
{
  "code": 0,
  "data": { ... },
  "message": "ok"
}
```

### 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 40000 | 请求参数错误 |
| 40100 | 未登录（token 缺失或无效） |
| 40101 | 无权限（只能操作自己的图片） |
| 50000 | 服务器内部错误 |

---

## 1. 上传图片

```
POST /api/picture/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求参数**（form-data）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | jpg / png / gif / webp，最大 10MB |

**响应示例**：

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "url": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/2025/07/10/a1b2c3d4e5f6.jpg",
    "name": "my_photo.jpg",
    "size": 204800,
    "width": 1920,
    "height": 1080,
    "contentType": "image/jpeg",
    "format": "jpg",
    "userId": 1,
    "createTime": "2025-07-10T10:00:00"
  },
  "message": "ok"
}
```

---

## 2. 公共图库分页

```
GET /api/picture/page
```

**说明**：无需登录，浏览所有用户上传的图片。

**请求参数**（Query String）：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `current` | `int` | 否 | 1 | 页码 |
| `pageSize` | `int` | 否 | 10 | 每页条数 |
| `name` | `string` | 否 | - | 图片名模糊搜索 |
| `minSize` | `long` | 否 | - | 最小文件大小（字节） |
| `maxSize` | `long` | 否 | - | 最大文件大小（字节） |
| `sortField` | `string` | 否 | `createTime` | 排序字段：`name` / `size` / `createTime` |
| `sortOrder` | `string` | 否 | `desc` | 排序方向：`asc` / `desc` |

**响应示例**：

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "id": 1,
        "url": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/2025/07/10/a1b2c3d4e5f6.jpg",
        "name": "my_photo.jpg",
        "size": 204800,
        "width": 1920,
        "height": 1080,
        "contentType": "image/jpeg",
        "format": "jpg",
        "userId": 1,
        "createTime": "2025-07-10T10:00:00"
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

**分页响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `records` | `array` | 当前页数据列表 |
| `total` | `long` | 总记录数 |
| `size` | `long` | 每页大小 |
| `current` | `long` | 当前页码 |
| `pages` | `long` | 总页数 |

---

## 3. 个人中心分页

```
GET /api/picture/my/page
Authorization: Bearer <token>
```

**说明**：查看当前登录用户自己上传的图片。

**请求参数**（Query String）：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `current` | `int` | 否 | 1 | 页码 |
| `pageSize` | `int` | 否 | 10 | 每页条数 |
| `name` | `string` | 否 | - | 图片名模糊搜索 |
| `minSize` | `long` | 否 | - | 最小文件大小（字节） |
| `maxSize` | `long` | 否 | - | 最大文件大小（字节） |
| `sortField` | `string` | 否 | `createTime` | 排序字段 |
| `sortOrder` | `string` | 否 | `desc` | 排序方向 |

**响应格式**：同公共图库分页。

---

## 4. 编辑图片名称

```
PUT /api/picture/update
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：

```json
{
  "id": 1,
  "name": "新图片名称.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `long` | 是 | 图片 ID |
| `name` | `string` | 是 | 新的图片名 |

**说明**：只能编辑自己上传的图片，非本人操作返回 `40101`。

**响应示例**：

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "url": "https://picture-1397275457.cos.ap-nanjing.myqcloud.com/2025/07/10/a1b2c3d4e5f6.jpg",
    "name": "新图片名称.jpg",
    "size": 204800,
    "width": 1920,
    "height": 1080,
    "contentType": "image/jpeg",
    "format": "jpg",
    "userId": 1,
    "createTime": "2025-07-10T10:00:00"
  },
  "message": "ok"
}
```

---

## 5. 删除图片

```
DELETE /api/picture/delete/{id}
Authorization: Bearer <token>
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `long` | 图片 ID |

**说明**：
- 只能删除自己上传的图片，非本人操作返回 `40101`
- 删除时会同步删除 COS 上的源文件

**响应示例**：

```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

---

## PictureVO 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `long` | 图片记录 ID |
| `url` | `string` | CDN 访问地址，可直接用于 `<img src>` |
| `name` | `string` | 图片名称 |
| `size` | `long` | 文件大小（字节） |
| `width` | `int` | 图片宽度（像素） |
| `height` | `int` | 图片高度（像素） |
| `contentType` | `string` | MIME 类型，如 `image/jpeg` |
| `format` | `string` | 格式后缀，如 `jpg` |
| `userId` | `long` | 上传用户 ID |
| `createTime` | `string` | 上传时间 (ISO-8601) |
