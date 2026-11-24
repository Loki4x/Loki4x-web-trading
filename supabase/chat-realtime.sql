-- Realtime untuk Live Chat (chat admin ↔ user): pesan & daftar percakapan langsung muncul
-- di web dan aplikasi tanpa perlu refresh. Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_threads;
  exception when duplicate_object then null;
  end;
end $$;
