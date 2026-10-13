# 工作交接

## [Codex]

### 当前目标 + 成功指标
解释账号/权限/发信分工，修复网站把Supabase otp_expired误提示为链接缺参数的问题，兼容默认邮件并明确发送限流。代码修复与本地验证已完成；真实新邮件/登录仍待用户验收。

### 当前阶段
done

### 重要文件和近期决定
- 仓库zhiyu，feat/first-version；此前bc28875已推送。本次按持续GitHub推送授权提交此分支，不创建PR或代改云控制台。Vercel需最新版本为Production，push不等于正式域名已更新。
- 用户实际失败地址含query与fragment error=access_denied/error_code=otp_expired：Supabase在到达本站前已拒绝。用户不确定是否点最新邮件，多次申请但邮箱只有两封；不能断定过期原因或实际限流。官方当前默认SMTP整个项目2封/小时，recover同用户60秒间隔，可解释没有新邮件，需actual响应/Auth日志确认。
- 账号真实存于Supabase Auth数据库；ADMIN_USER_ID只限制单管理员权限，邮箱密码验证/getUser由Supabase。当前不是多管理员系统：将来新增管理员应DB角色/权限，不扩环境ID列表，本次不擅自改权限模型。发信是Supabase resetPasswordForEmail，Vercel只托管网站；邀请与恢复属于同一Auth账号，没有额外邮件系统。
- src/lib/auth/account.ts严格兼容TokenHash、PKCE code、默认invite/recovery会话片段；readEmailCallback及resolveEmailCallback优先处理两通道provider错误，不回显描述/凭据。Confirmation GET只展示，点击才同源POST分别verifyOtp/exchangeCodeForSession/setSession，再fresh getUser+exactADMIN_USER_ID；错误身份签出。
- account-forms.tsx在浏览器读取fragment后清除hash，用ref缓存首次合并结果抵抗StrictMode effect replay，取消旧queuedstate。root-email-callback.tsx把SiteURL根页默认控制台邀请回跳只转本站/auth/confirm，白名单参数，不接受外部next。密码POST仍仅当前已验证管理员updateUser，无客户端UID。
- recovery.ts包装原Supabase请求，真实429或rate代码显示限流，其他错误不回显provider详情；开始每次请求清除之前sent提示，不把提交次数说成新邮件数。
- Supabase SiteURL=https://zhiyu-beta.vercel.app，Redirect allowlist /auth/confirm；默认邮件已兼容，不必替换模板。已使用TokenHash模板者可保留；若首次新链接被邮件扫描预取消耗，模板是可选保护。docs/admin-account.md已改为简单地址设置与诊断步骤，connect-live同步。
- namespaced env不变：NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY，zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY；ADMIN_USER_ID独立。优先带namespace，旧名兼容，公开env字面读取。POSTGRES/JWT集成变量不用。Supabase项目mgbahqnxoraqmljibsrc。
- R2独立桶blog，prefix blob/，public https://pub-d631369681144c86b273231bd9377fe0.r2.dev；旧共享johnyehyo勿动。SQL/R2另一聊天变动已整合。空schema用query-bootstrap.sql，已有initial时query-maintenance.sql，勿重复执行。
- .idea为用户生成物，不读取/删除/提交；父目录原型不改。未读取.env.local/密码/密钥，未消费用户真实token或代发邮件。

### 已完成
- 博客既有reader/后台维护功能保持：列表搜索/筛选/分页/删除，编辑保存/发布/撤回，图片视频File直传R2与素材复用；owner/revision/Origin/getUser/ready等守卫保留。
- 首次设密码/恢复流程及默认邮件回跳兼容、过期/发送限流准确反馈。旧链接不能代码复活，保留已有用户/UID，不重做SQL。

### 已运行的命令 + 结果
- 本次24files113tests、standalone typecheck、lint、production build、diffcheck PASS；无lint warning。新增回跳/权限/错误合并/邮件限流回归先RED后GREEN；恢复3tests最终复验PASS。
- 只读review_account_flow发现StrictMode清hash重读/fragment错误被query凭据忽略，已修正并复审无遗留；新增recovery限流与sent清除亦无问题。未重复其全套测试或访问provider。
- 实际本地Next dev3104/AppRouter StrictMode：根邀请合成fragment→确认页、hash清空但待确认状态保留；querycode+fragmentexpired提示过期/无按钮；PKCE合成code点击发正确body；390/768px无横溢出/no-referrer。确认POST拦截合成401，不调用provider。截图/tmp/zhiyu-default-expired.png。
- 实际RecoveryRequestForm+真实SDK，浏览器仅拦截recover：首个200显示请求提交，第二个429显示限流/旧success移除/provider原始详情不显示。合成admin@example.test，没有真实邮件。browserdefault/mail均关闭，dev sessions6683/81606均停止；最终生产构建完成。
- 既有97tests后台/SQL/R2安全与临时真实组件fixture验证已通过，不重新全库调查；不能以合成测试称云写入通过。

### 已知问题和“请勿重读”列表
- 账号/守卫/变量适配/SQL/维护已充分调查，相关代码不变勿重读全库。历史setup原因是旧Production/作用域/ADMIN格式，用户已看到登录页。
- R2草稿媒体凭公共URL可访问，暂无转码/内容扫描/孤儿清理。
- Node用Codex bundled进程PATH；Python CA问题用curl保持TLS；不改系统。临时QA在/tmp勿提交。

### 待验证 / 证据缺口
真实SMTP限流与过期原因未取得日志，provider配置未读取。最新Production、真实新邮件、默认PKCE原浏览器cookie、设置密码后登录、DB文章写入/R2真上传待用户验收。

### 下一步任务
让Vercel最新代码成为Production。先停止连续申请，若用默认邮件已收两封，等待发送限额恢复；再在正式网站原浏览器只申请一次，按收到时间用最新邮件立即打开。provider已拒绝的旧邮件不可复用。若新邮件首次立即otp_expired再查邮件扫描/有效期，按实际请求反馈局部诊断。保留用户UID，暂不增加配置/切SMTP/改多用户角色，除非用户明确推进。

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
