-- Swelt schema. Tables are locked down with RLS (no policies) and are only
-- reachable through SECURITY DEFINER functions that require the server secret
-- (SWELT_DB_SECRET). The app's server routes hold that secret; browsers never do.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  id int primary key default 1 check (id = 1),
  secret_sha256 text not null
);

create or replace function private.check_secret(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') <>
     (select secret_sha256 from private.app_config where id = 1) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end $$;

create table if not exists public.profiles (
  user_id text primary key,
  email text,
  credits numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  model_id text not null,
  endpoint_id text not null,
  kind text not null default 'image',
  source text not null default 'playground',
  status text not null default 'IN_QUEUE',
  runpod_job_id text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  media_url text,
  cost numeric(12,4) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generations_user_created on public.generations (user_id, created_at desc);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);
create index if not exists api_keys_user on public.api_keys (user_id);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.api_keys enable row level security;
revoke all on public.profiles, public.generations, public.api_keys from anon, authenticated;

-- ---------- RPCs ----------
create or replace function public.swelt_ensure_profile(p_secret text, p_user text, p_email text, p_credits numeric)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare r public.profiles;
begin
  perform private.check_secret(p_secret);
  insert into public.profiles (user_id, email, credits) values (p_user, p_email, p_credits)
  on conflict (user_id) do update set email = coalesce(excluded.email, public.profiles.email)
  returning * into r;
  return r;
end $$;

create or replace function public.swelt_add_credits(p_secret text, p_user text, p_amount numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare c numeric;
begin
  perform private.check_secret(p_secret);
  update public.profiles set credits = credits + p_amount where user_id = p_user returning credits into c;
  return c;
end $$;

create or replace function public.swelt_insert_generation(p_secret text, p_row jsonb)
returns public.generations language plpgsql security definer set search_path = '' as $$
declare r public.generations;
begin
  perform private.check_secret(p_secret);
  insert into public.generations (user_id, model_id, endpoint_id, kind, source, status, runpod_job_id, input)
  values (p_row->>'user_id', p_row->>'model_id', p_row->>'endpoint_id', coalesce(p_row->>'kind','image'),
          coalesce(p_row->>'source','playground'), coalesce(p_row->>'status','IN_QUEUE'),
          p_row->>'runpod_job_id', coalesce(p_row->'input','{}'::jsonb))
  returning * into r;
  return r;
end $$;

-- Finishing a generation charges its cost exactly once (only on the first transition to a final state).
create or replace function public.swelt_finish_generation(p_secret text, p_id uuid, p_status text, p_output jsonb,
  p_media_url text, p_cost numeric, p_error text, p_charge boolean)
returns public.generations language plpgsql security definer set search_path = '' as $$
declare r public.generations;
begin
  perform private.check_secret(p_secret);
  update public.generations set status = p_status, output = p_output, media_url = p_media_url,
    cost = coalesce(p_cost, 0), error = p_error, completed_at = now()
  where id = p_id and completed_at is null
  returning * into r;
  if r.id is not null and p_charge and coalesce(p_cost,0) > 0 then
    update public.profiles set credits = credits - p_cost where user_id = r.user_id;
  end if;
  if r.id is null then select * into r from public.generations where id = p_id; end if;
  return r;
end $$;

create or replace function public.swelt_set_job(p_secret text, p_id uuid, p_job text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.generations set runpod_job_id = p_job, status = p_status where id = p_id and completed_at is null;
end $$;

create or replace function public.swelt_get_generation(p_secret text, p_user text, p_id uuid)
returns public.generations language plpgsql security definer set search_path = '' as $$
declare r public.generations;
begin
  perform private.check_secret(p_secret);
  select * into r from public.generations where id = p_id and user_id = p_user;
  return r;
end $$;

create or replace function public.swelt_list_generations(p_secret text, p_user text, p_limit int, p_kind text)
returns setof public.generations language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select * from public.generations
    where user_id = p_user and (p_kind is null or kind = p_kind)
    order by created_at desc limit least(coalesce(p_limit, 50), 200);
end $$;

create or replace function public.swelt_stats(p_secret text, p_user text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform private.check_secret(p_secret);
  select jsonb_build_object(
    'requests_7d', (select count(*) from public.generations where user_id = p_user and created_at > now() - interval '7 days'),
    'errors_7d', (select count(*) from public.generations where user_id = p_user and status = 'FAILED' and created_at > now() - interval '7 days'),
    'cost_7d', (select coalesce(sum(cost),0) from public.generations where user_id = p_user and created_at > now() - interval '7 days'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'requests', coalesce(x.n,0), 'errors', coalesce(x.e,0)) order by d), '[]'::jsonb)
              from generate_series(current_date - 6, current_date, interval '1 day') d
              left join (select created_at::date dd, count(*) n, count(*) filter (where status='FAILED') e
                         from public.generations where user_id = p_user and created_at > now() - interval '8 days' group by 1) x on x.dd = d::date),
    'recent_models', (select coalesce(jsonb_agg(m order by last desc), '[]'::jsonb) from
              (select model_id m, max(created_at) last from public.generations where user_id = p_user group by model_id order by 2 desc limit 8) t)
  ) into res;
  return res;
end $$;

create or replace function public.swelt_create_api_key(p_secret text, p_user text, p_name text, p_prefix text, p_hash text)
returns public.api_keys language plpgsql security definer set search_path = '' as $$
declare r public.api_keys;
begin
  perform private.check_secret(p_secret);
  insert into public.api_keys (user_id, name, prefix, key_hash) values (p_user, p_name, p_prefix, p_hash) returning * into r;
  return r;
end $$;

create or replace function public.swelt_list_api_keys(p_secret text, p_user text)
returns table (id uuid, name text, prefix text, created_at timestamptz, last_used_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  return query select k.id, k.name, k.prefix, k.created_at, k.last_used_at from public.api_keys k
    where k.user_id = p_user and not k.revoked order by k.created_at desc;
end $$;

create or replace function public.swelt_revoke_api_key(p_secret text, p_user text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_secret(p_secret);
  update public.api_keys set revoked = true where id = p_id and user_id = p_user;
end $$;

create or replace function public.swelt_resolve_api_key(p_secret text, p_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare u text;
begin
  perform private.check_secret(p_secret);
  update public.api_keys set last_used_at = now() where key_hash = p_hash and not revoked returning user_id into u;
  return u;
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'swelt\_%' loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
revoke all on function private.check_secret(text) from public, anon, authenticated;
