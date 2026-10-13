# 工作交接

## [Codex]

### 当前目标 + 成功指标
用户要求真正维护文章及上传图片/视频。沿用既定Next/Vercel/Supabase/R2架构，补齐搜索/状态/分页/删除、上传素材复用，并验证真实后台链路。已有新建/编辑/串行保存/发布/撤回/签名上传，不能重做或称为只有demo。

### 当前阶段
interactive_verification

### 重要文件和近期决定
- 仓库zhiyu，分支feat/first-version；HEAD569a21c（会话期间外部提交维护功能，已重新核对Git）；远端同步状态本轮未验证。父目录原型不动。
- 既定Project URL https://mgbahqnxoraqmljibsrc.supabase.co；R2 bucket blog/prefix blob/，公共地址 https://pub-d631369681144c86b273231bd9377fe0.r2.dev。不读.env.local/真实密钥；旧3102服务当前不可访问。
- 维护流程沿用已批准架构/页面，不重新讨论框架。文章删除事务校验owner/revision，移除公开页但保留共享媒体；删除时产品内确认。
- 新增增量迁移，不修改已可能应用的initial.sql。已上传ready媒体仅按管理员owner列出，作为正文或封面复用；不引入自动R2清理。

### 已完成
首版完整实现与71tests/typecheck/lint/build/浏览器验证及独立审查已完成，功能基线9c41602。本轮确认文章缺DELETE与列表查询、素材只有创建/完成接口无复用入口。

### 已运行的命令 + 结果
Git恢复检查干净/HEAD8b45fa6；服务3102不可访问。只读核对post-list/admin API/repository/actual SQL与测试；未重新全库审查鉴权/上传。

### 已知问题和“请勿重读”列表
- getUser+UID/Origin、私有草稿与公开快照、ready媒体验证、导航保护已有，复用已有结论。
- 公开R2草稿媒体可凭URL访问；无转码/字节扫描/pending清理，已有披露。
- 不读密钥；用户部署网址 https://zhiyu-beta.vercel.app/；用户已确认Supabase没有draft_posts/published_posts/media三个表；R2 CORS目前只localhost:3000 GET，缺网站origin/PUT/HEAD/请求头。用户未找到密钥设置。已给用户两份SQL及Auth/APIkeys/R2Token/CORS具体步骤，不读密钥。

### 待验证 / 证据缺口
本轮新增维护/素材行为测试与构建/手机浏览器；Supabase三个表是否存在、管理员/key状态与R2Token/CORS接入；真实登录/手机File直传与发布验收。

### 下一步任务
本轮SQL/查询/实际SDK catalog已RED→GREEN；维护列表、删除、素材复用已实现；85tests/typecheck/build PASS，lint1unused警告已修正待确认；正式文章列表与素材复用；上传行为核验；最终lint/构建与真实浏览器交互（无cloud keys使用临时独立UI测试服务，禁止生产鉴权旁路）；独立review。用户回复部署配置后联调，不创建生产鉴权旁路、不自行部署/PR。


### 本轮执行环境
Homebrew npm存在但node不在PATH，采用Codex提供bundled Node24.19.0运行测试/构建（仅进程PATH调整，未改系统）。Python系统SSL缺CA链，网站检查改用保持TLS校验的curl，不禁用证书验证。

## [Codex-cloud-setup]

### 当前目标 + 成功指标
解决用户粘贴SQL报 prepared statement 多命令错误；将接入配置从旧共享桶调整到用户新建 blog 桶；说明 R2_ACCESS_KEY_ID 来源。

### 当前阶段
done

### 重要文件和近期决定
- 用户已明确确认实际桶名 blog；桶内对象前缀仍为 blob，数据库与正文校验依赖该前缀，不改上传逻辑。
- 账号 1b78820da96cc4165361c9f7be4d3099；新公共URL https://pub-d631369681144c86b273231bd9377fe0.r2.dev。zhiyu/.env.example、cloud-setup、connect-live、首版spec已同步。未读取或修改.env.local/真实密钥，未修改Vercel环境。
- 原始迁移保持不变；supabase/setup/query-bootstrap.sql 单DO合并两份迁移，空博客schema执行一次，存在同名表则拒绝；query-maintenance.sql仅用于已执行初始迁移但缺维护字段的项目。bootstrap后不再执行maintenance或原迁移。
- R2专用Token创建成功页显示Access Key ID与Secret Access Key；Secret离开后不能再次查看，缺完整一对时创建仅授权blog的新Token，不撤销其他应用Token。
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
