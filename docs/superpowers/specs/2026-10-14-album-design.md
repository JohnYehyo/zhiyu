# 芝语独立相册

用户明确选择“独立上传、单独管理相册”，并要求继续实施。相册不再从日记封面生成，不自动汇总日记照片。公开页是拍立得照片网格，点击大图，前后切换、Escape退出，手机和平板可用。照片按相册日期倒序；日期为空时使用创建时间。只显示明确公开的相册照片，不暴露草稿、额外账号/媒体ID字段或文件名；沿用已有公开R2存储键（URL路径已有账号和对象标识），不新增媒体代理或改键。日期未填写时公开图注标注“日期未填写”，不把重新发布时间当拍摄日期。

后台/admin/album提供上传照片、从现有图片素材添加、图注、内容说明、日期、公开/收起、移出相册和分页。复用现有图片签名PUT/HEAD/ready链路；新增照片默认未公开，上传失败可重试确认，ready后加入相册失败可重试加入，不能重复上传冒充成功。移出只删除相册记录/公开快照，不删除R2对象或影响日记。

新增私有album_photos与公开published_album_photos快照表，RLS/权限方式沿用博客。管理员路由同源与真实getUser+ADMIN校验；写入RPC检查owner、revision和ready图片，事务锁保证竞态安全。新增记录引用mediaId，禁止任意key/url；同owner/media不可重复加入。PATCH保存元数据与公开布尔值并刷新快照；发布后修改保存会同步相册公开信息（相册简单元数据无需第二个发布动作）。新表不导入历史日记。新SQL单DO，已有相册表拒绝初始化，不删除旧数据。

独立类型：AlbumDraft{caption:string,alt:string,date:string}，AlbumPhoto extends AlbumDraft{id,mediaId,storageKey,revision:number,published:boolean,createdAt,updatedAt}。PublicAlbumPhoto extends AlbumDraft{id,storageKey,publishedAt,demo?:boolean}。日期为YYYY-MM-DD或空，图注≤1000、说明≤500。API GET/POST /api/admin/album；PATCH/DELETE /api/admin/album/[id]。GET返回{photos,pagination:{page,pageSize,total}}；POST{mediaId,caption,alt,date}→{photo}；PATCH{revision,caption,alt,date,published}→{photo}；DELETE{revision}→{deletedId}。公开GET /api/album?page&pageSize和servergetAlbumPage返回同分页格式，只读公开快照。

本地无Supabase时使用独立示例照片；已配置但未迁移时公开页显示相册尚未准备好，不回退日记或假示例。云SQL/上线最后验证，不重复认证设置、不读取真实密钥，不发布个人内容代替用户。
