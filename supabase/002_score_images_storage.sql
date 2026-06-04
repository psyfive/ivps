-- ================================================================
-- Opus — Phase 2c: 악보 이미지 Storage 마이그레이션
-- 실행 순서:
--   1. 이 SQL을 Supabase SQL Editor에서 실행
--   2. Supabase Dashboard > Storage > score-images 버킷이 생성되었는지 확인
-- ================================================================

-- ── scores 테이블에 page_storage_paths 컬럼 추가 ────────────────────
alter table public.scores
  add column if not exists page_storage_paths jsonb default '[]'::jsonb;

-- ── Supabase Storage 버킷 생성 (private) ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'score-images',
  'score-images',
  false,
  52428800,   -- 50MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ── Storage RLS 정책 ─────────────────────────────────────────────────
-- 경로 구조: {userId}/{scoreId}/page-{n}.jpg
-- 첫 번째 폴더 = userId 로 본인 여부 확인

drop policy if exists "Users can upload own score images" on storage.objects;
create policy "Users can upload own score images" on storage.objects
  for insert with check (
    bucket_id = 'score-images' AND
    auth.role() = 'authenticated' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can read own score images" on storage.objects;
create policy "Users can read own score images" on storage.objects
  for select using (
    bucket_id = 'score-images' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can update own score images" on storage.objects;
create policy "Users can update own score images" on storage.objects
  for update using (
    bucket_id = 'score-images' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can delete own score images" on storage.objects;
create policy "Users can delete own score images" on storage.objects
  for delete using (
    bucket_id = 'score-images' AND
    auth.uid()::text = split_part(name, '/', 1)
  );
