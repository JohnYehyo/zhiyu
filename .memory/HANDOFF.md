# 工作交接

## [Codex]

### 当前目标 + 成功指标
用户要求真正维护文章及上传图片/视频。沿用既定Next/Vercel/Supabase/R2架构，补齐搜索/状态/分页/删除、上传素材复用，并验证真实后台链路。已有新建/编辑/串行保存/发布/撤回/签名上传，不能重做或称为只有demo。

### 当前阶段
interactive_verification

### 重要文件和近期决定
- 仓库zhiyu，分支feat/first-version；HEAD8b45fa6，远端已同步，工作区初始干净。父目录原型不动。
- 既定Project URL https://mgbahqnxoraqmljibsrc.supabase.co；R2 bucket johnyehyo/prefix blob/。不读.env.local/真实密钥；旧3102服务当前不可访问。
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
