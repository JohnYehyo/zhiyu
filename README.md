# 芝语

一本记录日常的手帐博客。Next.js App Router 提供独立文章、归档搜索、相册与手机编辑后台；Supabase 保存私有草稿和公开快照，Cloudflare R2 存放图片与视频。网站沿用本地字体和手帐素材，无外部字体请求。

## 本地运行

需要 Node.js 22 和 npm。首次运行：

```bash
npm ci
cp .env.example .env.local
npm run dev -- --port 3100
```

打开 `http://localhost:3100`。不要提交 `.env.local`。没有 Supabase 公共配置时，阅读端显示明确标记的本地示例；`/admin` 显示配置说明，`/admin/demo` 可试写和预览。示例仅在当前页面保留，刷新重置，没有云端保存、上传或发布。数据库已配置但查询失败时显示错误，不冒充示例成功。

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run start -- --port 3100
```

`build` 后再运行 `start`。当前实现可以本地测试和构建；真实 Supabase/R2 登录、迁移应用、文件上传及托管部署尚待用户配置后的实测。

真实网站的逐项配置请看 [连接真实后台](docs/connect-live.md)。

## 写作流程

1. `/admin/login` 使用预先创建的管理员账号，服务器验证指定 UID；没有公开注册。
2. 新建稿件，填写标题和分类。文章地址自动生成 ASCII slug，无需翻译中文标题。摘要、地址与封面在可展开的文章设置中。
3. 正文工具支持加粗、斜体、小标题、列表、引用和安全链接。上传图片/视频后可选择媒体填写说明与图注。图片 ≤20 MiB，视频 ≤200 MiB；浏览器是否能播放取决于文件编码，本站不转码。
4. 停止输入约 1.2 秒后保存草稿。请求串行，保存返回的 revision 只更新版本信息，不覆盖期间输入。发布等待最新内容保存完成，然后更新公开快照。
5. 修订冲突（REVISION_CONFLICT）时停止自动保存并保留本地文字。先下载 JSON 草稿备份，再重新打开服务器稿件对照；不自动覆盖另一版本。地址冲突、媒体未就绪等错误可修正后重新保存或发布。未保存内容或上传期间，同窗口站内链接与返回操作会提示确认，取消后继续编辑；新标签与页内锚点不受影响。
6. 列表支持按标题搜索、发布状态筛选与分页；删除需确认并校验修订版本，移除稿件与公开页面，保留可能共享的图片视频。编辑器可选择已上传素材作为封面/正文，无需重复上传。
7. 草稿修改不会改变公开文章，需再次发布。撤回会删除公开快照并保留草稿。

上传直接从浏览器 File PUT 到 R2；服务端验证 HEAD 后登记 ready。网络中断时可重试确认结果，未确认成功的媒体不会插入正文。R2 使用公共媒体桶，草稿媒体也可凭链接访问；详见服务接入说明。

## 接入与部署

- [数据库、权限、R2/CORS、API 契约](docs/cloud-setup.md)
- [Vercel 导入与发布检查](docs/deployment.md)
- [首版规格](docs/superpowers/specs/2026-10-12-first-version.md)

Supabase 配置名称与 Vercel 的 `zhiyu` 集成一致：`NEXT_PUBLIC_zhiyu_SUPABASE_URL`、`NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY`、`zhiyu_SUPABASE_SECRET_KEY`；同集成的 anon/service_role 也兼容。先读取带 `zhiyu` 的变量，同类非空 publishable/secret 优先，最后兼容无前缀旧变量。服务角色密钥仅在服务端使用。配置提示只显示就绪状态，不返回配置值。

主要目录：`src/app` 为阅读页、管理页与 API；`src/components/admin` 为编辑器和登录界面；`src/lib/admin` 为保存队列、内容序列化和上传客户端；`src/lib/server` 为服务校验与持久化；`supabase/migrations` 为权限和发布事务。
