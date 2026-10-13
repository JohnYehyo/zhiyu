# 工作交接

## [Codex]

### 当前目标 + 成功指标
用户要求完全对齐Vercel Supabase集成注入的zhiyu命名空间。代码/模板/docs优先使用NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY与zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY，旧无前缀变量兼容回退，secret仅server。已有后台与SQL不重做。

### 当前阶段
done

### 重要文件和近期决定
- 本轮命名修正已本地提交；SSH22及备用443均Connection closed，HTTPS无已登录凭据，gh auth status未登录。推送未完成，Vercel尚未获得本轮变量适配。不要声称已上线；恢复直接检查Git ahead状态并重试git push，勿重做代码或索取聊天密钥。
- 最新配置对齐用户原样提供的Vercel变量：NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY，zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY；带zhiyu非空优先，publishable/secret优先同namespace旧类key，再回退无namespace旧配置。所有reader/browser/server/proxy/service统一publicSupabaseUrl。秘密只server服务使用，不输出值。
- 实际仓库zhiyu，feat/first-version；本轮569a21c维护、9b1ec28单query SQL与blog桶整合、a07ebe7搜索修复。本轮功能代码06a6033已按用户此前授权推送origin/feat/first-version并核对远端SHA；不创建PR或点击部署。
- Project URL https://mgbahqnxoraqmljibsrc.supabase.co；R2新独立桶blog（旧johnyehyo为其他应用，勿动），对象前缀blob/；public https://pub-d631369681144c86b273231bd9377fe0.r2.dev。不读.env.local/任何密钥。
- 用户在另一聊天“修复 Supabase SQL 并配置 R2”同步修SQL并确认新桶；其变动已核对保留整合。当前.docs/connect-live.md含最新步骤和中文凭据字段说明；.idea是用户外部生成物，不提交/不删除。
- 空schema用supabase/setup/query-bootstrap.sql单条DO初始化，包含两份迁移；已有initial但缺维护字段时只query-maintenance.sql。原migration保留，不重复执行。
- 删除文章用owner/revision行锁事务，cascade公开快照但保留共享media/R2文件。ready素材仅owner可列/复用；媒体JSON保留服务端身份，发布再校验。
- 搜索用转义imatch，避开PostgREST把LIKE中*改为%的行为；用户输入所有regex字符当字面字符，不暴露任意regex。

### 已完成
- 正式列表标题搜索、状态筛选、20条分页、刷新、取消过期查询、确认删除及删除后页码恢复。
- 素材库按图片/视频筛选和12条分页，展示文件名/大小/日期，选择插入正文/封面；新上传保留原文件名。
- 原上传流程继续签名File PUT/HEAD确认/ready登记；失败不插入，重试确认保留反馈。新上传清除旧成功提示。
- 独立review /root/review_maintenance检查8b45fa6..9b1ec28：owner/revision、private素材、SQL/权限通过，唯一literal*缺陷修复a07ebe7后复审Yes，无Critical/Important遗留。

### 已运行的命令 + 结果
- 本轮变量命名更新：新增5项先RED确认只namespace配置不识别及service取错旧值，GREEN；全套19files94tests/typecheck/lint/build/diffcheck PASS；独立小范围review PASS。不读取.env.local/真实云值，自动注入/真实登录链路仍待部署验收。
- 最新npm test：18files89tests PASS；typecheck/lint/build、diffcheck PASS。SQL实际PGlite事务与prepared-query，SDK实际查询编码、上传File/headers均覆盖。
- 新增SQL4、query3、SDK2、页码/UUID/搜索边界等均RED→GREEN；原权限/发布/上传安全测试保留。
- 浏览器使用仓库真实PostList/PostEditor/MediaPicker代码，临时独立localhost3104测试接口，不改生产鉴权，不连接cloud：搜索/筛选/空结果/分页/删除取消确认通过；素材图片视频→正文→自动保存；图片→封面；实际FilePNG/613377bytesMP4→PUT→complete→ready/插入。故障PUT503/complete409不增加正文媒体，旧成功提示清除。
- 320/390/768/1024编辑布局无横溢出；390px列表与素材截图人工查看。fixture网络失败产生预期控制台错误，不算生产异常。
- 真实生产3102：admin/login200；未配置GETposts/GETmedia/DELETE503 NOT_CONFIGURED；跨站DELETE403 CROSS_ORIGIN。
- 已只读访问 https://zhiyu-beta.vercel.app/admin/login，200但显示真实后台尚未配置。

### 已知问题和“请勿重读”列表
- getUser+UID/Origin/private快照/ready校验和导航已确认，不重新全库搜索鉴权或原型。
- 公开R2草稿媒体凭URL可访问；无转码/byte扫描/orphan清理，已有披露。
- 系统npm找不到node，测试使用Codex bundled Node24.19.0，进程PATH临时调整，无系统安装。Python系统SSL CA问题用curl保持校验，不禁用TLS。
- QA脚本仅/tmp/zhiyu-maint-20261013，勿提交fixture/auth替身或以它证明真实cloud。截图同目录。本轮构建前已停止旧3102/session28967；新版构建已通过，启动预览可npm run start -- --port 3102；原预览（可能随环境切换停止，先检查）；3104离线QA/session83167已停止，browser maintenance已关闭。旧服务进程不可假定存活。

### 待验证 / 证据缺口
用户2026-10-13部署截图确认3f34608/06a6033均Ready但为Preview，蓝色Production仍fbe145a；不能因Gitpush成功就称正式域名已更新。已说明最新部署菜单Promote to Production或配置生产分支；未替用户点击发布。
用户已确认初始没有三个业务表、CORS仅localhostGET，另一聊天已给修复SQL/R2说明。真实Supabase执行、管理员邮箱UID/keys、Vercel变量Redeploy、blog CORS、手机R2跨域FilePUT/HEAD、登录刷新、托管公开缓存仍未确认。

