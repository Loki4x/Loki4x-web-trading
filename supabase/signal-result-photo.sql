-- Foto hasil (screenshot closing/profit) yang diunggah admin saat update status sinyal.
alter table public.signals add column if not exists result_image_url text;
