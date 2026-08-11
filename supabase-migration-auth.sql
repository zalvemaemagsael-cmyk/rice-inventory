-- Run this ONCE in your Supabase SQL Editor if you already ran the
-- original supabase-schema.sql (the one with "anon full access" policies)
-- before the login screen was added. It swaps those open policies for
-- ones that require a signed-in user. New setups don't need this file —
-- supabase-schema.sql already has the secure version built in.

drop policy if exists "anon full access" on rice_types;
drop policy if exists "anon full access" on suppliers;
drop policy if exists "anon full access" on supplier_purchases;
drop policy if exists "anon full access" on raw_purchases;
drop policy if exists "anon full access" on millings;
drop policy if exists "anon full access" on stock_outs;

create policy "authenticated full access" on rice_types for all to authenticated using (true) with check (true);
create policy "authenticated full access" on suppliers for all to authenticated using (true) with check (true);
create policy "authenticated full access" on supplier_purchases for all to authenticated using (true) with check (true);
create policy "authenticated full access" on raw_purchases for all to authenticated using (true) with check (true);
create policy "authenticated full access" on millings for all to authenticated using (true) with check (true);
create policy "authenticated full access" on stock_outs for all to authenticated using (true) with check (true);
