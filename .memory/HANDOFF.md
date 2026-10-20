# 工作交接

## [Codex]

### 当前目标 + 成功指标
2026-10-21四项相册升级：管理每页15（宽屏5×3）；公开所有照片及时展示；单归属相册集与所有相片/相册切换；批量上传逐项进度/失败重试。用户已明确允许提交推送、执行增量SQL、部署Production。

### 当前阶段
interactive_verification

### 重要文件和近期决定
- 工作目录zhiyu，branch feat/first-version，基线aabdb61，当前源码未提交。用户.idea保留不提交；父原型/真实.env/ADMIN/Auth/R2配置不读不改。
- 默认相册集浏览，旧照片未分组；空/仅私有照片相册集仅后台可见。删除集合只移回未分组、保留图片及公开状态。新建集合自动切换查看/上传目标；每张照片保存归属，不自动公开。
- 新增可重复单DO supabase/setup/query-album-collections.sql（与202610210001迁移逐字相同）。旧album初始化已执行，勿重跑。新增private album_collections、归属列、公开快照集合元数据/汇总view、仅service RPC与旧签名兼容。SQL准备好，云端待执行。
- 查正式公开API total20/returned20，页面原15为静态route缓存问题；/album现force-dynamic，构建已证明动态。getAlbumCollections分批读公共view/count exact，1000整页与PGRST103处理；后台移走最后一页后夹回有效页。
- AlbumBatch每文件独立AlbumAddition实例，串行继续失败后项、成功项不重传；pending先HEAD确认，仅UPLOAD_INCOMPLETE才重PUT，签名过期且对象确认缺失后重新签名；ready只重试加入。所有新增照片private。
- ProductionBranch仍master，Git push feature仅Preview。正式发布需从最新Preview Redeploy选择Production且不用旧BuildCache，固定https://zhiyu-beta.vercel.app。不改分支设置、不为最终日志另推送。
- 用户2026-10-21明确授权升级并部署：提交push当前代码；Supabase项目mgbahqnxoraqmljibsrc执行新增SQL、集合公开名称/说明/封面仅含已公开照片；部署Vercel johnyehyos-projects/zhiyu Production。不再重复询问同一授权。

### 已完成
- 全部四项源码、SQL、自动测试、使用指南完成。独立review未发现高风险缺陷；反馈两项边界已加失败用例复现修复。reviewer后续额度限制中断，root补看完整SQL/状态机/分页边界，无未处理发现。
- 浏览器合成fixture验证：public31张24→31停止加载；单集合仅20；390/768无横溢出。admin20张15+5五列；新集合自动选中上传；3文件PNG同时选择，故意中间PUT失败，后续成功显示2/3；仅重试失败项后3/3且全未公开；手机编辑移组保存保留private。
- 临时无.env测试app /tmp/zhiyu-collections-qa-20261021，webpack3103 session28628；复制实际UI，合成API另写只用于测试，不替代真实权限证明。首次fixture共享模块重编译重置状态导致失败已修global临时store并重新成功验收。
- CUA IAB browser3 freshAlbumQa tab3公开预览已markDeliverable；旧tab2因beforeunload工具对话框卡住，别再用。当前runtime qaArtifacts=fs/promises，qaViewport已reset。截图 /tmp/zhiyu-collections-public-desktop.jpg、admin-mobile.jpg、upload-verified.jpg（后者先前fixture无admin全局CSS，勿用外观验收）。真实站照片不作为测试素材。

### 已运行的命令 + 结果
- 最新npm test：50files290tests PASS。npm run lint PASS。npm run build PASS，/album动态；build后npm run typecheck PASS；git diff --check PASS。next-env.d.ts构建后恢复，无生成物diff。
- PGlite实际升级/重复执行保留旧published/private/旧RPC；owner/RLS/view安全、foreigncollection、ready guards、移组/改名/删除递增revision测试PASS。HTTP服务路由freshgetUser/管理员/同源及分页筛选测试PASS。

### 已知问题和“请勿重读”列表
- Auth/邮件/ADMIN/R2接通，勿重查/发信/改配置。Downloads旧测试draft已删。正式Beta目前旧版，未声称云上线。

