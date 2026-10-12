# Zhiyu First Version Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development task-by-task. Implementers do not spawn helpers. Checkboxes track tasks.

**Goal:** 在本 clone 完成可构建并可导入Vercel的手帐博客首版。
**Architecture:** 一个 Next.js/TypeScript 项目，公共阅读与/admin 分离；Vercel serverless API，Supabase Auth/PostgreSQL 和 R2 签名直传。缺少密钥时只开放明确标识的示例体验，真实写接口失败关闭。
**Tech Stack:** Next.js App Router、React、TypeScript、Tiptap、Supabase SSR/JS、AWS S3 SDK、zod、lucide-react、Vitest。
**Spec:** docs/superpowers/specs/2026-10-12-first-version.md

## Global Constraints
遵守 spec 的全部约束与精确接口。只在zhiyu工作，不改父目录。所有秘密留在.env.local；不得推送/部署/创建PR。手帐和六色已定。原型图像为示例。每项完成更新项目.memory/HANDOFF.md的Agent段，保留其他段。

## Review Focus
1. 缺少凭据、非管理员和跨Origin写入：写操作拒绝且不伪装已保存。
2. 编辑已发布稿件：草稿不泄漏到公开网站或公共数据库API。
3. R2未完成/外来媒体与危险链接：不能发布或执行不安全内容。
4. 连续快速输入、保存同时发布：revision串行，409冲突保留用户稿件。
5. 缺图、手机窄屏、视频和长标题：页面可读、媒体完整显示、无横向溢出。

### Task 1: Application foundation and scrapbook reader
**Files:** package/Next/TS/ESLint/Vitest config；src/lib/types.ts、media.ts、content/document.ts、demo-posts.ts、posts.ts；src/components公共阅读组件；src/app/layout.tsx、globals.css、page.tsx、posts/[slug]/page.tsx、archive/album/about；public/assets；content tests。
**Interfaces:** Consumes approved parent scrapbook and article references. Produces exact shared interfaces in spec. posts.ts initially implements sample fallback; Task 2 connects configured cloud reader. mediaUrl local assets or configured public R2 keys.
- [x] Write safety/content tests before implementation: unsafe schemes, rawHTML/unknown nodes, missing metadata, media prefix paths; meaningful renderer behavior tests.
- [x] Run and observe RED; implement minimum shared utilities/types and reader; run GREEN.
- [x] Install current stable packages and lockfile. npm scripts dev/build/start/typecheck/lint/test. Use local font and copied referenced assets (no runtime webfont dependency).
- [x] Port scrapbook composition, article reading and useful filtering/search/navigation; clearly mark sample stories.
- [x] Run tests, typecheck, lint and build; report commands/results and commit only task files. No remote push.

### Task 2: Supabase and R2 services with secure APIs
**Files:** src/lib/config.ts、supabase/*、auth.ts、http.ts、post-service/repository modules、upload modules；src/app/api/admin routes；supabase/migrations/*.sql；service/security tests；setup docs；modify src/lib/posts.ts to read configured published table.
**Interfaces:** Consumes Task 1 types and paths. Produces exact API envelopes in spec; exported server getAdminSession():Promise<{userId:string}|null>, requireAdmin() returning verified context, hasSupabaseConfig()/hasWriteConfig() from config for UI. Missing config returns typed 503 on write and sample on reader only when config absent. PUBLIC supplied Project URL alone is insufficient readiness.
- [x] Write and run failing tests for absent config, nonadmin, unsafe content, upload size/type/path, incomplete/foreign media, draft/published separation and revision conflict.
- [x] Implement credential-aware Supabase SSR clients and verified user guard; Origin check every mutating cookie-auth route.
- [x] Migration: private draft_posts and media (no anon/authenticated access), public published_posts read-only, service-only transactional publish/unpublish RPC with owner/revision locking.
- [x] GET/PATCH drafts protect owner and expectedrevision; validate all content. Publish validates ready owned media and writes immutable snapshot transactionally; refresh public caches.
- [x] R2 signed PUT and completion HEAD verification, blob/ prefix, no proxying media. Use configured account host; never read .env.local or print values.
- [x] Run covering tests/typecheck/lint/build and unauth/no-config route checks. Document SQL, env/CORS setup and real-cloud evidence gaps. Commit task files only.

### Task 3: Mobile admin editing and verification-ready release
**Files:** src/app/admin routes；src/components/admin/*；scoped admin styles；editor-state/content tests；README、deployment guide；update env.example if aligned aliases needed.
**Interfaces:** Consumes Task 2 server guards/config and exact APIs; public rich renderer from Task1 reused for preview. Supports current and legacy Supabase key env aliases, safe client publishable config only.
- [x] Write tests for queued/autosave revision handling and content serialization; observe RED then GREEN.
- [x] Login via Supabase browser client; show useful missing-config page without exposing values. Restrict real /admin server views to verified admin. /admin/demo remains explicitly local preview with no server writes.
- [x] Implement typed list/new/edit UI, mobile toolbar, Tiptap immediatelyRender:false, title/slug/category/excerpt/cover, inline image/video with alt/caption, upload progress/errors.
- [x] Serialize autosaves and publishing; latest edit is saved before publish; conflicts retain editor contents. No successful cloud-save status in demo.
- [x] README local commands, migration and exact Vercel setup; readiness status no secrets; test/build/typecheck/lint and editor browser checks.
- [x] Commit task files only; final controller reviews and prepares one version for user to import Vercel. Never remote push/deploy.
