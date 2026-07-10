# 图片上传接口

## 基本信息

| 项目 | 值 |
|------|-----|
| **请求地址** | `POST /api/picture/upload` |
| **Content-Type** | `multipart/form-data` |
| **字符编码** | UTF-8 |
| **认证方式** | `Authorization: Bearer <token>`（需登录） |

---

## 请求参数

`form-data` 格式：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | 图片文件，支持 jpg / png / gif / webp，最大 10MB |

---

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "url": "https://your-bucket.cos.ap-guangzhou.myqcloud.com/2025/07/10/a1b2c3d4e5f6.jpg",
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

### 失败响应

```json
{
  "code": 40000,
  "data": null,
  "message": "文件类型不支持，仅支持 jpg/png/gif/webp"
}
```

---

## 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `long` | 图片记录 ID |
| `url` | `string` | 图片 CDN 访问地址，可直接用于 `<img src>` |
| `name` | `string` | 原始文件名 |
| `size` | `long` | 文件大小（字节） |
| `width` | `int` | 图片宽度（像素） |
| `height` | `int` | 图片高度（像素） |
| `contentType` | `string` | MIME 类型，如 `image/jpeg` |
| `format` | `string` | 格式后缀，如 `jpg` |
| `userId` | `long` | 上传用户 ID |
| `createTime` | `string` | 上传时间 (ISO-8601) |

---

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 40000 | 请求参数错误（如文件类型不支持、大小超限、文件不是有效图片） |
| 40100 | 未登录（token 缺失或无效） |
| 50000 | 服务器内部错误（如 COS 上传失败） |

---

## 前端示例

### JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/picture/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
if (result.code === 0) {
  console.log('上传成功', result.data.url);
}
```

### HTML input + 预览

```html
<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onchange="upload(this)" />

<script>
async function upload(input) {
  const file = input.files[0];
  if (file.size > 10 * 1024 * 1024) {
    return alert('文件不能超过 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/picture/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const json = await res.json();

  if (json.code === 0) {
    const img = document.createElement('img');
    img.src = json.data.url;
    document.body.appendChild(img);
  }
}
</script>
```

---

## 注意事项

1. **Token 失效**：接口返回 `40100` 时，说明登录已过期，需要重新登录
2. **上传限制**：仅支持 `image/jpeg`、`image/png`、`image/gif`、`image/webp`，单文件 ≤ 10MB
3. **图片访问**：`url` 为 COS 直链地址，前端可直接用于 `<img>` 标签展示或下载
4. **同名覆盖**：上传的文件名在 COS 上以 UUID 重命名，不会因原始文件名重复而覆盖
