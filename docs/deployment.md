# 导入 Vercel

首版使用 Next.js + Supabase + R2；没有运行任何外部部署，也没有替用户推送代码。先审核本地提交，再由用户将分支推送到 GitHub；在 Vercel 点击 Add New → Project，导入 `JohnYehyo/zhiyu`，选择实现所在的分支。

## 项目设置

- Framework Preset：Next.js。
- Root Directory：仓库根目录，不是父目录的原型页面。
- Install Command：`npm ci`。
- Build Command：`npm run build`；Output Directory 使用 Next.js 默认值。
- Node.js：22.x。
- 部署目标分支由用户确认；将实现分支设为 Production Branch，或合并到约定生产分支后部署。

可以先不填云密钥导入：阅读端展示本地示例，后台写入关闭，`/admin/demo` 提供明确的本地试写体验。公开 Supabase URL 与公共 key 成对配置后会开始查询真实数据库，因此请先应用迁移；不要只填公共 key 而未建表。

## 环境变量

在 Project Settings → Environment Variables 添加 `.env.example` 中的变量，选择实际使用的 Production/Preview 环境；更改后重新部署才能更新前端内联变量。不要把真实密钥放进仓库或 Vercel 构建命令。

| 用途              | 变量                                                                                                | 可在客户端使用 |
| ----------------- | --------------------------------------------------------------------------------------------------- | -------------- |
| Supabase 项目地址 | `NEXT_PUBLIC_SUPABASE_URL`                                                                          | 是             |
| Supabase 公共 key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`；旧集成可用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`                  | 是             |
| Supabase 服务 key | `SUPABASE_SECRET_KEY`；旧集成可用 `SUPABASE_SERVICE_ROLE_KEY`                                       | 否             |
| 唯一管理员 UID    | `ADMIN_USER_ID`                                                                                     | 否             |
| R2 存储           | `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`、`R2_KEY_PREFIX=blob` | 否             |
| 媒体公共根地址    | `NEXT_PUBLIC_MEDIA_BASE_URL`                                                                        | 是             |
| 网站地址          | `NEXT_PUBLIC_SITE_URL`                                                                              | 是             |

同类新变量 trim 后非空时优先，空白时回退旧变量。Vercel 的 Supabase 集成如果注入旧变量名，可以直接使用；必须另设 `ADMIN_USER_ID`，且服务角色绝不能使用 `NEXT_PUBLIC_` 前缀。真实编辑视图验证 Supabase `getUser()` 与管理员 UID；公开 key 不是管理员凭据。

按 [服务接入说明](cloud-setup.md) 应用 SQL、关闭公开注册、创建管理员、配置 R2。将固定 Vercel 网站地址加入桶 CORS；本地按实际端口配置 origin。Preview 的临时域名也需显式加入，不能因测试方便使用 `*`。可用稳定的自定义域名减少 CORS 维护。

## 用户接入后的验收

1. 登录、刷新页面、退出；非管理员不能访问稿件或调用写 API。
2. 新建中文稿件，连续输入期间自动保存，刷新确认内容完整；修改同一稿件触发 409 后本地内容仍可下载。
3. 图片与手机视频直传、进度、完成确认、说明/图注与封面；检查 R2 重复 PUT 拒绝覆盖，验证上传失败后的重试确认。
4. 发布后检查公开阅读页；继续修改草稿确认阅读页保持上一快照；再次发布才更新。改变 slug 后检查旧地址失效，撤回后公开文章不可读取。
5. 手机/平板检查格式工具、预览与媒体比例；视频需手动播放，不自动播放。QuickTime 等容器不保证在所有浏览器播放，应使用目标浏览器支持的编码。

本地测试验证保存队列、受限内容、管理员/API 边界及实际 SQL 事务；这些结果不等同真实云接入成功。真实云角色、浏览器 CORS/File 上传和托管缓存仍需以上验收。

参考：[Vercel Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)、[环境变量](https://vercel.com/docs/environment-variables)、[Supabase key 类型](https://supabase.com/docs/guides/api/api-keys)、[Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)。
