-- Lashly — schema novo, pensado para instalação limpa.
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Profissional',
  business_name text not null default 'Profissional',
  phone text,
  avatar_url text,
  app_icon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text not null default '',
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  price numeric(12,2) not null check (price >= 0),
  appointment_status text not null default 'agendado' check (appointment_status in ('agendado','confirmado','concluido','cancelado','nao_compareceu')),
  reminder_enabled boolean not null default true,
  reminder_minutes integer not null default 60 check (reminder_minutes between 1 and 10080),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint appointments_client_same_user foreign key (client_id, user_id) references public.clients(id, user_id) on delete restrict,
  constraint appointments_service_same_user foreign key (service_id, user_id) references public.services(id, user_id) on delete restrict
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  appointment_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'Pix' check (payment_method in ('Pix','Dinheiro','Crédito','Débito','Outro')),
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint payments_appointment_same_user foreign key (appointment_id, user_id) references public.appointments(id, user_id) on delete cascade
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  payment_method text not null default 'Pix' check (payment_method in ('Pix','Dinheiro','Crédito','Débito','Outro')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Outros',
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.material_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null,
  quantity numeric(12,2) not null check (quantity > 0),
  amount numeric(12,2) not null check (amount > 0),
  purchase_date date not null default current_date,
  expense_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint purchases_material_same_user foreign key (material_id, user_id) references public.materials(id, user_id) on delete restrict,
  constraint purchases_expense_fk foreign key (expense_id) references public.expenses(id) on delete set null
);


-- Notificações push (iPhone/Android/Desktop PWA)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  reminder_minutes integer not null,
  sent_at timestamptz not null default now(),
  unique (user_id, appointment_id, reminder_minutes)
);

create index if not exists idx_clients_user on public.clients(user_id);
create index if not exists idx_services_user on public.services(user_id);
create index if not exists idx_appointments_user_date on public.appointments(user_id, date, start_time);
create index if not exists idx_payments_user_paid_at on public.payments(user_id, paid_at);
create index if not exists idx_payments_appointment on public.payments(appointment_id);
create index if not exists idx_incomes_user_date on public.incomes(user_id, date);
create index if not exists idx_expenses_user_date on public.expenses(user_id, date);
create index if not exists idx_materials_user on public.materials(user_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
create index if not exists idx_notification_deliveries_lookup on public.notification_deliveries(user_id, appointment_id, reminder_minutes);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger incomes_updated_at before update on public.incomes for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger materials_updated_at before update on public.materials for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Impede que a soma dos pagamentos ultrapasse o preço do atendimento.
create or replace function public.validate_payment_total()
returns trigger
language plpgsql
as $$
declare
  appointment_price numeric(12,2);
  already_paid numeric(12,2);
begin
  select price into appointment_price
  from public.appointments
  where id = new.appointment_id and user_id = new.user_id
  for update;

  if appointment_price is null then
    raise exception 'Atendimento inválido.';
  end if;

  select coalesce(sum(amount),0) into already_paid
  from public.payments
  where appointment_id = new.appointment_id
    and id <> coalesce(new.id, gen_random_uuid());

  if already_paid + new.amount > appointment_price then
    raise exception 'O pagamento ultrapassa o saldo do atendimento.';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_validate_total on public.payments;
create trigger payments_validate_total
before insert or update on public.payments
for each row execute function public.validate_payment_total();

-- Compra de material atômica: estoque + compra + despesa no mesmo commit.
create or replace function public.register_material_purchase(
  p_material_id uuid,
  p_quantity numeric,
  p_amount numeric,
  p_purchase_date date,
  p_add_to_expenses boolean default true,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  material_name text;
  new_expense_id uuid := null;
  new_purchase_id uuid;
begin
  if uid is null then raise exception 'Usuário não autenticado.'; end if;
  if p_quantity <= 0 or p_amount <= 0 then raise exception 'Quantidade e valor devem ser positivos.'; end if;

  select name into material_name from public.materials where id = p_material_id and user_id = uid for update;
  if material_name is null then raise exception 'Material não encontrado.'; end if;

  update public.materials set quantity = quantity + p_quantity where id = p_material_id and user_id = uid;

  if p_add_to_expenses then
    insert into public.expenses(user_id, description, amount, category, date, notes)
    values(uid, 'Compra: ' || material_name, p_amount, 'Materiais', p_purchase_date, p_notes)
    returning id into new_expense_id;
  end if;

  insert into public.material_purchases(user_id, material_id, quantity, amount, purchase_date, expense_id, notes)
  values(uid, p_material_id, p_quantity, p_amount, p_purchase_date, new_expense_id, p_notes)
  returning id into new_purchase_id;

  return new_purchase_id;
end;
$$;

create or replace function public.validate_material_purchase_links()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.materials where id = new.material_id and user_id = new.user_id) then
    raise exception 'Material inválido.';
  end if;
  if new.expense_id is not null and not exists (select 1 from public.expenses where id = new.expense_id and user_id = new.user_id) then
    raise exception 'Despesa inválida.';
  end if;
  return new;
end;
$$;

drop trigger if exists material_purchases_validate_links on public.material_purchases;
create trigger material_purchases_validate_links
before insert or update on public.material_purchases
for each row execute function public.validate_material_purchase_links();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.materials enable row level security;
alter table public.material_purchases enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

-- Policies idempotentes.
do $$
declare t text;
begin
  foreach t in array array['clients','services','appointments','payments','incomes','expenses','materials','material_purchases','push_subscriptions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own_all', t);
  end loop;
end $$;

drop policy if exists profiles_own_all on public.profiles;
create policy profiles_own_all on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant execute on function public.register_material_purchase(uuid,numeric,numeric,date,boolean,text) to authenticated;

-- Mídia personalizável do Lashly (foto de perfil e ícone do app).
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



-- Os logs de envio são gravados apenas pelo backend (service role). O usuário não precisa acessá-los pelo app.
drop policy if exists notification_deliveries_own_read on public.notification_deliveries;
create policy notification_deliveries_own_read on public.notification_deliveries
for select to authenticated using (user_id = auth.uid());
