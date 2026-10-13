# 工作交接

## [Codex]

### 当前目标 + 成功指标
用户同浏览器确认邮件仍LINK_INVALID，后续重点击邮件otp_expired。本轮已完成准确错误诊断与域名错位防护，真实Next HTTP Cookie独立复现PASS；原线上第一次交换失败根因仍未取得细分证据，不能称线上已修好。准备推送后由用户最新Production单封邮件验收，既有relay/R2验证保留。

### 当前阶段
done

### 重要文件和近期决定
- confirmation-error.ts按SDKname/status/code安全分类：VERIFIER_MISSING/MISMATCH、LINK_EXPIRED、network、429、upstream5xx；原始provider描述/token不回显。EmailConfirmationForm只给已知安全错误编号附文案，用户可截图不用F12。SDK AuthRetryableFetchError有真实5xx时应服务故障不是network，review发现后以实际SDKclass回归修正。
- site.ts在非固定*.vercel.app申请页先redirect已有NEXT_PUBLIC_SITE_URL有效HTTPS根域（默认既有zhiyu-beta），本地/customhost不强跳；recovery API也在创建verifier/发信之前拒绝非固定vercelhost409USE_CANONICAL_SITE。避免同浏览器不同域名cookie错位；这是防护，不是已证用户原故障原因，不新增必须env。
- 新邮件默认验证在Supabase首次点击消费邮件token，回站交换失败再点邮件会expired，不能以第二次报错倒推初次根因。原旧泛化LINK_INVALID掩盖具体原因；不让用户为补旧日志重复发信/点击。
- /tmp/zhiyu-auth-http-20261013独立最小Next webpack app复制必要生产handlers/SSR代码，合成env及仅test.supabase.co假HTTP/实际PKCE SHA challenge验证，实际HTTP SetCookie往返。没有真实凭据/邮件/用户token；不修改生产鉴权替身，fixture仅/tmp。
- 用户询问server relay是否仍用本地网络：说明线上请求分两段，用户电脑→Vercel仍走本地网，但Vercel→Supabase由云服务器发起；localhost的Next后端也在电脑，仍使用本地网，不获得该网络路径变化。代理仅替换已超时的浏览器直连Supa一段，不能保证用户→Vercel或云上游不超时；不因此更改代码/部署区或增加配置。
- 仓库zhiyu，feat/first-version；9c5514f此前R2文档已推送。本轮按持续GitHub授权提交Auth relay，不建PR、不代改云控制台、不代输入密码或发邮件。.idea为用户文件，不读/删/提交；父目录原型不改。
- 新增POST /api/auth/login、/api/auth/recovery，复用getServerSupabase SSR Cookie客户端；handleAuth先Origin、hasWriteConfig，严格受限JSON。login signInWithPassword后fresh getUser核exact ADMIN_USER_ID，失败/外人signOut local，固定/admin；不接受用户ID或外部redirect。recovery只接email，从request origin生成/auth/confirm并保留PKCE verifier Cookie；无注册、无自动反复发信。
- LoginForm与RecoveryRequestForm不再直接调用浏览器Supabase，改同源adminRequest。登录/申请由Vercel→Supabase，降低用户浏览器直连网络影响，不保证上游完全不超时。recovery status0显示MAIL_NETWORK_UNAVAILABLE（发送结果未确认，先看邮箱）；真实429仍MAIL_RATE_LIMIT，其他provider详情不回显。
- 用户给了recover具体部署地址，之后确认无Response，Console net::ERR_TIMED_OUT，已确定本次是浏览器连接超时，不能再让其等小时quota来解决该请求。当前具体部署URL不一定是Preview，也可能Production独立URL；操作应统一https://zhiyu-beta.vercel.app/admin/password。不能把其他域名发起的PKCE回跳强改正式域名而丢verifier。
- Supabase SiteURL已用户改回正式域名；allowlist需https://zhiyu-beta.vercel.app/auth/confirm，实际值未读取。默认邮件的点击仍先到Supabaseverify；若这一步也网络失败，可选已有TokenHash模板将验证放本站。旧localhost/已消费邮件不可复用，不反复邀用户/重做SQL。
- 用户ADMIN_USER_ID已明确同步新用户到本地.env.local与Vercel Production（未读值）；新变量需新Production部署。Users截图已有成功登录记录，不能视为博客Cookie/密码设置已完成。当前单管理员，后续多人应DB角色，不本轮改权限模型。
- Env名字保持NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY、zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY，ADMIN_USER_ID单独；namespace优先、旧名回退、公开字面读取，POSTGRES/JWT变量不用。未读取输出.env.local/真实凭据。
- 实际默认邮件quota项目2封/小时，recover同用户60秒；旧次限流证据有效，但与这次网络超时分开。不要承诺精确reset或盲目改SMTP。
- R2独立blog桶/blob prefix/https://pub-d631369681144c86b273231bd9377fe0.r2.dev已真实验证。旧johnyehyo桶勿动。SQL另一聊天已整合，query-bootstrap/query-maintenance按schema现状，不重复。

