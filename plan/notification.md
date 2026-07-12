# 前端站内通知改造

目标仓库：`picture-frontend`。

## 交互方案

- 登录后顶栏显示铃铛 + 未读角标；每 30s 轮询未读数
- Popover 展示最近通知 +「全部已读」+「查看全部」
- 独立页 `/notifications`（需登录）完整分页
- 点击：`FOLLOW` → 发送者主页；`COMMENT`/`REPLY` → `/?pictureId=` 打开图片详情

## 后端小补丁

- `GET /api/picture/{id}` 公开取图（评论通知深链必需）

## 前端文件

- `src/types/notification.ts`、`src/api/notification.ts`、`src/stores/notificationStore.ts`
- `src/components/NotificationBell.vue`、`src/pages/notification/NotificationPage.vue`
- 修改 `AppHeader.vue`、`router/index.ts`、`picture.ts`、`PictureLibrary.vue`、`request.ts`
