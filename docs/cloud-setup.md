# 首版服务接入

本地未配置时只展示明确标记的示例文章，后台写入/上传返回 503。完整公共 Supabase 配置后读取 `published_posts`；数据库失败会显示错误，不再回退示例。服务端 Secret key、ADMIN_USER_ID 与 R2 key 永不进入浏览器。

## Supabase

1. 在 Supabase SQL Editor 应用 `supabase/migrations/202610120001_initial.sql`（一次性初始迁移，已有同名表请先人工审核；不要反复执行）。迁移已在本地 PGlite PostgreSQL 引擎验证，尚未应用真实项目。
2. 在 Authentication 中关闭公开注册，人工创建唯一管理员账号，复制 User UID 为 `ADMIN_USER_ID`。后台使用邮箱密码登录，没有注册入口。Supabase API 仍有权限规则；关闭注册不能代替 API 鉴权。
3. 按 `.env.example` 配置 Project URL、Publishable key、仅服务端 Secret key 与管理员 UID。Project URL 已确认为 `https://mgbahqnxoraqmljibsrc.supabase.co`；URL 存在但 key 为空仍视为未配置。
4. 在本地填 `.env.local`，在 Vercel 项目中分别配置环境变量。变量修改后重新构建部署。不要提交 `.env.local`，不要把 Secret key 放到 `NEXT_PUBLIC_*`。

`draft_posts` 与 `media` 开启 RLS，并撤销 anon/authenticated 的所有表访问；只允许服务端 service_role。`published_posts` 只对公共角色开放 SELECT。写 API 每次调用 Supabase `getUser()` 校验真实用户，并严格比较管理员 UID。代理只刷新 `/admin/*` 和 `/api/admin/*` 的 Cookie；不会给公共阅读缓存加入会话。

保存、发布、撤回函数为 SECURITY INVOKER、空 search_path，撤销 PUBLIC/anon/authenticated 的 EXECUTE，仅授予 service_role。它们按 owner 和预期 revision 锁定草稿；保存递增 revision，冲突返回 409。发布在同一事务锁定并检查 ready、所属账号、匹配类型/键的媒体，再生成公开快照并剥离预览 src。草稿自动保存不会修改公开内容。唯一公开 slug 冲突会回滚整个发布事务。发布/撤回会刷新根布局下阅读页缓存，包括原 slug。

## R2

1. 配置 `.env.example` 的账号、桶、Object Read & Write 凭据及公共媒体 URL。当前桶为 `johnyehyo`，前缀固定 `blob`，R2 endpoint 由账号生成：`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`，桶作为路径，不拼进账号主机。公共 URL 为 `https://pub-5ae729e1d9de4ed79a75a0afd0101d49.r2.dev`；生产可另配 HTTPS 根地址的媒体域名。
2. 对桶配置 CORS。AllowedOrigins 仅填实际网站地址与必要的本地测试地址；不要 `*`。AllowedMethods 设置 PUT、GET、HEAD；AllowedHeaders 至少 `Content-Type`、`If-None-Match`；ExposeHeaders 可设置 ETag。MaxAgeSeconds 可为 3600。用真实 Vercel域名替换示例值。

```json
[
  {
    "AllowedOrigins": ["https://your-site.vercel.app", "http://localhost:3100"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "If-None-Match"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

后台调用媒体创建 API 得到 `{media, uploadUrl, uploadHeaders}`。上传时将原始 File 作为 PUT body，并发送返回的 `uploadHeaders`（Content-Type 和 If-None-Match:*）；**不要手工设置 Content-Length**，浏览器按 File 自动生成。服务端签名绑定类型、字节数和只能新建的条件，有效期五分钟；重复 PUT 不可覆盖已创建对象。网络中断可先重试 complete；如果 HEAD 不存在则重新创建一个媒体记录和签名。成功上传后调用 complete，服务端 HEAD 必须精确匹配类型和大小才登记 ready。服务器不代理媒体 body。

允许 JPEG/PNG/WebP/GIF（≤20 MiB）与 MP4/WebM/QuickTime（≤200 MiB），禁止 SVG、HTML 和任意路径。mime 是签名及 HEAD 元数据核验，不是内容转码或字节格式扫描；正文渲染只使用图片/视频元素。文件名仅用于输入校验，实际对象键使用服务端随机 UUID 和管理员 UUID。缺少 R2 凭据只关闭上传，不影响纯文字稿件。

R2 公共桶 URL 中的文件可以凭 URL 直接访问，**草稿里的家庭媒体不会因稿件未发布而自动变成私有对象**。这是既定公共媒体桶架构的限制，私密媒体需要以后另做私有桶/签名读取方案。失败或放弃上传的 pending 记录和孤立对象尚无自动清理，勿配置会删除已发布对象的简单 TTL。

## API 与错误

- GET/POST `/api/admin/posts`，GET/PATCH `/api/admin/posts/[id]`；POST 创建接收 PostDraft，PATCH 接收 `{revision,draft}`，列表返回 `{posts}`，其他稿件操作返回 `{post}`。
- POST `/api/admin/posts/[id]/publish` 与 `/unpublish` 接收 `{revision}`。
- POST `/api/admin/media` 接收 `{filename,contentType,size}`，返回 `{media,uploadUrl,uploadHeaders}`；POST `/api/admin/media/[id]/complete` 无需 body，返回 `{media,url}`。
- 所有 Cookie 写操作必须带与请求 URL 相同的 Origin（浏览器同站请求会自动提供）；缺失或跨站均 403，不扩大 API CORS。
- 错误统一 `{error,code}`：未配置503、未登录401、非管理员403、格式400/415、超过1 MiB JSON413、资源404、修订/slug/媒体状态冲突409、数据库或存储暂不可用503。后台响应均 private,no-store，数据库原始错误/密钥不会返回客户端。
- 富文本严格拒绝不支持节点、标记与属性；不执行 HTML。标题1–200字、slug小写 ASCII kebab-case ≤120字、摘要≤1000字、分类1–60字。图片/视频节点必须携带服务端媒体 UUID 和对应 storageKey；src 仅编辑预览。封面必须为上传图片的键。

## 尚待真实云验证

没有填入/读取真实凭据，没有真实写入、上传、部署或推送。用户接入后需要验证：SQL实际权限、管理员登录与刷新、非管理员/API越权、保存发布撤回、浏览器跨域预检和手机 File 直传、HEAD完成登记、公开快照与旧slug缓存刷新、R2重复PUT拒绝。PGlite验证实际SQL事务和角色权限，不能替代Supabase托管角色/REST及浏览器↔R2链路实测。

官方参考：[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)、[getUser](https://supabase.com/docs/reference/javascript/auth-getuser)、[数据库函数权限](https://supabase.com/docs/guides/database/functions)、[R2 S3兼容表](https://developers.cloudflare.com/r2/api/s3/api/)、[AWS签名头配置](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/)。