### 下一步任务
命名空间配置完成：新增5项行为测试RED→GREEN，最终94tests/typecheck/lint/build/diffcheck PASS，/root/review_env_names只读review PASS。首先恢复GitHub网络后git push同一已授权分支，本轮仍本地ahead1。用户按docs/connect-live.md配置并反馈结果后真实联调；入口/admin/login，不使用/admin/demo发布。不要重写后台。发现新的共享目录修改先校验Git/本文件并保留用户.idea/密钥。

## [Codex-cloud-setup]

### 当前目标 + 成功指标
解决用户粘贴SQL报 prepared statement 多命令错误；将接入配置从旧共享桶调整到用户新建 blog 桶；说明 R2_ACCESS_KEY_ID 来源。

### 当前阶段
done

### 重要文件和近期决定
- 用户已明确确认实际桶名 blog；桶内对象前缀仍为 blob，数据库与正文校验依赖该前缀，不改上传逻辑。
- 用户再次确认没有blob桶，先前是笔误；已说明R2_BUCKET_NAME=blog、R2_KEY_PREFIX=blob，后者是对象路径前缀，不需要创建同名桶或预建目录。
- 已解释blob是Binary Large Object的常见简称，本项目用作媒体对象路径约定，并非R2特殊关键字或平台要求；当前数据库storage_key约束和应用校验绑定blob/，改名须同步调整，未请求或执行改名。
- 账号 1b78820da96cc4165361c9f7be4d3099；新公共URL https://pub-d631369681144c86b273231bd9377fe0.r2.dev。zhiyu/.env.example、cloud-setup、connect-live、首版spec已同步。未读取或修改.env.local/真实密钥，未修改Vercel环境。
- 原始迁移保持不变；supabase/setup/query-bootstrap.sql 单DO合并两份迁移，空博客schema执行一次，存在同名表则拒绝；query-maintenance.sql仅用于已执行初始迁移但缺维护字段的项目。bootstrap后不再执行maintenance或原迁移。
- R2专用Token创建成功页显示Access Key ID与Secret Access Key；Secret离开后不能再次查看，缺完整一对时创建仅授权blog的新Token，不撤销其他应用Token。
- 用户截图的中文标签已确认：上方“访问密钥 ID”对应R2_ACCESS_KEY_ID；下方“机密访问密钥”对应R2_SECRET_ACCESS_KEY。已补入connect-live.md；不读取或记录截图密钥值。
- Git会话期间出现外部提交569a21c，包含维护功能、本轮接入文档和setup-sql.test.ts；本轮未自行commit/push/PR/部署。SQL文件仍未跟踪，勿遗漏提交。

### 已完成
用PGlite db.query复现原错误，确认未建表；新脚本通过prepared-query建完整schema与增量升级，确认私有表及函数权限、重复初始化保留已有数据。可复制脚本与接入步骤已保存。

### 已运行的命令 + 结果
- vitest run src/lib/server/setup-sql.test.ts src/lib/server/maintenance.test.ts src/lib/server/r2.test.ts：10/10 PASS。
- vitest run：18files、89tests PASS。
- tsc --noEmit：PASS；eslint .：PASS；next build：PASS；git diff --check：PASS。
- Node使用Codex bundled runtime，仅进程PATH调整。没有真实Supabase执行或真实R2上传验证。

### 已知问题和“请勿重读”列表
- SQL多命令报错及单DO适配已复现和验证，不需重查原迁移/上传框架。
- 旧johnyehyo桶是其他应用使用的共享桶，本项目改用blog；不要修改或清理旧桶。

### 待验证 / 证据缺口
用户尚需在Supabase运行新脚本，在Vercel或本地配置完整凭据、新桶/公共地址并重新部署，在blog桶设置docs/r2-cors.json；真实登录、上传、发布链路尚未确认。

### 下一步任务
根据用户真实执行结果处理云连接问题；已有维护功能的交互验证与审查状态保留在原Codex段，不能凭本轮SQL配置任务完成声称整个云联调完成。

## [reader]

### 当前阶段
done

### 重要文件和近期决定
src/lib/content/document.ts与RichContent安全渲染，mediaUrl仅本地assets或安全blob键。公开页面已正常格式化，手机hero正常流；无云公共配置显示明确示例，配置齐全查询失败显示错误。

### 已完成
阅读任务9640d93经独立审查；后续云适配和布局修复已合入当前功能分支。最终验证使用Codex段的71tests与浏览器证据。

## [services]

### 当前阶段
done

### 重要文件和近期决定
getUser/ADMIN_USER_ID守卫；服务端secret与新旧别名；SECURITY INVOKER owner/revision事务和私有权限。R2随机owner/media UUID键，path-style账号endpoint，签名类型/长度/If-None-Match，HEAD精确登记ready；浏览器不手工设置Content-Length。

### 已完成
服务任务22249c1经独立审查，实际PGlite事务测试保留。真实托管与CORS验收仍属Codex段证据缺口。

## [admin]

### 当前阶段
done

### 重要文件和近期决定
SaveCoordinator唯一写队列；Tiptap立即SSR渲染关闭、受限节点/属性、序列化保留媒体身份。demo仅当前页试写，不云保存/上传/发布；备份JSON可下载。离开保护依据相对基线实际变化，兼容锚点与无前史返回。

### 已完成
后台bf7cf61，集中修复2f6bf93与导航边界9c41602均经复审。最终所有检查与当前生产预览见Codex段；不依赖临时Agent进程或scratch报告恢复。
