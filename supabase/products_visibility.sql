-- Permite ocultar productos de la tienda sin eliminarlos del inventario.
alter table public.products
  add column if not exists is_visible boolean not null default true;

-- Compatibilidad con filas creadas antes de esta migración.
update public.products
set is_visible = true
where is_visible is null;

create index if not exists products_is_visible_idx
  on public.products (is_visible);
