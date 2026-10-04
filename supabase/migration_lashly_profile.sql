-- Lashly — ajuste de branding/perfil para projetos que já executaram o schema anterior.
alter table public.profiles alter column name set default 'Profissional';
alter table public.profiles alter column business_name set default 'Lashly';
update public.profiles set business_name = 'Lashly' where business_name = 'Kesia';

-- Cria perfil para usuários existentes que ainda não tenham uma linha em profiles.
insert into public.profiles (id, name, business_name)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Profissional'),
  'Lashly'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
