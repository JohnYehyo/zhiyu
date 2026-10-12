# 首版验证与接入边界

功能基线：9c41602，分支 feat/first-version。已按用户授权推送GitHub的feat/first-version分支；未创建PR、部署或真实云写入。

## 最终验证
- npm test：71/71 PASS，13 个测试文件；包括实际迁移 SQL 的 PGlite 权限、事务、快照与回滚验证。
- npm run typecheck、npm run lint、npm run build、git diff --check：PASS。
- npm audit --omit=dev：0 漏洞。开发 ESLint/braces 工具链的既有 advisory 已记录，未自动降级 Next。
- 三项实现分别完成独立审查；整分支审查及修复复审结束，所有确认的 Critical/Important 已关闭。
- 生产服务：六个页面在 320/390/740/768/1024/1440 共36组布局无横向溢出；手机首页图案位于文案/入口之后，桌面构图保留。
- 浏览器：导航开关、搜索空结果、编辑/格式/图注/最新预览、离开取消保留、同文档返回确认、锚点及还原基线；视频手动播放、controls/playsInline、无自动播放。
- Chrome单条初始历史记录：编辑后确认返回无目标，页面和文字保留；随后刷新仍出现beforeunload提示，站内离开取消仍保留内容。实际生产构建验证，不仅使用模拟历史测试。
- HTTP：首页/示例文章/不存在文章为200/200/404；未配置管理写入/上传503 NOT_CONFIGURED，跨Origin写入403 CROSS_ORIGIN。运行时控制台无errors；存在跨页预加载素材未使用warning。

## 实现约定和影响
1. 在用户指定clone的功能分支开发；若位置不合适，可迁移目录/分支，不涉及原型覆盖。
2. 没有密钥时允许明确的本地示例，真实云写入关闭；真实发布前仍需配置凭据并应用迁移。
3. 上传响应包含Content-Type/If-None-Match请求头，条件PUT防止复用签名覆盖对象；真实上传需桶CORS与浏览器签名链路验收。
4. 兼容Supabase新旧变量，非空新值优先；部署需按.env.example命名，若集成改变只需调整局部配置适配。
5. 复审新增的无前史导航缺陷也做了补修；因此多一次定点验证，避免按流程次数限制保留丢稿隐患。

## 尚未验证的外部链路
没有真实凭据：托管Supabase迁移/REST角色、登录刷新、真实R2 CORS/File PUT/HEAD/条件写和Vercel缓存仍待接入后验收。PGlite与本地浏览器不等同云接通。公共桶草稿媒体可凭URL访问，无视频转码或孤立对象自动清理；详见[服务接入](cloud-setup.md)与[Vercel导入](deployment.md)。
