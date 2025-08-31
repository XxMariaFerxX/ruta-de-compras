-- Enable extensions
create extension if not exists "uuid-ossp";

-- Auth note: Supabase creates auth schema automatically. We'll store user profile data in public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  email text,
  created_at timestamptz default now()
);

-- Stores table
create table if not exists public.stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  layout_cols int not null default 6,
  layout_rows int not null default 6,
  entrance_cell text, -- celda de entrada opcional
  checkout_cells text[] default '{}', -- celdas de cajas de pago
  created_at timestamptz default now()
);

-- Products table
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references public.stores(id) on delete cascade,
  name text not null,
  price numeric(10,2) default 0,
  cell_id text not null,
  created_at timestamptz default now()
);
create index if not exists idx_products_store on public.products(store_id);

-- Saved routes
create table if not exists public.routes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  route_json jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_routes_user on public.routes(user_id);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.routes enable row level security;

-- Profiles policies: user can select own & admins can select all
-- Profiles policies (avoid self-referencing subqueries to prevent recursion)
drop policy if exists "Profiles select self" on public.profiles;
drop policy if exists "Profiles select admin" on public.profiles;
drop policy if exists "Profiles insert self" on public.profiles;
drop policy if exists "Profiles update self" on public.profiles;
drop policy if exists "Profiles delete admin" on public.profiles;

create policy "Profiles select self_or_admin" on public.profiles for select
  using ( auth.uid() = id OR coalesce(auth.jwt()->>'role','user') = 'admin' );

create policy "Profiles insert self" on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Profiles update self_or_admin" on public.profiles for update
  using ( auth.uid() = id OR coalesce(auth.jwt()->>'role','user') = 'admin')
  with check ( auth.uid() = id OR coalesce(auth.jwt()->>'role','user') = 'admin');

create policy "Profiles delete admin_jwt" on public.profiles for delete
  using ( coalesce(auth.jwt()->>'role','user') = 'admin');

-- Stores policies: everyone can read; only admins can modify
create policy "Stores select" on public.stores for select using ( true );
create policy "Stores insert admin" on public.stores for insert with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );
create policy "Stores update admin" on public.stores for update using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );
create policy "Stores delete admin" on public.stores for delete using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );

-- Products policies: same as stores
create policy "Products select" on public.products for select using ( true );
create policy "Products insert admin" on public.products for insert with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );
create policy "Products update admin" on public.products for update using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );
create policy "Products delete admin" on public.products for delete using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') );

-- Routes policies: user owns their routes, can read; also can insert routes for themselves
create policy "Routes select own" on public.routes for select using ( auth.uid() = user_id );
create policy "Routes insert own" on public.routes for insert with check ( auth.uid() = user_id );
create policy "Routes delete own" on public.routes for delete using ( auth.uid() = user_id );

-- Helper function to promote a user to admin (run manually)
create or replace function public.promote_to_admin(target uuid) returns void as $$
  update public.profiles set role='admin' where id = target;
$$ language sql security definer;

-- Auto create profile on new auth user (idempotent)
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::text,'user'))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin delete user helper (may require elevated privileges depending on Supabase config)
create or replace function public.admin_delete_user(target uuid) returns void as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') then
    raise exception 'not authorized';
  end if;
  delete from auth.users where id = target;
end;
$$ language plpgsql security definer;

-- List all users (admin only)
create or replace function public.admin_list_users()
returns table(id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin') then
    raise exception 'not authorized';
  end if;
  return query
    select u.id, u.email::text as email, coalesce(pr.role,'user') as role, u.created_at
    from auth.users u
    left join public.profiles pr on pr.id = u.id
    order by u.created_at desc;
end;
$$;
