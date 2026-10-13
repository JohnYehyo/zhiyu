# 工作交接

## [Codex]

### 当前目标 + 成功指标
等待邮件限流期间核对图片视频接入，验证真实R2签名上传、HEAD、公开访问与播放，不把组件/合成测试称为正式后台登录验收。本轮独立存储验证完成；正式网站从登录到上传发布仍需用户验收。

### 当前阶段
done

### 重要文件和近期决定
- 仓库zhiyu，feat/first-version，8132143代码已推送；本轮没有产品代码缺口，新增docs/storage-validation.md保存真实验证证据。按此前GitHub推送授权交付文档/交接，不创建PR或代改云控制台。Vercel仍需最新Production，新变量只对新部署生效。
- 上传已接入：PostEditor图片/视频/图片封面入口→POST /api/admin/media→XHR原始File PUT→POST complete→R2 HEAD校验type/length→ready→正文/封面；已有素材可复用。签名300秒，Content-Type/length/If-None-Match不可覆盖；正式API仍handleAdmin/getUser/exactUID/Origin。
- R2独立桶blog，prefix blob/，公共https://pub-d631369681144c86b273231bd9377fe0.r2.dev；旧共享johnyehyo桶勿动。正常Next运行时加载本地配置做诊断，只输出布尔/状态，未读取显示.env.local/真实密钥。真实Supabase media schema仅HEAD，未读取数据内容、未写DB。
- 真实测试仅新测试对象，固定测试owner为00000000-0000-4000-8000-000000000000，元数据在内存，不绕过正式API鉴权。不上传用户私密文件、不发邮件或操作用户会话。PNG是合成1px/68bytes，MP4为公开MDN花朵示例1128375bytes。不要把本次独立SDK/存储测试称为Vercel完整验收。
- 已确认的测试对象保留在blob/测试owner/：64c94614-63bb-4ed1-b766-4edc9fc246fd.png、f25d8a92-6447-4097-8fa1-d0c53448a812.mp4。此前失败PNG63002333-e061-4a1e-853c-c4c38f6cd412.png、ada7640c-a9b4-408e-9bd2-a792e2ea38bc.png可能存在，状态未核；无对象删除，不动用户媒体。
- 用户ADMIN_USER_ID已据其确认同步为新用户（本地.env.local、Vercel Production），不再问是否同步、不读取值。最初Accept invitation成功会话回跳localhost无服务；新Users截图已有成功登录记录，仍不证明博客cookie/设置密码成功。保留该UID/账号，不反复重邀或重做SQL。
- 用户确认SiteURL保存后回到localhost，现手动改正式域名；回退原因未知。新Reset邮件曾发成功但也回localhost，随后重复点产生otp_expired。现在实际MAIL_RATE_LIMIT，默认SMTP整个项目2封/小时、recover用户60秒间隔；十几分钟未必恢复，不承诺精确reset，暂停连续发送，最后成功发信后留足1小时再只申请一次。
- SiteURL=https://zhiyu-beta.vercel.app；RedirectURLs需/auth/confirm。默认邮件code/session与TokenHash均支持；根页邀请桥接到本站确认页。provider错误两通道优先，fragment读后清除并缓存抵抗StrictMode；同源POST交换/验证再fresh getUser核UID，密码只当前已验证管理员updateUser。自定义模板可选，不新增邮件系统/公开注册；多管理员将来应DB角色，本轮不改。
- env名称不变：NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY；zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY；ADMIN_USER_ID独立，namespace优先/旧名回退。公开env字面读取；POSTGRES/JWT集成变量不用。Supabase项目mgbahqnxoraqmljibsrc。
- SQL/R2另一聊天变动已整合；空schema query-bootstrap.sql，已有initial query-maintenance.sql，不重复执行。.idea为用户生成物不读/删/提交；父目录原型不改。

### 已完成
- 原reader/后台稿件搜索筛选分页删除、编辑保存发布撤回、素材库/上传/导航保护保持；owner/revision事务/公开快照/ready媒体/Origin/getUser防线保留。
- 真实独立R2图片视频上传与公开读取/播放验证，媒体表所需列可用。记录docs/storage-validation.md；临时探针已移出源码，不随应用测试访问cloud。

### 已运行的命令 + 结果
- 最新常规npm test：24files113tests PASS（清除所有临时cloud探针后）。产品源码未改，不重复无关build/lint；此前8132143 typecheck/lint/build PASS。
- 真实配置runtime ready且blog/blob/public一致；不存在随机对象HEAD返回null，正式https://zhiyu-beta.vercel.app与http://localhost:3000 OPTIONS均204，origin/PUT/content-type/if-none-match允许。
- 真实Supabase media表HEAD HTTP200，包括original_name等所需列，零行内容读取/无DB写入。
- PNG签名PUT200→真实app completeUpload的HEAD/内存ready通过→公共GET200/SHA字节一致；浏览器imageLoaded=true。
- MP4签名PUT与HEAD确认通过；公开下载曾TLS35中断，只读重试后HTTP200/SHA一致；既有视频重新completeUpload HEAD复验PASS，无重新上传。Range bytes0-31返回206/32bytes/正确Content-Range。
- CUA独立localhost3105播放从真实公共R2取数据，视频960x540/5.055秒/readyState4/currentTime=duration/error=null；浏览器与server42232已关闭。
- /tmp/zhiyu-storage-probe.json、storage-upload.json、media-schema-probe.json、storage-video-head.json、storage-video-public.json与Range文件留安全证据。临时三个probe已复制到/tmp/zhiyu-storage-check-20261013再从src删除；移回需明确临时用途，不提交。早期test-mode故意排除env.local的假缺配置已排除；本机ffmpeg依赖损坏，未改系统，改用MDN视频。
- 既有Auth113tests、独立review回跳/错误合并/限流通过；维护SQL/素材/上传组件fixture既有验证不重复。仅成功独立存储检查不足以声称正式云后台端到端成功。

### 已知问题和“请勿重读”列表
- 上传入口/SDK签名/CORS/media schema/真实存储已确认，未改时勿重做全库调查或重复上传测试对象。登录仍由用户完成，不能测试替身绕过正式权限。
- R2公共草稿媒体知道URL可访问；暂无转码/内容扫描/孤儿清理。视频原文件格式播放仍依浏览器支持，本轮MP4已验证。
- Node用Codex bundled进程PATH；Python CA问题用curl保持TLS；网络偶有TLS/连接中断，不关闭证书验证。不改系统依赖。
- CUA控制台URLConfiguration直接访问连接关闭，未读/改provider值，勿当云配置已自动核实；临时错误dataURL受策略阻止，不绕过。

### 待验证 / 证据缺口
Vercel Production R2变量未读取核验；当前真实R2成功是本地配置。用户需完成新邮件正确回跳/cookie/设密码/登录后，在正式编辑器上传→保存→刷新→发布→公开文章验收。已据用户修SiteURL，Redirect允许列表与回退原因尚未实际确认。

### 下一步任务
等待邮件额度恢复由用户原浏览器在正式/admin/password只申请一次最新邮件；若仍localhost查SiteURL/allowlist/模板实际值，不再改UID/SQL或猜发送失败。登录正式后台后优先验证图片/视频保存发布与Vercel变量，不重做已验证的真实独立R2链路。测试对象仅保留证据，若需清理先确认路径范围与存在状态，不删除其他媒体。

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
