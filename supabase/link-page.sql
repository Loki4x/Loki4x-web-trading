-- Halaman link ala Linktree (/links), diatur dari Admin → Link Page.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

-- ------------------------------------------------------------
-- Profil halaman (satu baris saja, id = 1)
-- ------------------------------------------------------------
create table if not exists public.link_page (
  id smallint primary key default 1 check (id = 1),
  display_name text not null default 'Loki4x Academy',
  bio text,
  avatar_url text,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'glass', 'brand')),
  socials jsonb not null default '{}'::jsonb,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.link_page (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Daftar link / judul bagian
-- ------------------------------------------------------------
create table if not exists public.link_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'LINK' check (kind in ('LINK', 'HEADER')),
  title text not null,
  url text,
  description text,
  image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists link_items_position_idx on public.link_items (position);

alter table public.link_page enable row level security;
alter table public.link_items enable row level security;

-- Semua orang (termasuk yang belum login) boleh melihat halaman & link yang aktif.
drop policy if exists "Anyone reads link page" on public.link_page;
create policy "Anyone reads link page" on public.link_page for select to anon, authenticated using (true);

drop policy if exists "Anyone reads active links" on public.link_items;
create policy "Anyone reads active links" on public.link_items for select to anon, authenticated using (active = true);

-- Admin mengelola semuanya.
drop policy if exists "Admins manage link page" on public.link_page;
create policy "Admins manage link page" on public.link_page for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins manage link items" on public.link_items;
create policy "Admins manage link items" on public.link_items for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Hitung klik & kunjungan tanpa memberi pengunjung hak menulis tabel.
create or replace function public.increment_link_click(item_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  update public.link_items set clicks = clicks + 1
  where id = item_id and active = true and kind = 'LINK'
  returning url;
$$;

create or replace function public.increment_link_page_view()
returns void
language sql
security definer
set search_path = public
as $$
  update public.link_page set views = views + 1 where id = 1;
$$;

grant execute on function public.increment_link_click(uuid) to anon, authenticated;
grant execute on function public.increment_link_page_view() to anon, authenticated;
