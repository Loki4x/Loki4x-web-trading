-- Pilihan broker untuk pengajuan VIP via IB (Exness / Valetax). Pengajuan lama dianggap Exness.
alter table public.vip_ib_requests
  add column if not exists broker text not null default 'exness';

alter table public.vip_ib_requests
  drop constraint if exists vip_ib_requests_broker_check;
alter table public.vip_ib_requests
  add constraint vip_ib_requests_broker_check check (broker in ('exness', 'valetax'));
