-- Lashly — perfil visual e ícone personalizado.
-- Execute UMA VEZ no SQL Editor se o seu banco já existe.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists app_icon_url text;

insert into storage.buckets (id, name, public)
values ('lashly-media', 'lashly-media', true)
on conflict (id) do update set public = true;

drop policy if exists lashly_media_select on storage.objects;
create policy lashly_media_select on storage.objects
for select to authenticated
using (bucket_id = 'lashly-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists lashly_media_insert on storage.objects;
create policy lashly_media_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'lashly-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists lashly_media_update on storage.objects;
create policy lashly_media_update on storage.objects
for update to authenticated
using (bucket_id = 'lashly-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'lashly-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists lashly_media_delete on storage.objects;
create policy lashly_media_delete on storage.objects
for delete to authenticated
using (bucket_id = 'lashly-media' and (storage.foldername(name))[1] = auth.uid()::text);