### 下一步任务
1. 按现授权在Supabase SQL Editor整体执行query-album-collections.sql，检查Success与旧20公开照片/未分组汇总只读结果，不修改用户照片。
2. git commit本轮源码+指南+HANDOFF，单次push feat/first-version。必要临时SSHProxyCommand="nc -X 5 -x 127.0.0.1:7890 %h %p"；不改全局Git/禁hostkey。
3. 最新Preview完成后Production重建（生产变量，关buildcache），确认固定Beta实际新版；管理员已有会话只读验证分页及集合入口，不擅自建/发布用户真实内容。
4. 完成后只本地更新最终HANDOFF，避免文档Preview；保留测试预览或关无用tab/服务，最终报告上线证据和限制。

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

## [upload_readiness]

### 当前目标 + 成功指标
定位线上图片/封面/视频上传503配置错误；保留R2现有配置校验、安全签名和HEAD语义，给出明确云存储配置错误及不泄漏配置值的服务端诊断。云配置及部署由主Agent按用户授权处理。

### 当前阶段
done

### 重要文件和近期决定
- 仅修改src/lib/server/r2.ts与r2.test.ts。getR2ConfigStatus()返回configured布尔、六个环境变量名对应configured/missing/invalid状态及missing/invalid名称数组；不含值/密钥/URL，仅校验配置形状，不验证凭据权限或真实网络可用性。
- 保留原条件：32位十六进制账号（支持大写、不自动trim账号）；access/secret/bucket非空；prefix缺省blob，显式其他值无效；public媒体地址遵循mediaUrl的HTTPS根地址、无用户名密码/query/hash规则。真实桶blog与对象前缀blob语义不变。
- r2Storage缺失/非法配置时抛503 STORAGE_NOT_CONFIGURED，明确云端图片与视频存储缺配置并只列变量名；不再提示去本地预览。签名有效期、type/length/If-None-Match及HEAD404/null/上游503 STORAGE_UNAVAILABLE均未改。
- 根调用点：POST /api/admin/media创建签名；POST /api/admin/media/[id]/complete完成HEAD验证。未改路由/鉴权/UI/SQL，未读取.env.local或云密钥，未commit/push/deploy。

### 已完成
上传专用配置错误和服务端安全诊断；覆盖所需空值、账号格式、默认前缀、blog桶、public origin边界及输出不含值的测试。

### 已运行的命令 + 结果
- npm test -- src/lib/server/r2.test.ts：先RED（旧NOT_CONFIGURED与缺少诊断），实现后21/21 PASS，包含既有真实SDK合成凭据签名检查。
- npm test：当时31files，27PASS/4FAIL，161PASS/12FAIL；其他并行任务仍RED：journal-templates模块缺失、rich-content-journal渲染、category-repository四项、journal-sql七项MEDIA_NOT_READY。已告知主Agent，不修改其他Agent代码。
- npm run typecheck：当时FAIL，仅journal-templates缺失及其测试implicit-any，无R2类型报错。lint退出0，其他scope category-field有_unused _props警告。git diff --check：PASS。

### 已知问题和“请勿重读”列表
R2配置逻辑及调用链已完整确认，未改时不重读鉴权/SQL或重复真实R2上传。此前真实R2 PNG/MP4链路证据保留，不能据本地诊断称Vercel存储已就绪。

### 待验证 / 证据缺口
本轮没有云运行时配置读取/改动。主Agent负责只读核对Vercel变量名与环境范围，授权后同步配置并新部署，以及实际上传验收；配置形状通过不等同权限/CORS/存储可用性通过。

### 下一步任务
主Agent集成最终全量test/typecheck/lint与单次build，待其他并行scope完成后重跑；必要时在受保护后台集成getR2ConfigStatus服务端输出。避免多个Agent同时写.next。

## [journal_contracts]

### 当前目标 + 成功指标
支持原型六种内置插画作为封面/正文图片，持久化彩色引用块及成对拍立得照片元数据；上传媒体继续严格依赖归属、ready状态与版本事务。

