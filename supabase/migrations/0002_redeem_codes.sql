-- Single-use redeem codes that add credits (sold e.g. on marketplaces).
create table if not exists public.redeem_codes (
  code text primary key,
  credits numeric(12,4) not null check (credits > 0),
  note text,
  created_at timestamptz not null default now(),
  redeemed_by text,
  redeemed_email text,
  redeemed_at timestamptz
);
alter table public.redeem_codes enable row level security;
revoke all on public.redeem_codes from anon, authenticated;

create or replace function public.swelt_create_codes(p_secret text, p_codes text[], p_credits numeric, p_note text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check_secret(p_secret);
  insert into public.redeem_codes (code, credits, note)
  select upper(c), p_credits, nullif(p_note, '') from unnest(p_codes) as c
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.swelt_redeem_code(p_secret text, p_user text, p_email text, p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare amt numeric; bal numeric;
begin
  perform private.check_secret(p_secret);
  update public.redeem_codes
     set redeemed_by = p_user, redeemed_email = p_email, redeemed_at = now()
   where code = upper(trim(p_code)) and redeemed_by is null
  returning credits into amt;
  if amt is null then
    raise exception 'invalid_or_used' using errcode = 'P0001';
  end if;
  update public.profiles set credits = credits + amt where user_id = p_user returning credits into bal;
  if bal is null then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  return jsonb_build_object('added', amt, 'credits', bal);
end $$;

create or replace function public.swelt_list_codes(p_secret text, p_limit int)
returns setof public.redeem_codes language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select * from public.redeem_codes order by created_at desc, code limit greatest(1, least(p_limit, 1000));
end $$;

create or replace function public.swelt_delete_code(p_secret text, p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  delete from public.redeem_codes where code = upper(p_code) and redeemed_by is null;
  return found;
end $$;

revoke all on function public.swelt_create_codes(text, text[], numeric, text) from public;
revoke all on function public.swelt_redeem_code(text, text, text, text) from public;
revoke all on function public.swelt_list_codes(text, int) from public;
revoke all on function public.swelt_delete_code(text, text) from public;
grant execute on function public.swelt_create_codes(text, text[], numeric, text) to anon, authenticated;
grant execute on function public.swelt_redeem_code(text, text, text, text) to anon, authenticated;
grant execute on function public.swelt_list_codes(text, int) to anon, authenticated;
grant execute on function public.swelt_delete_code(text, text) to anon, authenticated;
