-- Alasan penolakan admin untuk pengajuan VIP via IB dan pembayaran USDT.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
alter table public.vip_ib_requests add column if not exists rejection_reason text;
alter table public.payments add column if not exists rejection_reason text;
