# 工作交接

## [Codex]

### 当前目标 + 成功指标
芝语首版已完成：手帐阅读端、独立文章、手机网页编辑、私有草稿与公开快照、管理员验证和R2直传结构。可构建并在推送后导入Vercel；无凭据时仅明确示例，真实写入失败关闭。

### 当前阶段
done

### 重要文件和近期决定
- 实际仓库 /Users/johnyehyo/mine/code/web/blob/zhiyu；分支feat/first-version；功能提交9c41602。origin git@github.com:JohnYehyo/zhiyu.git；未push、PR或部署，未改父目录原型。
- Supabase Project URL https://mgbahqnxoraqmljibsrc.supabase.co；R2账号endpoint https://1b78820da96cc4165361c9f7be4d3099.r2.cloudflarestorage.com，bucket johnyehyo，prefix blob/，public https://pub-5ae729e1d9de4ed79a75a0afd0101d49.r2.dev。
- 已有被忽略.env.local公开配置；密钥仍需用户自行填入，禁止读取/输出/提交真实密钥。环境字段与别名看.env.example。
- README.md说明命令与写作流程；docs/cloud-setup.md为SQL/Auth/R2/CORS；docs/deployment.md为Vercel导入；docs/verification.md为最终证据与约定。
- supabase/migrations/202610120001_initial.sql未应用托管项目；真实云验收需用户配置。

### 已完成
- 首页、文章、归档/搜索、相册、关于；六色与本地字体素材；手机导航、自然图片比例和手动视频。
- Supabase getUser+ADMIN_USER_ID、Origin防护、私有草稿/媒体、公开快照事务、revision锁与ready媒体校验。
- Tiptap手机编辑、图注/封面、串行保存发布、可修正409、真实版本冲突停写/保留/下载、站内和返回离开保护、只展示可靠公开阅读地址。
- 所有任务独立审查和整分支审查结束；六项发现及新增无前史导航缺陷已修复复审，无未关闭Critical/Important。

### 已运行的命令 + 结果
- 最终npm test：71/71 PASS，13files，含实际PGlite迁移事务。
- 最终npm run typecheck/lint/build、git diff --check：PASS；runtime audit0。
- 生产36组布局PASS，手机hero不遮文案；导航/search/编辑预览/图注/视频/Link与back取消确认通过。
- 真实Chrome初始history.length=1回归：无目标返回后内容仍在，刷新与Link取消仍保护。
- HTTP200/200/404，未配置API503、跨站写403；无runtime errors，既有预加载未使用warning。
- 最终生产预览 http://localhost:3102，exec session36687；停了可npm run start -- --port 3102（源码/环境变更后先build）。

### 已知问题和“请勿重读”列表
- 不重做已完成架构/原型比较、认证/事务/上传全库审查；精准定位相关模块即可。
- SaveCoordinator只将REVISION_CONFLICT永久锁写；SLUG_CONFLICT/MEDIA_NOT_READY可修正重试。navigation.ts以实际离开区分返回意图，无前史回归已覆盖。
- 公开R2草稿媒体可凭URL访问；无转码/字节扫描或pending自动清理，已在UI/docs披露。
- 开发ESLint/braces既有advisory未降级处理；runtime audit0。
- 旧临时服务已停止，只有根36687预览；build前协调停服务以免.next资源版本不匹配。

### 待验证 / 证据缺口
Supabase托管角色/REST、SQL真实应用、登录刷新、非管理员真实访问、R2预检/手机File直传/重复PUT拒绝/HEAD、托管公开缓存仍待凭据与部署验收。不能把本地通过称为云已连通。

### 下一步任务
用户填.env.local或Vercel变量、应用SQL、创建唯一管理员并填UID、配置R2密钥和CORS。用户明确授权后再推送GitHub/部署；不要自行PR或推送。恢复时以Git状态和本文件为准，不重新实现首版。

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
