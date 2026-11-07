-- Jurnal: strategi, emosi, dan "sesuai rencana?". Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
alter table public.trades
  add column if not exists strategy text,
  add column if not exists emotion text,
  add column if not exists followed_plan boolean;
