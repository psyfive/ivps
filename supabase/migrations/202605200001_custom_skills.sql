create table if not exists public.custom_skills (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('A', 'B', 'C')),
  group_id text not null,
  name text not null check (char_length(name) between 1 and 160),
  core_principle text not null default '',
  before_text text not null default '',
  during_items jsonb not null default '[]'::jsonb,
  after_items jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_skills_user_category_id check (id like category || '-U-%')
);

create index if not exists custom_skills_user_id_idx on public.custom_skills (user_id);
create index if not exists custom_skills_user_group_idx on public.custom_skills (user_id, group_id);

alter table public.custom_skills enable row level security;

drop policy if exists "custom_skills_select_own" on public.custom_skills;
create policy "custom_skills_select_own"
  on public.custom_skills
  for select
  using (auth.uid() = user_id);

drop policy if exists "custom_skills_insert_own" on public.custom_skills;
create policy "custom_skills_insert_own"
  on public.custom_skills
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "custom_skills_update_own" on public.custom_skills;
create policy "custom_skills_update_own"
  on public.custom_skills
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "custom_skills_delete_own" on public.custom_skills;
create policy "custom_skills_delete_own"
  on public.custom_skills
  for delete
  using (auth.uid() = user_id);
