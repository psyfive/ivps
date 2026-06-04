-- ================================================================
-- Opus — Phase 2 마이그레이션
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.
-- ================================================================

-- ── scores 테이블 ────────────────────────────────────────────────
-- 악보 메타 + 구간/필기 (이미지 dataUrl은 저장하지 않음)
create table if not exists public.scores (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  uploaded_at bigint,
  page_count int default 1,
  segments jsonb default '[]'::jsonb,
  drawings jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.scores enable row level security;

drop policy if exists "own scores" on public.scores;
create policy "own scores" on public.scores
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── practice_sessions 테이블 ─────────────────────────────────────
create table if not exists public.practice_sessions (
  id text primary key,
  user_id uuid references auth.users not null,
  score_id text,
  score_name text,
  skill_ids text[] default '{}',
  xp_gained int default 0,
  duration_minutes int default 0,
  has_quality_bonus boolean default false,
  session_date bigint,
  created_at timestamptz default now()
);

alter table public.practice_sessions enable row level security;

drop policy if exists "own practice sessions" on public.practice_sessions;
create policy "own practice sessions" on public.practice_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── profiles 테이블 (없으면 생성) ────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users,
  display_name text,
  avatar_url text,
  provider text,
  is_patron boolean default false,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── custom_skills 테이블 (없으면 생성) ───────────────────────────
create table if not exists public.custom_skills (
  id text primary key,
  user_id uuid references auth.users not null,
  category text,
  name text,
  core_principle text,
  before_text text,
  during_text text,
  after_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.custom_skills enable row level security;

drop policy if exists "own custom skills" on public.custom_skills;
create policy "own custom skills" on public.custom_skills
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
