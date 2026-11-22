-- Lunora Boutique Online & Gestão — Esquema Relacional Completo para Supabase (PostgreSQL)
-- Execute este script no SQL Editor do seu projeto Supabase para criar e vincular todas as tabelas.

create table if not exists public.categories (
  slug text primary key,
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category text not null references public.categories(name) on update cascade,
  price numeric(10, 2) not null check (price >= 0),
  original_price numeric(10, 2),
  rating numeric(3, 1) not null default 5.0,
  review_count integer not null default 1,
  stock integer not null default 0 check (stock >= 0),
  sizes jsonb not null default '["Único"]'::jsonb,
  colors jsonb not null default '["Neutro"]'::jsonb,
  description text not null default '',
  material text not null default '',
  image text not null,
  featured boolean not null default false,
  is_new boolean not null default false,
  on_sale boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text not null default '',
  shipping_address text not null default '',
  city text not null default '',
  postal_code text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  city text not null,
  postal_code text not null,
  payment_method text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'Pendente',
  created_at text not null,
  progress_step integer not null default 1,
  total_steps integer not null default 3
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  size text not null default 'Único',
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create table if not exists public.stock_movements (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id text primary key,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  due_date text not null default 'Hoje',
  category text not null default 'pedido',
  order_id text references public.orders(id) on delete set null,
  product_id text references public.products(id) on delete set null,
  pinned boolean not null default false,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key,
  title text not null,
  status text not null default 'Em Curso',
  summary text not null default '',
  category text references public.categories(name) on update cascade on delete set null,
  completed_steps integer not null default 0,
  total_steps integer not null default 1
);

create table if not exists public.weekly_sales (
  day_index integer primary key,
  day text not null,
  full_day text not null,
  apparel numeric(10, 2) not null default 0,
  accessories numeric(10, 2) not null default 0,
  delta_percent integer not null default 0
);

create table if not exists public.store_settings (
  id integer primary key default 1,
  store_name text not null default 'Lunora Fashion',
  currency_symbol text not null default 'Kz',
  free_shipping_threshold numeric(12, 2) not null default 50000,
  support_email text not null default 'atelier@lunorafashion.ao',
  integrations jsonb not null default '[]'::jsonb,
  storefront_config jsonb not null default '{}'::jsonb,
  admin_password_hash text
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  customer_id text references public.customers(id) on delete set null,
  subscribed_at timestamptz not null default now()
);

create table if not exists public.store_costs (
  id text primary key,
  title text not null,
  category text not null default 'Operacional',
  amount numeric(12, 2) not null check (amount >= 0),
  cost_date text not null,
  created_at timestamptz not null default now()
);

-- Índices para consultas rápidas entre loja e painel de gestão
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_tasks_order_id on public.tasks(order_id);
create index if not exists idx_store_costs_date on public.store_costs(cost_date);

-- Row Level Security desativado para garantir que todos os visitantes vejam exatamente os mesmos produtos e definições
alter table public.categories disable row level security;
alter table public.products disable row level security;
alter table public.customers disable row level security;
alter table public.orders disable row level security;
alter table public.order_items disable row level security;
alter table public.stock_movements disable row level security;
alter table public.goals disable row level security;
alter table public.tasks disable row level security;
alter table public.campaigns disable row level security;
alter table public.weekly_sales disable row level security;
alter table public.store_settings disable row level security;
alter table public.newsletter_subscribers disable row level security;
alter table public.store_costs disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
