# Independent Album Implementation Plan

> **For agentic workers:** use scoped parallel agents with fixed contracts. User requested continuation; implementation is authorized. No intermediate PR or cloud mutation before tested result.

**Goal:** Independently upload, maintain and explicitly publish photos in a scrapbook gallery.
**Architecture:** Private album rows reference ready owner media. Public snapshots expose only gallery metadata. Existing R2 upload and admin auth remain.
**Tech Stack:** Next.js, React, Supabase SQL/HTTP, R2, Vitest/PGlite.
**Spec:** docs/superpowers/specs/2026-10-14-album-design.md

## Global Constraints
Only task files, summarize before opening, skip.idea/deps/caches. Preserve auth and media safeguards. No real secrets. No original prototype edits. No user photos published automatically. No R2 deletes. Root owns shared types and globalCSS.

## Review Focus
Foreign/pending/video media denied; concurrent edit revision conflicts; public rows never show unpublished data; upload confirmed but album-add failed retriable; keyboard/focus/responsive gallery.

## Tasks
- [x] Backend: createAlbumPhoto/listAlbumPage/updateAlbumPhoto/removeAlbumPhoto repository plus strict payload/query validators, admin routes, SQL and prepared-query PGlite tests. Match exact interfaces in spec. Test owner/media/duplicate/revision/public RLS before implementation. Error codes ALBUM_MIGRATION_REQUIRED, ALBUM_CONFLICT, ALBUM_DUPLICATE, NOT_FOUND, MEDIA_NOT_READY.
- [x] Admin: AlbumManager uses existing adminRequest/putFile/completeUpload/MediaPicker/Pagination. Upload single image→ready→POSTmetadata defaults→refresh; retries must preserve pending or ready identity. Metadata local editing and explicit save; publictoggle no local unsaved loss; remove confirm preserves media. Introduce /admin/album and link from existing/admin. Own album-manager.tsx, album-manager.css, admin page integration, focused tests.
- [x] Public: getAlbumPage maps only published fields; getPublishedAlbum catches missing table with explicit prepared state; /album uses AlbumGallery. Photo buttons/native dialog safe React, close/previous/next keyboard and focus return, image dimensions fit viewport. Public API validates page range. Test no journal dependencies and no private fields.
- [x] Root integration: full tests, lint, build then typecheck sequentially. Real desktop390/768 gallery with synthetic/local fixture and keyboard; backend SQL real owner transaction tests, admin ready/add retries tests. Independent review. Update HANDOFF, commit/push once complete.
- [x] Cloud: apply tested singleDO album migration to specified existing Supabase project with scoped authorization if required; newProduction deployment; public empty state and real admin add/edit/save/refresh test using synthetic media only, keep unpublished. Final results distinguish public photo browsing fixture from real private cloud test.

Cloud completion: Supabase singleDO Success.NoRowsReturned; Production6wqVLMk1... Ready/source8350d88; fixedpublicAPI200/empty independent gallery verified, anonymousadminredirectlogin. Real admin addition remains a user acceptance check because native browser control was repeatedly interrupted; no private photos published.