### 当前阶段
done

### 重要文件和近期决定
- src/lib/journal-assets.ts：精确白名单 /assets/picnic.svg、meadow.svg、flowers.svg、sea.svg、window.svg、sun.svg；journalAssets、isJournalAsset、journalQuoteTones供编辑器复用。
- security.ts、admin/content.ts、content/document.ts：blockquote支持tone（pink/blue/green/yellow/peach/mint）和attribution<=200；image支持layout(single/pair)、date<=40。严格写校验拒绝任意CSS/额外属性，序列化过滤编辑器默认属性。
- 内置正文图片写入时省略mediaId；上传图片仍需要UUID mediaId和签发形状blob键。公开图片规范化只接受精确内置键或具有UUID媒体身份的签发形状图片键；video行为沿用。
- 新增supabase/migrations/202610140001_journal.sql和setup/query-journal.sql，仅替换snapshot_node/publish_post，保留SECURITY INVOKER、FOR UPDATE/FOR SHARE、owner/revision、immutable snapshot和权限。未修改已执行旧迁移。
- 已初始化数据库须执行query-journal.sql整份单DO升级（可重复）；新建数据库先bootstrap再journal。不触碰真实数据库/凭据/云/提交/部署。

### 已完成
应用契约与数据库发布适配、六种插画真实PGlite发布与升级测试、上传媒体权限及版本隔离回归；自身文件lint和diffcheck通过。 实际EditorImage ProseMirror schema默认mediaId为空串时，仅对白名单内置image过滤空ID；非空伪造ID和云图片空ID仍保留并拒绝。

### 已运行的命令 + 结果
- 新API/读规范化/序列化测试先RED（9个缺功能失败）→GREEN；真实PGlite插画发布先RED（7个MEDIA_NOT_READY）→GREEN。
- scoped vitest（security/content/admin-content/journal-sql/migration/setup-sql/maintenance）：7files79tests PASS。
- own eslint：PASS；git diff --check：PASS。
- EditorImage真实getSchema/nodeFromJSON默认属性回归先RED空ID保留→GREEN；serializer/security两文件30tests及相关eslint PASS。
- npm test完整运行：30files178tests PASS；当时root编辑中journal-templates缺模块、rich-content-journal渲染尚缺新UI，2files仍RED。typecheck当时仅journal-templates缺模块与其派生implicitany失败；由root最终集成后复验。

### 已知问题和“请勿重读”列表
已核验既有snapshot_node和publish_post没有单独assert函数；原始SQL上传归属/ready/行锁逻辑保持。无须再次全库调查鉴权或上传链路。

### 待验证 / 证据缺口
真实云数据库升级未执行；已获授权范围内仅准备脚本。最终全库测试/typecheck/build和真实UI验证由root完成。

### 下一步任务
root整合UI并最终验证，告知用户已有数据库必须先执行setup/query-journal.sql才能发布内置插画。

## [category_input]

### 当前目标 + 成功指标
让已有分类选择与新分类输入明确可见；从当前已验证管理员的已保存稿件整理分类，不新增分类表或迁移，不读真实云数据。

### 当前阶段
done

### 重要文件和近期决定
- 新组件 `src/components/admin/category-field.tsx`：props 为 value/onChange/demo?/disabled?。`.admin-category-field` 内含“已有分类”原生 select、“分类名称”input 与 admin-hint；父 Agent 负责 PostEditor 接入和 CSS。
- 新 GET `/api/admin/categories` 复用 handleAdmin / fresh getUser exactUID，private,no-store；用户请求参数不能指定 owner。
- 新 `src/lib/server/category-repository.ts` 仅 select category:draft->>category，owner_id 必填，按 id 分页每页500最多10页（最多5,000篇）；trim/去重/非空/长度<=60，中文排序。未读正文、未改 schema。
- 默认选择保留日常碎片/慢慢长大/出去走走。新名称随文章保存后才有持久记录；最后一篇采用该分类的稿件被删除或改分类后，不再保留独立分类。组件 mount 与 select focus 刷新；demo 不请求 API。

