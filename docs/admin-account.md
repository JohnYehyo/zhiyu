# 管理员邀请与密码

`ADMIN_USER_ID` 指定谁拥有管理权限；Cookie登录会话证明当前访问者是谁。把UID放入环境变量不会让所有浏览器自动登录。接受邀请验证邮箱后可建立会话，设置密码后进入后台；此后使用邮箱密码登录。

## 在 Supabase 配置一次

1. Authentication → URL Configuration，将 Site URL 从 localhost改为 `https://zhiyu-beta.vercel.app`（根地址）。Redirect URLs添加 `https://zhiyu-beta.vercel.app/auth/confirm`；需要本地验证时再添加实际本地端口路径。Vercel中的NEXT_PUBLIC_SITE_URL也使用正式地址，但它不会替代Supabase控制台的Site URL。
2. Authentication → Email Templates → Invite user，用 `supabase/templates/invite.html` 替换邮件正文。
3. Email Templates → Reset password，用 `supabase/templates/recovery.html` 替换邮件正文。
4. 模板使用TokenHash进入网站的确认页面；页面GET只展示按钮，用户点击才POST verifyOtp，避免普通邮件预取消耗单次链接。本站不直接使用默认ConfirmationURL片段回跳流程。

## 已收到 localhost 或过期邀请

旧邮件链接不会因配置修改而变新，`otp_expired`表示链接无效、已使用或过期，也可能被邮件安全预取消费。保留已有管理员用户和UID，不必删除账号或重新建SQL。

配置完上述地址与模板，打开 `https://zhiyu-beta.vercel.app/admin/password`，填已有管理员邮箱，申请新设置密码邮件。收到后只使用最新邮件：确认页面点击按钮 → 设新密码并确认 → 进入稿件列表。若已登录，页面直接允许当前已验证管理员修改密码。

## 代码与验证边界

- POST /api/auth/confirm仅接收invite/recovery token hash，Origin/配置/受限JSON校验后verifyOtp；随后getUser并比较ADMIN_USER_ID，非管理员清除该会话并拒绝，不授予文章权限。
- POST /api/admin/password复用现有getUser/UID/Origin守卫，只更新当前已验证管理员的Auth密码，不接受客户端用户ID。密码不回显、不写日志、不进仓库。
- /admin/password未登录时只申请恢复邮件，不开放注册；响应不确认邮箱是否存在。
- 过期链接无法在本站修复，需新邮件。线上邮件模板、投递和真实session/cookie仍要用户实际验收；本地接口测试不代表已向用户邮箱发送邮件。

官方参考：[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[Email Templates及预取问题](https://supabase.com/docs/guides/auth/auth-email-templates)、[resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)、[updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser)。
