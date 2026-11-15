-- Progres belajar & kuis Akademi.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

-- ------------------------------------------------------------
-- Video yang sudah ditonton (ditandai sendiri oleh member)
-- ------------------------------------------------------------
-- Tipe video_id mengikuti tipe kolom academy_videos.id (uuid atau bigint), dideteksi otomatis.
do $$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into id_type
  from pg_attribute a
  where a.attrelid = 'public.academy_videos'::regclass and a.attname = 'id';

  execute format(
    'create table if not exists public.academy_video_progress (
       user_id uuid not null references auth.users(id) on delete cascade,
       video_id %s not null references public.academy_videos(id) on delete cascade,
       completed_at timestamptz not null default now(),
       primary key (user_id, video_id)
     )',
    id_type
  );
end $$;

alter table public.academy_video_progress enable row level security;

drop policy if exists "Users read own video progress" on public.academy_video_progress;
create policy "Users read own video progress"
  on public.academy_video_progress for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users add own video progress" on public.academy_video_progress;
create policy "Users add own video progress"
  on public.academy_video_progress for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users remove own video progress" on public.academy_video_progress;
create policy "Users remove own video progress"
  on public.academy_video_progress for delete to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Soal kuis. HANYA admin yang bisa membaca langsung (ada kunci jawaban).
-- Member menerima soal tanpa jawaban lewat server, dan penilaian juga di server.
-- ------------------------------------------------------------
create table if not exists public.academy_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('TECHNICAL', 'FUNDAMENTAL', 'PSYCHOLOGY')),
  question text not null check (char_length(question) between 5 and 500),
  options text[] not null check (array_length(options, 1) between 2 and 6),
  correct_index integer not null check (correct_index >= 0 and correct_index < array_length(options, 1)),
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists academy_quiz_questions_category_idx on public.academy_quiz_questions (category, created_at);

alter table public.academy_quiz_questions enable row level security;

drop policy if exists "Admins manage quiz questions" on public.academy_quiz_questions;
create policy "Admins manage quiz questions"
  on public.academy_quiz_questions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ------------------------------------------------------------
-- Hasil kuis. Ditulis oleh server (service role) setelah dinilai; member hanya bisa membaca miliknya.
-- ------------------------------------------------------------
create table if not exists public.academy_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('TECHNICAL', 'FUNDAMENTAL', 'PSYCHOLOGY')),
  score integer not null,
  total integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists academy_quiz_attempts_user_idx on public.academy_quiz_attempts (user_id, category, created_at desc);

alter table public.academy_quiz_attempts enable row level security;

drop policy if exists "Users read own quiz attempts" on public.academy_quiz_attempts;
create policy "Users read own quiz attempts"
  on public.academy_quiz_attempts for select to authenticated
  using (auth.uid() = user_id);
