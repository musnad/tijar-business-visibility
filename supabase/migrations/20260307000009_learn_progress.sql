-- Gamified learn progress (lesson content lives in the app catalog for now).

create table public.user_learn_state (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp int not null default 0 check (total_xp >= 0),
  streak_count int not null default 0 check (streak_count >= 0),
  last_activity_date date,
  hearts_remaining int not null default 5 check (hearts_remaining between 0 and 5),
  hearts_date date not null default (current_date),
  updated_at timestamptz not null default now()
);

create table public.user_lesson_completions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  xp_earned int not null default 0 check (xp_earned >= 0),
  completed_at timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

create index user_lesson_completions_profile_idx
  on public.user_lesson_completions (profile_id, completed_at desc);

alter table public.user_learn_state enable row level security;
alter table public.user_lesson_completions enable row level security;

create policy "user_learn_state_own"
  on public.user_learn_state for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "user_lesson_completions_own"
  on public.user_lesson_completions for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create trigger user_learn_state_updated_at
  before update on public.user_learn_state
  for each row execute function public.set_updated_at();