### 已完成
分类查询、鉴权边界、可见选择与自由输入；新增2个测试文件。没有真实凭据、云查询、提交、推送或部署。

### 已运行的命令 + 结果
- 先RED（repository/route空实现4项断言失败，组件空实现2项断言失败）再GREEN。
- `npm test -- src/lib/server/category-repository.test.ts src/components/admin/category-field.test.tsx`：8/8 PASS；覆盖 owner 隔离、只查分类字段、分页、整页末端PGRST103处理、大库读数界限、getUser鉴权、错误缓存与安全文本/disabled渲染。
- Category own5files ESLint：PASS。`git diff --check`：PASS。
- 10:54 全量 `npm test`：30files/179tests PASS，失败为并行处理中 journal-templates.test.ts 缺实现、rich-content-journal.test.ts 新渲染未实现；同轮 typecheck 仅缺 journal-templates 及其 implicit-any 错误。父 Agent 最终完成后需重跑，不将此轮视为全量通过。

### 待验证 / 证据缺口
父 Agent 接入后真实交互需验证：选已有分类改变文章字段、自由输入新分类、保存后再次聚焦 select 包含新名称；demo无API请求与手机布局。组件测试采用SSR渲染，未证明浏览器effect/选择事件。

### 下一步任务
父 Agent 接入 PostEditor 和CSS，进行最终全量测试、typecheck/build与必要交互验证。

## [album_admin]

### 当前目标 + 成功指标
独立相册后台：上传/复用图片→确认ready→新增未公开相册记录；管理图注/内容说明/日期、保存、公开/收起、移出，失败可按原媒体身份恢复。仅实现admin scope，不从日记生成相册，不删除R2对象。

### 当前阶段
done（本Agent范围；整体真实交互/云端由root集成验证）

### 重要文件和近期决定
- `src/components/admin/album-manager.tsx` + css；`src/app/admin/album/page.tsx` Guard/Shell；admin首页仅新增相册入口。
- `src/lib/admin/album-workflow.ts` 独立顺序状态机，签名和PUT后确认失败保留pending；ready后POST失败只重试POST；重复错误清空恢复身份并刷新列表。同步busy锁拒绝双击并发。新记录metadata空值，默认未公开由后端保证。
- 显式保存；公开/收起PATCH一并捕获当前caption/alt/date/revision，fieldsets在写入期间禁用。现有编辑器永不被后到的新增完成结果覆盖。切换/分页/关闭编辑确认未保存字段；复用protectEditorNavigation保护离页/返回/刷新及未完成上传。
- 列表GET key+AbortController，不展示过期页。相册移出DELETE只传revision并明确保留素材/日记。冲突保留本地字段、禁止再次写入，提供确认放弃并刷新列表。
- ≤700px编辑区在网格上方，选择时聚焦并滚到编辑区；网格两列。桌面编辑区290px，普通compact lucide按钮。相册范围CSS隐藏既有MediaPicker中“作为封面”提示，保留相册自有提示，没有改MediaPicker文件。

### 已完成
全部分配文件及辅助workflow/测试；未改共享types/auth/media APIs/repository/db/public gallery/globalCSS。没有真实env/secret、云操作、Browser、commit/push或子Agent。

### 已运行的命令 + 结果
- workflow初始6项断言RED→实现后GREEN。涵盖确认失败、PUT不确定、ready后加入失败、重复恢复、快速连续添加隔离、发布字段快照。
- `npm test -- src/components/admin/album-manager.test.tsx src/lib/admin/album-workflow.test.ts src/lib/admin/upload.test.ts src/lib/admin/navigation.test.ts`：4files13tests PASS。SSR仅证明图片入口/loading无日记占位，不代替浏览器events。
- 6个自身TS/TSX文件scoped ESLint PASS；`git diff --check` PASS。
- `npm run typecheck`初轮FAIL，仅并行后端WIP：album-routes.test.ts46 unknown及缺routes/repository；album-sql.test.ts26/94 unknown。自身无类型报错。root最终需再跑，未运行build以免共享.next竞态。

