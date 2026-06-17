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

-- relaxation_tools: 로그인 여부와 무관하게 누구나 읽기 가능
create policy "Anyone can read relaxation_tools"
  on public.relaxation_tools for select
  using (true);

-- relaxation_logs: 자신의 기록만 삽입·조회 가능
create policy "Users can insert own relaxation_logs"
  on public.relaxation_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can select own relaxation_logs"
  on public.relaxation_logs for select
  using (auth.uid() = user_id);

-- ── 초기 데이터 ─────────────────────────────────────────────────────────────────
insert into public.relaxation_tools (title, category, duration_min, storage_path, description, icon, "order")
values (
  '8분 마음챙김',
  '마음챙김',
  8,
  '8min-mindfulness.mp3',
  '8분 동안 호흡과 현재 순간에 집중하는 마음챙김 명상',
  '🧘',
  1
);
