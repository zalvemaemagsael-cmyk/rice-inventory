-- Run this ONCE in your Supabase SQL Editor to fix a bug in the original
-- table setup: the "supplier_purchases" and "raw_purchases" tables were
-- missing a "totalCost" column, causing those two forms to silently fail
-- to save (the app would show the entry briefly, then it would vanish
-- and stock would not update).
--
-- Safe to run even if you already have data in these tables — this only
-- adds a new column, defaulting existing rows to 0, it doesn't touch
-- anything else.

alter table supplier_purchases add column if not exists "totalCost" numeric not null default 0;
alter table raw_purchases add column if not exists "totalCost" numeric not null default 0;