### 已知问题和“请勿重读”列表
既有上传/API/Pagination/MediaPicker/Navigation/Guard合同已确认且复用，无需重新全库调查。未知PUT只提供HEAD确认；不以新签名/重复PUT伪装重试。改选素材是显式放弃当前恢复状态，存储素材保留。

### 待验证 / 证据缺口
没有真正Browser或云端效果证明。需要root验证390/768/桌面：upload/素材→未公开、图注保存刷新、未保存字段公开/收起、分页取消、冲突、移出确认保留素材、ready-add失败与确认失败按钮。后端/admin/album exactcontract由另一个Agent实现。

### 下一步任务
root完成后端和公开页集成，全量tests/lint/build/typecheck顺序核验与真实UI，再最终更新总体HANDOFF。

## [album_backend]

### 当前目标 + 成功指标
独立相册后端：只能添加本人ready图片，默认私有；元数据/公开切换必须校验owner和revision；快照仅含展示字段；移出不删除媒体。完成本地实现和定向验证，等待root整合。

### 当前阶段
done

### 重要文件和近期决定
- `src/lib/server/album-repository.ts`：listAlbumPage(owner,{page,pageSize})、createAlbumPhoto(owner,{mediaId,caption,alt,date})、updateAlbumPhoto(owner,id,{revision,caption,alt,date,published})、removeAlbumPhoto(owner,id,revision)。私有返回完整AlbumPhoto，不返回owner或文件名；RPC错误独立映射ALBUM_MIGRATION_REQUIRED/ALBUM_DUPLICATE/ALBUM_CONFLICT/NOT_FOUND/MEDIA_NOT_READY。
- `src/lib/server/album-security.ts`：严格payload字段、真实日历YYYY-MM-DD/空日期、图注1000/说明500上限、正安全整数revision；parseAlbumQuery只允许唯一page/pageSize，默认1/20，上限10000/100。
- `src/app/api/admin/album/{route.ts,[id]/route.ts}`：真实handleAdmin/readJson/validateId；GET分页、POST默认未公开、PATCH保存与快照同步、DELETE版本移出。PATCH/DELETE成功revalidatePath('/album')覆盖收起，POST无需公开缓存失效。
- `supabase/migrations/202610140002_album.sql` 与 `supabase/setup/query-album.sql` 内容一致、单DO增量；要求已有media，发现任何现有相册表拒绝重建。私有album_photos引用media且owner/media唯一，公开published_album_photos只含id/storage_key/caption/alt/taken_on/sort_date/published_at。sort_date按root补充需求使用日期或原始created_at UTC日；公开读只选六个产品字段。无账号/媒体ID/文件名。
- create/update/remove三个SECURITY INVOKER函数search_path为空，仅service_role执行；create锁ready本人图片，update锁owner记录及revision并在公开时重新锁ready图片、检查storage_key完全相同；事务快照更新/撤回。FK确保移出只删相册链接与快照，保留源media。

### 已完成
新增后端7个TS文件与两份SQL；真实PGlite SQL权限/事务/原始创建日期排序、Supabase客户端HTTP格式到SQL的管理接口集成、严格参数校验。

### 已运行的命令 + 结果
- SQL缺实现首轮13失败RED；最终 `npm test -- src/lib/server/album-routes.test.ts src/lib/server/album-security.test.ts src/lib/server/album-sql.test.ts`：3files35tests PASS。
- 整合构建发现两测试文件PGlite默认unknown行类型，已仅加query泛型（RPC result、regclass、公开行）；再次3files35tests PASS，`npm run typecheck` PASS。完整build由root重跑。
- scoped `npx eslint` 全部7个新增TS文件：PASS；`git diff --check`：PASS；迁移/setup `cmp`：PASS。
- prepared单query从bootstrap升级、拒绝重复建表、拒绝缺media库：PASS；owner/pending/video/key变更/null或旧revision/公开列权限/数据库日历和长度/删除保留media：PASS。

### 已知问题和“请勿重读”列表
已有auth/R2/文章功能未改。SQL不是可重复初始化脚本，重复执行应ALBUM_ALREADY_INITIALIZED。需要复核时只定位新增相册文件，无需重读旧媒体/日记发布实现。

