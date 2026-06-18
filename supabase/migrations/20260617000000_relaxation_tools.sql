-- ── 이완 도구 테이블 ────────────────────────────────────────────────────────────
create table if not exists public.relaxation_tools (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  category     text        not null,
  duration_min integer     not null,
  storage_path text        not null,
  description  text,
  icon         text,
  "order"      integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- ── 이완 기록 테이블 ────────────────────────────────────────────────────────────
create table if not exists public.relaxation_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete cascade,
  tool_id      uuid        references public.relaxation_tools(id) on delete cascade,
  completed_at timestamptz not null,
  created_at   timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────────────
alter table public.relaxation_tools enable row level security;
alter table public.relaxation_logs  enable row level security;

-- 정책은 drop → recreate 방식으로 멱등성 보장 (여러 번 실행해도 안전)
drop policy if exists "Anyone can read relaxation_tools"    on public.relaxation_tools;
drop policy if exists "Users can insert own relaxation_logs" on public.relaxation_logs;
drop policy if exists "Users can select own relaxation_logs" on public.relaxation_logs;

create policy "Anyone can read relaxation_tools"
  on public.relaxation_tools for select
  using (true);

create policy "Users can insert own relaxation_logs"
  on public.relaxation_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can select own relaxation_logs"
  on public.relaxation_logs for select
  using (auth.uid() = user_id);

-- ── storage_path 유니크 제약 (중복 INSERT 방지) ─────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'relaxation_tools_storage_path_key'
  ) then
    alter table public.relaxation_tools
      add constraint relaxation_tools_storage_path_key unique (storage_path);
  end if;
end $$;

-- ── 초기 데이터 (ON CONFLICT DO NOTHING → 재실행 안전) ──────────────────────────
insert into public.relaxation_tools (title, category, duration_min, storage_path, description, icon, "order")
values
  ('8분 마음챙김',    '마음챙김', 8,  '8min-mindfulness.mp3',        '8분 동안 호흡과 현재 순간에 집중하는 마음챙김 명상',                '🧘',  1),
  ('건포도 명상',     '마음챙김', 10, 'raisin-meditation.mp3',        '건포도 하나에 모든 감각을 집중하며 현재 순간을 깨우는 명상',          '🍇',  2),
  ('나만의 안전기지', '마음챙김', 15, 'safe-place.mp3',               '마음속 평온한 공간을 상상하며 불안을 가라앉히는 심상 유도 명상',      '🏡',  3),
  ('바디스캔',        '신체이완', 20, 'body-scan.mp3',                '머리끝부터 발끝까지 신체 감각을 순서대로 인식하며 긴장을 해소',       '🫁',  4),
  ('복식호흡',        '신체이완', 5,  'diaphragmatic-breathing.mp3',  '배를 활용한 깊은 호흡으로 교감신경을 빠르게 진정시키는 훈련',         '🌬️', 5),
  ('수면전 이완',     '수면',     15, 'sleep-relaxation.mp3',         '잠들기 전 몸과 마음의 긴장을 풀어 숙면을 유도하는 이완 가이드',      '🌙',  6),
  ('앉은 자세 요가',  '신체이완', 10, 'seated-yoga.mp3',              '앉은 채로 할 수 있는 부드러운 스트레칭으로 굳은 몸을 풀어주는 요가', '🧘',  7),
  ('점진적 근육 이완','신체이완', 15, 'progressive-muscle.mp3',       '근육을 순서대로 긴장·이완하며 전신의 스트레스를 해소하는 PMR 훈련',  '💪',  8)
on conflict (storage_path) do nothing;
