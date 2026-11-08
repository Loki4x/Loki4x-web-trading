-- Pilihan pair untuk notifikasi sinyal. Kosong / NULL = terima semua pair.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
alter table public.profiles add column if not exists signal_pairs text[];
