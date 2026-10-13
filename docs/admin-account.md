# 管理员账号与邮件

## 账号、权限和发信的分工

账号在Supabase Auth的数据库中，邮箱/密码验证由Supabase处理；博客检查已验证的登录会话。
`ADMIN_USER_ID`只限制哪个账号有博客管理权限，不存放邮箱或密码。当前是单管理员模式：在Auth中新建用户不会自动获得管理权限；以后支持多个管理员应把角色/权限放到数据库，不继续增加环境变量ID。

博客的“发送设置密码邮件”调用Supabase Auth的`resetPasswordForEmail`。发信由Supabase及其配置的邮件服务完成，Vercel只运行网站；没有另建一套邮件系统。邀请用于接受邀请，恢复邮件用于设置或找回密码，都是同一个Auth账号。

## 只需确认的地址设置

Supabase Authentication → URL Configuration：

1. Site URL为`https://zhiyu-beta.vercel.app`。
2. Redirect URLs包含`https://zhiyu-beta.vercel.app/auth/confirm`。

网站支持Supabase默认邮件，无需为了登录更换邮件模板。若之前已采用本仓库的Invite/Recovery模板，也可继续使用，不必改回。

未设置密码或忘记密码时，打开`https://zhiyu-beta.vercel.app/admin/password`，填写已有管理员邮箱，申请新邮件。打开最新邮件→确认→设置密码→后台。默认恢复邮件使用PKCE时，请在申请邮件的同一浏览器和同一网站域名中打开（把链接复制到原浏览器，而非另一个邮件内置浏览器）；切换手机/电脑或Preview/Production会缺少原验证Cookie。

## 已过期或已使用的邮件

`error_code=otp_expired`是Supabase在验证阶段拒绝链接。本站不会因此尝试创建会话或显示设密码表单，旧链接无法复活，修改环境变量也无效。保留管理员用户和UID，不必重做SQL。

先部署最新Production，再申请一次新邮件，按收到时间使用最新邮件并及时打开。如果新邮件首次立即打开仍过期，再检查邮件安全扫描/链接预取及Supabase Auth邮件有效期；不能仅凭otp_expired断言具体原因。默认邮件可能被扫描器预取消耗；此时可选用`supabase/templates/invite.html`和`recovery.html`（分别在Invite user、Reset password中复制正文），改为点击本站确认按钮才校验TokenHash。

多次点击但没有新邮件时，不要继续重复提交。Supabase默认邮件服务当前限制项目每小时2封；密码恢复还有同用户默认60秒发送间隔。页面收到429时显示限流，并清除上一轮“请求已提交”提示，不能把提交次数当成新邮件数。如果仍使用默认服务且已收到两封，等待限额恢复后只申请一次，再按收到时间找最新邮件；是否实际限流需以响应/Auth日志为准。

## 实现和验证边界

- 默认回跳`?code=`用exchangeCodeForSession；默认邀请/恢复的会话片段只在浏览器读取并去掉，点击确认后同源POST setSession；自定义TokenHash用verifyOtp。默认控制台邀请回首页时，浏览器转到本站确认页，无任意外部redirect。
- 所有方式都由Supabase验证，再fresh getUser核对ADMIN_USER_ID；错误身份签出，不授予文章权限。GET不交换code/hash。POST密码只更新当前已验证管理员，不接受客户端UID。
- query/fragment中的provider错误优先处理，只显示受限错误类别，不展示原始描述、code或令牌。密码和令牌不写日志、不回显。
- 不开放注册。线上邮件投递、真实Cookie持久化和密码登录仍需实际验收；合成接口与浏览器验证不能证明线上已经走通。

官方参考：[Users](https://supabase.com/docs/guides/auth/managing-user-data)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)、[Implicit flow](https://supabase.com/docs/guides/auth/sessions/implicit-flow)、[Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)、[resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)、[Rate limits](https://supabase.com/docs/guides/auth/rate-limits)。
