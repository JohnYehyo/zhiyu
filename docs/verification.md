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

## 文章维护更新（2026-10-13）

- 18files/89tests、typecheck/lint/build、diffcheck PASS，代码审查与搜索定点复审通过。
- 新增owner/revision事务删除（保留共享媒体）、搜索/状态/分页、ready素材复用；增量及单query初始化SQL已执行PGlite验证。
- PostgREST字面搜索改imatch并转义完整regex字符；实际SDK编码与PostgreSQL匹配边界均覆盖。
- 仓库真实组件在独立临时测试接口中通过浏览器搜索/分页/删除确认/素材→正文及封面/实际PNG与MP4 File上传/自动保存/故障不插入检查；手机和平板无横溢出。该接口不进入仓库，不提供生产鉴权旁路，不等同cloud成功。
- 正式生产API无配置503、跨站删除403；线上/admin/login仍未配置，真实cloud验收待用户完成[接入配置](connect-live.md)。最新独立R2桶是blog，前缀blob/，旧桶勿动。

## Supabase 集成变量命名（2026-10-13）

代码、模板和部署文档统一优先使用用户 Vercel 集成的 zhiyu 变量名。reader/browser/server/proxy/service全部统一URL选择，公开字段保持静态NEXT_PUBLIC引用以供Next编译；私有字段仅在server-only服务客户端使用。5新增行为测试RED→GREEN，最终19files94tests、typecheck/lint/build/diffcheck PASS，独立小范围审查PASS。无前缀旧配置仍作为回退，集成POSTGRES/JWT变量无需复制。没有读取或修改真实密钥、没有声称实际云注入与登录已验收。

## 配置缺项诊断（2026-10-13）

此前登录配置页只有笼统提示。新版SSR逐项显示当前部署的URL/publicKey/serviceKey/ADMIN_USER_ID是否已提供/缺失/格式错误，只渲染状态，不渲染任何配置值；部署环境与合法截断SHA帮助识别旧版本。诊断与写入守卫使用同一判定，授权边界不变。3新增测试RED→GREEN，最终20files97tests/typecheck/lint/build/diffcheck PASS，390px检查与独立小范围review PASS。

只读线上检查仍看到旧环境引用/无zhiyu适配或公开URL内联，不能认定新代码已进入正式域名。本地应用诊断为URL/public/service已提供、ADMIN_USER_ID格式不正确，未读取其真实值。用户认为.env.local会同步Vercel，已解释Git忽略与云Environment Variables分别设置；真实云登录仍待正确UserUID/Production变量及新部署。