### 已完成
- 登录/恢复邮件同源server relay、无HTTP网络反馈、凭据校验与文档说明。
- 既有确认invite/recovery code/session/hash流程与密码设置保留：GET展示，POST验证/交换，再freshgetUser exactUID；两通道error优先，fragment移除且缓存防StrictMode误读。素材/上传/文章功能保持。

### 已运行的命令 + 结果
- 本轮27files124tests、typecheck、最终lint无warning、production build/diffcheck PASS。错误分类和canonicalAPI/站点helper先RED→GREEN；实际SDK RetryableFetchError503误分类由review发现，补RED回归修正GREEN。独立review_account_flow最终无遗留。
- 真实Next HTTP+SSR+SDK/合成Auth外部HTTP：申请200返回verifierCookie，正常同源Cookiejar确认200返回sessionCookie；不带Cookie409VERIFIER_MISSING；二次申请覆盖旧challenge409VERIFIER_MISMATCH。结果/tmp/zhiyu-auth-http-20261013/results.json只布尔/状态，不包含Cookie/token。fixture server97255/2801/55199均停止。
- 实际产品production3102以不同vercel Host只读请求/admin/password返回307到https://zhiyu-beta.vercel.app/admin/password，localhost仍200。起初curl走系统代理返回308干扰，--noproxy '*'直连local验证通过；不据此改生产网络。产品server34195/24033停止，最终构建完成。无真实POST发信或账号确认。
- 新relay tests先RED缺路由/status0错误分类→GREEN；最终26files121tests、typecheck、lint（无warning）、production build PASS。Cookie3tests最后复验PASS；临时实际mail/login未执行。
- 实际SSR+SDK、仅mock外部HTTP和Next Cookie store：登录Cookie落盘、错UID Cookie清除、recovery PKCE verifier Cookie→confirm code exchange通过。安全测试有跨origin/空体/额外redirect拒绝、密码不回显、真实provider限流与网络分类，无自动mail重试。
- 独立review_account_flow只读检查无Critical/Important/Minor遗留；实际SMTP/部署Cookie/Vercel网络不在本地证明范围。
- localhost3102生产编译路由login/recovery GET405、同源空body400、跨origin403，均SDK调用前拒绝；浏览器申请页/登录页正常（email/password字段存在，无溢出），没有提交真实表单。relayTab已关闭，server16985停止。
- Supabase recover无发信OPTIONS真实200，允许origin*与所需Auth headers；不等于用户Chrome当前TCP连接成功。无POST云发信，无真人凭据或token访问。
- 真实R2已有证据不重做：PNG PUT200/HEAD校验/公开GET200字节匹配与显示；MP4 1128375bytes PUT/HEAD/GET匹配，Range206，浏览器960x540/5.055秒完整播放无error。media表HEAD200含original_name。报告docs/storage-validation.md及/tmp/zhiyu-storage-*.json。

### 已知问题和“请勿重读”列表
- 登录/relay/Cookie/权限与R2真实独立链路已查，未改时不重读全库/重复上传。Cua Supabase控制台网络曾关闭，没读改provider配置，不绕过dataURL策略。
- R2公共草稿媒体知道URL可访问，暂无转码/内容扫描/孤儿清理；原文件播放依浏览器支持。测试owner00000000-0000-4000-8000-000000000000下PNG64c94614-63bb-4ed1-b766-4edc9fc246fd、MP4f25d8a92-6447-4097-8fa1-d0c53448a812保留；此前63002333/ada7640c失败PNG是否存在未核，无删除。
- 临时cloud探针已从src移除，仅/tmp/zhiyu-storage-check-20261013，不提交/不把替身称正式登录成功。Node用Codex bundled进程PATH，curl保持TLS验证；不改系统。

### 待验证 / 证据缺口
原线上确认为何失败仍未确定，旧返回LINK_INVALID无法反推；用户说同浏览器，但两次域名/实际verifierCookie是否存在及provider详细code未证。本地完整HTTP Cookie正常不等于部署Cookie被浏览器接收；云端最终session/设密码/登录/上传发布待用户验收。不要把诊断修复和canonical防护称线上根因已解决。

### 下一步任务
按持续授权提交并推送本轮代码，核对远端SHA。用户最新Production后从固定/admin/password只申请一次最新邮件（有quota时），回跳后及时一次确认；若失败直接截图新安全错误编号即可定位，不重复点旧邮件。保留UID/账号/SQL/SMTP，不新增多用户角色或再重做已通过独立R2验证。

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
