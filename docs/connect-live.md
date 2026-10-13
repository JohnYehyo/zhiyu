# 连接 zhiyu-beta 的真实后台

目标网站：https://zhiyu-beta.vercel.app 。正式入口为 `/admin/login` 与 `/admin`；`/admin/demo` 始终只是本地试写。

## 1. 数据库

不需要“导入”入口，在 Supabase 项目的 **SQL Editor → New query** 粘贴 SQL 并 Run。使用 postgres 管理角色。

- 还没有博客三个表：只复制 [query-bootstrap.sql](../supabase/setup/query-bootstrap.sql) 的全部内容执行一次。它包含建表、权限、发布函数及维护功能，不再执行原来的两份迁移。
- 三个表已经由初始迁移创建，但还没有 `draft_posts.status` 和 `media.original_name`：只执行 [query-maintenance.sql](../supabase/setup/query-maintenance.sql)。
- 已经有这两个字段：无需再运行以上脚本。

`cannot insert multiple commands into a prepared statement` 表示执行入口把多条 SQL 当成一个预备语句。新脚本将操作包在单个 `DO` 语句中，整体成功或回滚。不要拆分函数中的分号，也不要追加其他 SQL 一起运行。初始化脚本发现任何同名博客表就停止，不删除或覆盖已有数据；出现 `BLOG_TABLES_ALREADY_EXIST` 时先确认表和字段状态。

执行后 Table Editor 的 public schema 应出现 draft_posts、published_posts、media；draft_posts 有 status，media 有 original_name。没有数据属于正常情况。也可另开 query 执行：

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('draft_posts', 'published_posts', 'media')
order by table_name, ordinal_position;
```

原始 `supabase/migrations` 文件保留给迁移工具；本地 PGlite prepared-query 已验证，仍需用户在真实 Supabase 执行确认。

## 2. 管理员

Supabase Authentication → Users 创建邮箱/密码账号并确认邮箱；复制该用户 UID。关闭公开注册，博客不提供注册入口。UID 填入 Vercel 的 ADMIN_USER_ID，邮箱和密码只在登录页输入，不提交仓库或聊天。

## 3. Vercel 环境变量

项目 Settings → Environment Variables，配置到实际使用的 Production 环境，随后 Redeploy。

| 变量 | 值或来源 |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | https://zhiyu-beta.vercel.app |
| NEXT_PUBLIC_SUPABASE_URL | https://mgbahqnxoraqmljibsrc.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase Project Settings → API Keys 中的 Publishable key |
| SUPABASE_SECRET_KEY | 同页的 Secret key，仅服务端 |
| ADMIN_USER_ID | 上一步用户 UID |
| R2_ACCOUNT_ID | 1b78820da96cc4165361c9f7be4d3099 |
| R2_BUCKET_NAME | blog |
| R2_KEY_PREFIX | blob |
| NEXT_PUBLIC_MEDIA_BASE_URL | https://pub-d631369681144c86b273231bd9377fe0.r2.dev |
| R2_ACCESS_KEY_ID | R2 token 创建后给出的 Access Key ID |
| R2_SECRET_ACCESS_KEY | 同次创建给出的 Secret Access Key，仅服务端 |

如果 Supabase 集成已经提供 NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY，可继续使用旧名，无需重复填写同类新变量。服务端密钥不能使用 NEXT_PUBLIC_ 前缀。

## 4. R2

Cloudflare R2 Object Storage → Overview → Account Details → API Tokens → Manage。创建 User API token（有对应权限时也可创建 Account API token），选 Object Read & Write，仅允许 blog 桶。

**R2_ACCESS_KEY_ID 在哪里看：**创建成功页的 S3 客户端凭据中，复制 **Access Key ID**；同一页的 **Secret Access Key** 填入 R2_SECRET_ACCESS_KEY。不是 Account ID，也不是 API Token 的 value。Secret Access Key 离开创建成功页后无法再次查看；若没有保存完整的一对凭据，创建一个仅授权 blog 桶的新 token 并保存两项。不要撤销其他应用使用的 token，不在聊天中发送密钥。

已确认新桶是 `blog`（不是 `blob`），S3 API 为 `https://1b78820da96cc4165361c9f7be4d3099.r2.cloudflarestorage.com/blog`。代码自动用账号主机作为 endpoint，并单独传入桶名，不需要新增 endpoint 环境变量。`R2_KEY_PREFIX=blob` 是桶内对象前缀，保留它以匹配数据库与正文校验。公共地址换为上表的新地址。

在 blog 桶设置 CORS，复制 docs/r2-cors.json。该文件包含准确网站 origin、必要本地测试端口、PUT/GET/HEAD、Content-Type/If-None-Match。

## 5. 验收

登录后创建一篇中文稿件，上传图片和视频并设置封面；刷新编辑器确认内容，发布后查看独立文章。修改草稿确认公开页仍为旧快照，再次发布才更新；已有素材可重复选入正文。搜索/状态/分页查找文章，撤回或确认删除后公开页不可读。删除文章不删除共享媒体。

当前代码与本地测试不能代替真实云验收。公共桶中的草稿媒体可凭链接访问；视频播放取决于编码，本站不转码。

参考：[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)、[Cloudflare R2 tokens](https://developers.cloudflare.com/r2/api/tokens/)、[R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)。
