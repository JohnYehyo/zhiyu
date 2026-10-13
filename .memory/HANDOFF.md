# 工作交接

## [Codex]

### 当前目标 + 成功指标
修复邀请管理员的首次设密码与过期邮件恢复；说明ADMIN_USER_ID只指定权限，会话才证明身份。代码已交付，云端真实邮件/登录仍需用户验收。

### 当前阶段
done

### 重要文件和近期决定
- 仓库zhiyu，分支feat/first-version；本次按用户此前GitHub推送授权提交。Vercel须将最新版本部署到Production；push不等于正式域名已更新。变量可同时选择Production/Preview作用域，Production Branch Tracking应对应此分支。
- 新增src/lib/auth/account.ts严格输入、/auth/confirm确认页面、POST /api/auth/confirm验证接口、/admin/password恢复/设置页面、POST /api/admin/password更新接口和account-forms.tsx；登录页新增首次设密码/忘记密码入口。
- 邮件GET只展示按钮，点击才同源POST verifyOtp；仅invite/recovery，再fresh getUser核对ADMIN_USER_ID，外人签出。重设密码复用handleAdmin，更新当前会话，不接受客户端用户ID。不开放注册，不使用service_role代设密码。
- 用户须在Supabase Authentication URL Configuration设置SiteURL为https://zhiyu-beta.vercel.app，allowlist /auth/confirm；Invite user及Reset password模板分别复制supabase/templates/invite.html和recovery.html。步骤见docs/admin-account.md。模板使用SiteURL/TokenHash，不使用默认fragment回跳。
- 旧邀请otp_expired且指向localhost；不能修复/复用旧链接。保留已有用户/UID，配置后在/admin/password用同一邮箱申请新恢复邮件→确认→设密码→后台。官方Auth源代码recover/verify支持已有未确认邀请用户的recovery。没有消费用户token、代发邮件、读取密码或.env.local。
- Supabase URL https://mgbahqnxoraqmljibsrc.supabase.co；配置名称保持NEXT_PUBLIC_zhiyu_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY及zhiyu_SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY，ADMIN_USER_ID单独设置；带namespace优先，无namespace兼容。公开env保持字面读取以支持Next内联；POSTGRES/JWT变量不使用。
- R2独立桶blog，prefix blob/，public https://pub-d631369681144c86b273231bd9377fe0.r2.dev；旧共享johnyehyo桶勿动。SQL/R2另一聊天修改已整合。空schema用supabase/setup/query-bootstrap.sql，已有initial时query-maintenance.sql，勿重复执行。
- .idea是用户外部生成物，不读取/删除/提交。父目录原型不改。

### 已完成
- 正式后台稿件搜索/筛选/分页/删除，编辑自动保存/发布/撤回；素材库复用与图片视频File直传R2，PUT→HEAD→ready登记，失败不插入。
- owner/revision行锁、公开快照、ready媒体校验与Origin/getUser/管理员UID防线；搜索按字面regex转义。
- 邀请确认/过期恢复/初次设密码流程与中文指南、两份可复制邮件模板。本次仅代码交付，未代改Supabase控制台。

### 已运行的命令 + 结果
- 本轮npm test：23files105tests PASS；typecheck PASS；lint PASS无warning；production build PASS。新账号测试覆盖GET不消费链接、POST过期/外站/错误UID/任意next拒绝、密码无会话/错误UID/不一致拒绝与合法会话更新。
- 独立只读review_account_flow：无Critical/Important/Minor，另跑账号3files8tests PASS；确认provider recovery支持未确认已有用户。实际SMTP/云模板/session cookie不属于本地验证结论。
- 本地production3102真实确认页/申请邮件页：390/768px无横溢出，no-referrer存在，错误/缺参数恢复入口正常。错误回应用浏览器仅本地拦截合成401；没有向Supabase提交验证令牌或发送邮件。截图/tmp/zhiyu-account-mobile.png；浏览器account已关闭，server session91774已停止。
- 既有后台验证97tests/build PASS；真实组件独立临时fixture测试列表/素材/上传故障/手机pad布局通过，不能替代云验收。安全与云读写API测试既有结果保留，不重做全库调查。

### 已知问题和“请勿重读”列表
- 身份守卫、变量适配、列表/媒体/SQL已充分调查；没有相关变更时勿重读全库。历史setup原因是旧Production+作用域/ADMIN格式，用户最新截图已经是登录页，不能据此断言实际登录成功。
- R2公共草稿媒体知道URL可访问；暂无转码/内容扫描/孤儿清理。
- node默认PATH不可靠，使用Codex bundled Node目录临时PATH；不改系统。Python CA问题改curl保持TLS校验。
- 临时QA/替身在/tmp，不提交；不可将离线合成测试称为真实云验证。

### 待验证 / 证据缺口
Supabase正式SiteURL/两份模板是否应用、邮件投递、确认后的真实cookie持久化、密码登录、数据库文章写入与R2真上传均待用户验收。没有凭据授权，不代登录/发邮件，不索取密码/密钥。

### 下一步任务
用户让Vercel最新代码成为Production，按docs/admin-account.md配置Supabase，打开/admin/password申请新邮件、设置密码。随后验证稿件保存与图片视频上传；如有具体错误，按相关接口/配置局部诊断，保留现有管理员UID，不删账号/重做SQL。

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