### 待验证 / 证据缺口
未执行真实云SQL、上线、浏览器、commit/push/PR；全库测试与build由root整合后顺序执行；当前独立typecheck已PASS。PGlite验证事务内原子性和顺序版本冲突，不能等同多连接真实Postgres并发验收。

### 下一步任务
root整合并执行全套验证；必要时按用户既有授权应用新的相册单DO升级，切勿重跑bootstrap或旧日记迁移。真实云验证只用合成且未公开测试媒体。

## [collections_backend]

### 当前目标 + 成功指标
相册集增量后端：私有集合 CRUD、照片单归属与过滤、公开快照安全汇总；旧照片/媒体保留，不自动公开，不删除 R2。自身实现与定向验证完成，root 负责全套构建/浏览器/云端流程。

### 当前阶段
done

### 重要文件和近期决定
- 新增 `supabase/migrations/202610210001_album_collections.sql` 与逐字相同的 `supabase/setup/query-album-collections.sql`：单 DO，可重复升级；要求旧 album schema 已存在。不得重跑原始相册初始化。
- `album_collections` 私有、按 owner 隔离；`album_photos.collection_id` 使用 `(collection_id,owner_id)` 复合 FK 拒绝跨 owner 归属。公开快照只新增 collection_id/title/description；`published_album_collections` security_invoker 视图只从已公开快照汇总 `collection_id,title,description,photo_count,cover_storage_key`；未分组 title=未分组。
- 新旧 photo RPC 签名并存；新签名多一个 p_collection_id。旧 create 未分组，旧 update 保留现有分组。集合与照片写入共享 owner advisory transaction lock，按稳定顺序处理移动/改名/删除。保留 ready image/storage_key guards 与 photo revision。
- 删除集合移回未分组且递增所有关联照片 revision；快照保持公开状态；不删除照片/media/R2。改名同步已公开快照，不让私有集合直接暴露。
- 新 `album-collection-{repository,security}.ts` 与 `/api/admin/album/collections`、`/[id]`；GET {collections}，POST/PATCH {collection}，DELETE ?revision=N 返回 {deletedId}。PATCH/DELETE revalidatePath('/album')。
- 现有 admin album GET 默认15，支持唯一 collectionId UUID|unassigned；省略为全部。照片 create/patch 接受 optional nullable collectionId。相册集合错误映射 COLLECTION_NOT_FOUND(404)/COLLECTION_CONFLICT(409)，不外泄 SQL。

### 已完成
后端/SQL及 HTTP/PGlite 测试已实现。未改原始迁移、共享类型、public reader、auth、云端配置和凭据。

### 已运行的命令 + 结果
- 新测试先 RED：collectionId/15条默认值未支持；新 SQL 缺失。
- `npm test -- src/lib/server/album-routes.test.ts src/lib/server/album-sql.test.ts src/lib/server/album-collections-sql.test.ts src/lib/server/album-security.test.ts src/lib/server/album-collection-security.test.ts`：5 files / 50 tests PASS。
- `npm run typecheck`：PASS。
- 对全部自身 TS/route 文件运行 eslint：PASS。
- PGlite 覆盖已有已公开照片升级保留、重复执行、旧 RPC、owner/RLS、ready media、公开汇总仅来自快照、改名/移组、删除集合保留所有照片与媒体、私有照片版本递增、stale revision 回滚。

### 已知问题和“请勿重读”列表
已有独立相册初始化行为由旧 album-sql.test.ts 覆盖；没有修改旧迁移。无需调查 auth/R2/日记。

### 待验证 / 证据缺口
真实 Supabase 尚未执行增量 SQL；root 负责全量测试/build与整合浏览器验证。没有使用云端或真实用户照片。

### 下一步任务
root 整合后按既有授权在 Supabase SQL Editor 一次执行完整 query-album-collections.sql；云端只验证新增迁移，不重跑 bootstrap/原相册初始化。当前代码必须与新 schema 一并发布。
