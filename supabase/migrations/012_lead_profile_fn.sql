-- 012_lead_profile_fn.sql
-- Função SECURITY DEFINER para buscar compras de um lead pelo email.
-- Necessária para acessar auth.users sem expor dados ao cliente diretamente.

create or replace function get_purchases_by_email(p_email text)
returns table (
  product_id        uuid,
  product_name      text,
  purchased_at      timestamptz,
  stripe_session_id text
)
security definer
set search_path = public
language sql
stable
as $$
  select
    ua.product_id,
    p.name        as product_name,
    ua.purchased_at,
    ua.stripe_session_id
  from user_access ua
  join products   p on p.id  = ua.product_id
  join auth.users u on u.id  = ua.user_id
  where lower(u.email) = lower(p_email)
    and (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      or auth.role() = 'service_role'
    )
  order by ua.purchased_at desc
$$;

grant execute on function get_purchases_by_email(text) to authenticated;
