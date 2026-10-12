# 芝语首版设计

用户已批准：手帐风格、独立文章、手机富文本后台，Next.js + Vercel + Supabase + R2。在本 clone 初始化首版供 Vercel 导入；没有服务密钥时可部署示例阅读/编辑体验，真实写操作失败关闭。

## 约束
- 名称芝语；六色 #81B5DF #F5B1AC #A9BD88 #F7D5DE #F6C66F #A4CEC4。参考父目录 scrapbook.html、styles.css、article.css，只迁移手帐风格。普通导航图标用 lucide-react，后台克制、手机可用。
- 项目 /Users/johnyehyo/mine/code/web/blob/zhiyu，origin git@github.com:JohnYehyo/zhiyu.git；clone 为空、master 无历史。就地初始化，不改父目录原型，不创建/发布外部项目，不推送或创建 PR。完成后可准备本地首版 commit，推送由最终用户授权。
- R2 bucket johnyehyo，prefix blob；endpoint 为账号主机（不带 bucket）；公共 URL https://pub-5ae729e1d9de4ed79a75a0afd0101d49.r2.dev。Supabase URL https://mgbahqnxoraqmljibsrc.supabase.co 已确认主机响应401（无 API key预期），密钥未知。
- 本地 .env.local 已设置公开地址与桶/前缀，密钥空；禁止打印/读取真实密钥，使用 .env.example 名称；不得提交 .env.local。
- 支持本地字体/SVG/3秒 MP4 示例；未配置数据库时显式标识示例内容。数据库配置齐全却查询失败，不冒充示例成功或吞掉故障。
- 后台无公开注册，只有 ADMIN_USER_ID 指定账号可写；验证 Supabase getUser，不能仅信 getSession 或客户端状态。
- 真实草稿与公开发布快照分表；anon/authenticated 不允许读取草稿、媒体表或执行发布 RPC。所有写入经过鉴权接口。
- 发布事务保留预期 revision，冲突409；不让自动保存的草稿改动直接进入公开正文。
- 媒体签名直传，key 由服务端生成并包含 blob/；完成后 HEAD 检查类型/大小并登记 ready，发布时校验引用的媒体属于管理员且 ready。
- 内容使用受限富文本 JSON，安全 React 渲染，不执行原始 HTML或危险链接。图片按原比例展示；手机单列；视频 controls/playsInline，不自动播放。
- 不凭没有运行的真实云链路声称接入完成。真实云测试、SQL应用、密钥和CORS仍由用户后续接入。

## 路由与组件
- / 首页，/posts/[slug] 独立阅读，/archive 归档，/album 相册，/about 关于；网站导航含写给你链接与低调管理入口。
- /admin/login 管理员登录；/admin 稿件列表；/admin/posts/new 和 /admin/posts/[id] 编辑；/admin/demo 只做本地编辑预览、不发布。
- 编辑器有标题、摘要、分类、slug、封面、格式工具、上传进度、图注、草稿保存状态、预览/发布。发布先保存最新正文，写请求串行，冲突明确提示。
- API /api/admin/posts GET/POST；/api/admin/posts/[id] GET/PATCH；/publish 和 /unpublish POST；/api/admin/media POST创建上传；/[id]/complete POST完成；服务配置未就绪返回503、未登录401、非管理员403。

## 数据接口
src/lib/types.ts 定义 RichNode {type:string;text?:string;attrs?:Record<string,unknown>;marks?:{type:string;attrs?:Record<string,unknown>}[];content?:RichNode[]}。
PostDraft {title:string;slug:string;excerpt:string;category:string;coverKey:string;content:RichNode}。
Article extends PostDraft {id:string;publishedAt:string;demo?:boolean}。
DraftPost {id:string;revision:number;draft:PostDraft;publishedRevision:number|null;publishedAt:string|null;updatedAt:string}。
MediaRecord {id:string;storageKey:string;mimeType:string;size:number;status:'pending'|'ready';alt?:string}。
src/lib/posts.ts getPublishedPosts():Promise<Article[]>、getPublishedPost(slug):Promise<Article|null>；src/lib/media.ts mediaUrl(key):string。
API POST稿件body=PostDraft；PATCH body={revision:number,draft:PostDraft}；发布/撤回body={revision:number}；成功稿件response={post:DraftPost}，列表={posts:DraftPost[]}；错误={error:string,code?:string}。
上传初始body={filename:string,contentType:string,size:number}；response={media:MediaRecord,uploadUrl:string}；complete response={media:MediaRecord,url:string}。content image/video attrs 使用 mediaId/storageKey/alt/caption/src，src仅编辑展示，发布快照中的storageKey来自已验证media。

## 验证
安全内容/上传key/管理员/修订冲突等业务测试；npm test、typecheck、lint、build；无密钥API失败关闭；真实浏览器检查首页/文章/搜索过滤/手机导航/登录配置提示/编辑器预览与媒体布局。最终 reviewer 检查草稿泄漏、跨用户写、假成功、并发保存、发布校验。新代码使用当前稳定依赖并锁版本。
