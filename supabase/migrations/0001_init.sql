-- Home maintenance app: schema, row-level security, storage.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our home',
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table members (
  household_id uuid not null references households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null,
  primary key (household_id, user_id),
  unique (user_id) -- one household per user
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  title text not null check (length(trim(title)) > 0),
  room_id uuid references rooms on delete set null,
  priority text check (priority in ('high','medium','low')),
  size text check (size in ('5min','morning','day','weekend')),
  critical boolean not null default false,
  notes text not null default '',
  status text not null default 'open' check (status in ('open','done')),
  repeat_every int check (repeat_every > 0),
  repeat_unit text check (repeat_unit in ('weeks','months')),
  next_due date,
  added_by uuid references auth.users on delete set null,
  added_at timestamptz not null default now()
);

create table item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items on delete cascade,
  household_id uuid not null references households on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create table completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items on delete cascade,
  household_id uuid not null references households on delete cascade,
  done_at timestamptz not null default now(),
  who text not null default 'Us', -- 'Us' or a tradie name
  cost numeric(10,2),            -- AUD
  notes text not null default '',
  after_photo text,
  receipt_photo text
);

create index on items (household_id);
create index on rooms (household_id);
create index on item_photos (item_id);
create index on completions (item_id);

-- Helper: households the caller belongs to.
create function my_households() returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from members where user_id = auth.uid()
$$;

alter table households enable row level security;
alter table members enable row level security;
alter table rooms enable row level security;
alter table items enable row level security;
alter table item_photos enable row level security;
alter table completions enable row level security;

create policy "own household" on households for select using (id in (select my_households()));
create policy "own household update" on households for update using (id in (select my_households()));
create policy "members read" on members for select using (household_id in (select my_households()));
create policy "members update self" on members for update using (user_id = auth.uid());

create policy "rooms all" on rooms for all
  using (household_id in (select my_households()))
  with check (household_id in (select my_households()));
create policy "items all" on items for all
  using (household_id in (select my_households()))
  with check (household_id in (select my_households()));
create policy "photos all" on item_photos for all
  using (household_id in (select my_households()))
  with check (household_id in (select my_households()));
create policy "completions all" on completions for all
  using (household_id in (select my_households()))
  with check (household_id in (select my_households()));

-- Create a household with starter rooms; the caller becomes its first member.
create function create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Already in a household';
  end if;
  insert into households (name) values (coalesce(nullif(trim(p_name), ''), 'Our home')) returning id into hid;
  insert into members (household_id, user_id, display_name) values (hid, auth.uid(), p_display_name);
  insert into rooms (household_id, name, sort_order)
  select hid, n, ord from unnest(array[
    'Kitchen','Living room','Bedroom','Bathroom','Laundry','Hallway','Garage','Garden','Outside','Whole house'
  ]) with ordinality as t(n, ord);
  return hid;
end $$;

-- Join via invite link. A household holds at most two members.
create function join_household(p_token text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into hid from households where invite_token = p_token;
  if hid is null then raise exception 'Invite link is not valid'; end if;
  if exists (select 1 from members where user_id = auth.uid() and household_id = hid) then return hid; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'Already in a household'; end if;
  if (select count(*) from members where household_id = hid) >= 2 then
    raise exception 'This household is full';
  end if;
  insert into members (household_id, user_id, display_name) values (hid, auth.uid(), p_display_name);
  return hid;
end $$;

grant execute on function create_household(text, text) to authenticated;
grant execute on function join_household(text, text) to authenticated;

-- Photos: private bucket; objects live under <household_id>/...
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1]::uuid in (select my_households()));
create policy "photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1]::uuid in (select my_households()));
create policy "photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1]::uuid in (select my_households()));
