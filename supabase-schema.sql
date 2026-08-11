-- Rice Stock Ledger — cloud database schema.
-- Paste this whole file into your Supabase project's SQL Editor and run it
-- once. It creates the six tables the app needs, plus permissive access
-- policies so the app (using the public "anon" key) can read and write.
--
-- Column names are quoted in camelCase so they match the app's JavaScript
-- field names exactly — no renaming/mapping needed on either side.

create table rice_types (
  id text primary key,
  name text not null,
  grade text not null,
  unit text not null,
  "reorderLevel" numeric not null default 0,
  "createdAt" timestamptz not null default now()
);

create table suppliers (
  id text primary key,
  name text not null,
  contact text not null default '',
  "createdAt" timestamptz not null default now()
);

create table supplier_purchases (
  id text primary key,
  date date not null,
  "supplierId" text references suppliers(id) on delete restrict,
  "riceTypeId" text references rice_types(id) on delete restrict,
  quantity numeric not null,
  "pricePerUnit" numeric not null,
  "totalCost" numeric not null default 0,
  notes text not null default '',
  "createdAt" timestamptz not null default now()
);

create table raw_purchases (
  id text primary key,
  date date not null,
  source text not null,
  "quantityKg" numeric not null,
  "pricePerKg" numeric not null,
  "totalCost" numeric not null default 0,
  notes text not null default '',
  "createdAt" timestamptz not null default now()
);

create table millings (
  id text primary key,
  date date not null,
  "riceTypeId" text references rice_types(id) on delete restrict,
  "rawQuantityKg" numeric not null,
  "outputQuantity" numeric not null,
  notes text not null default '',
  "createdAt" timestamptz not null default now()
);

create table stock_outs (
  id text primary key,
  date date not null,
  "riceTypeId" text references rice_types(id) on delete restrict,
  quantity numeric not null,
  reason text not null default 'Sale',
  notes text not null default '',
  "createdAt" timestamptz not null default now()
);

-- Row Level Security must be turned on before any policy takes effect.
alter table rice_types enable row level security;
alter table suppliers enable row level security;
alter table supplier_purchases enable row level security;
alter table raw_purchases enable row level security;
alter table millings enable row level security;
alter table stock_outs enable row level security;

-- This app now has a login screen backed by Supabase Auth (see the
-- "Adding the login screen" section in README.md for creating the one
-- user account). These policies require a signed-in session — the public
-- anon key alone is no longer enough to read or write data.
create policy "authenticated full access" on rice_types for all to authenticated using (true) with check (true);
create policy "authenticated full access" on suppliers for all to authenticated using (true) with check (true);
create policy "authenticated full access" on supplier_purchases for all to authenticated using (true) with check (true);
create policy "authenticated full access" on raw_purchases for all to authenticated using (true) with check (true);
create policy "authenticated full access" on millings for all to authenticated using (true) with check (true);
create policy "authenticated full access" on stock_outs for all to authenticated using (true) with check (true);
