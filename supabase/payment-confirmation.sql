-- Aplicar solo a la base de ICB. No altera estados ni importes de pedidos.
begin;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_response jsonb;
create unique index if not exists orders_payment_reference_unique
  on public.orders(payment_reference) where payment_reference is not null;
commit;
