-- Aturan risiko, target trading, dan import statement MT4/MT5.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

-- Aturan risiko & target disimpan per akun journaling (kosong = tidak dipakai).
alter table public.trading_accounts
  add column if not exists max_daily_loss_pct numeric(6, 2),      -- batas rugi harian, % dari saldo awal hari itu
  add column if not exists max_trades_per_day integer,            -- batas jumlah trade per hari
  add column if not exists max_consecutive_losses integer,        -- berhenti setelah N loss beruntun di hari yang sama
  add column if not exists monthly_profit_target numeric(18, 2),  -- target profit bulanan (mata uang akun)
  add column if not exists target_win_rate numeric(5, 2);         -- target win rate bulanan (%)

-- ID tiket/posisi dari MT4/MT5, supaya import file yang sama dua kali tidak bikin trade dobel.
alter table public.trades
  add column if not exists external_id text;

create unique index if not exists trades_account_external_id_key
  on public.trades (account_id, external_id)
  where external_id is not null;
