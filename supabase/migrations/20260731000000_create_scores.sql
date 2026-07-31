-- 벽돌깨기 점수 기록 테이블
--
-- 이 게임은 서버 없는 정적 사이트(GitHub Pages)라서 브라우저가 anon key로
-- Supabase 를 직접 호출한다. anon key 는 번들에 그대로 노출되므로
-- "무엇을 할 수 있는지"는 전적으로 아래 RLS 정책과 CHECK 제약이 결정한다.

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 12),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  score integer not null check (score >= 0 and score <= 1000000),
  stage integer not null check (stage >= 1 and stage <= 999),
  created_at timestamptz not null default now()
);

-- 리더보드는 항상 "점수 내림차순, 동점이면 먼저 세운 기록 우선"으로 조회한다
create index if not exists scores_leaderboard_idx
  on public.scores (score desc, created_at asc);

alter table public.scores enable row level security;

-- 읽기: 누구나 리더보드를 볼 수 있다
drop policy if exists "scores_select_public" on public.scores;
create policy "scores_select_public"
  on public.scores for select
  to anon, authenticated
  using (true);

-- 쓰기: 누구나 자기 기록을 남길 수 있다 (값 검증은 위 CHECK 제약이 담당)
drop policy if exists "scores_insert_public" on public.scores;
create policy "scores_insert_public"
  on public.scores for insert
  to anon, authenticated
  with check (true);

-- update / delete 정책은 만들지 않는다 → RLS 기본 거부로 남의 기록을 고치거나 지울 수 없다
