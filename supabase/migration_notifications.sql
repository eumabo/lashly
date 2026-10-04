-- Lashly — lembretes push / iPhone
alter table public.appointments add column if not exists reminder_enabled boolean not null default true;
alter table public.appointments add column if not exists reminder_minutes integer not null default 60;

do $$ begin
  alter table public.appointments add constraint appointments_reminder_minutes_check check (reminder_minutes between 1 and 10080);
exception when duplicate_object then null; end $$;

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

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists push_subscriptions_own_all on public.push_subscriptions;
create policy push_subscriptions_own_all on public.push_subscriptions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notification_deliveries_own_read on public.notification_deliveries;
create policy notification_deliveries_own_read on public.notification_deliveries for select to authenticated
using (user_id = auth.uid());

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
create index if not exists idx_notification_deliveries_lookup on public.notification_deliveries(user_id, appointment_id, reminder_minutes);
