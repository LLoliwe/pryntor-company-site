-- Pryntor early list on Supabase (free plan). Run once in the SQL editor of a founder-owned project.
-- Visitors never read the table directly; they can only call join_waitlist().
create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id bigserial primary key,
  email text not null unique check (position('@' in email) > 1 and length(email) <= 254),
  referral_code text not null unique default substr(encode(gen_random_bytes(6), 'hex'), 1, 10),
  referred_by text references public.waitlist(referral_code),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.waitlist enable row level security;
-- No policies: the anon role cannot select, insert, update or delete rows.

create or replace function public.join_waitlist(p_email text, p_ref text default null, p_consent boolean default false)
returns table(out_position bigint, out_code text)
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_code text; v_ref text;
begin
  if not coalesce(p_consent, false) then raise exception 'consent required'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  select w.referral_code into v_ref from waitlist w where w.referral_code = p_ref and w.unsubscribed_at is null;
  insert into waitlist(email, referred_by) values (v_email, v_ref)
    on conflict (email) do update set unsubscribed_at = null
    returning waitlist.referral_code into v_code;
  return query
    with scored as (
      select w.referral_code as code,
             extract(epoch from w.created_at) - 86400 * (select count(*) from waitlist r where r.referred_by = w.referral_code and r.unsubscribed_at is null) as score
      from waitlist w where w.unsubscribed_at is null)
    select (select count(*) from scored s2 where s2.score <= s1.score)::bigint, s1.code from scored s1 where s1.code = v_code;
end $$;
revoke all on function public.join_waitlist(text, text, boolean) from public;
grant execute on function public.join_waitlist(text, text, boolean) to anon;
-- Each confirmed referral moves a person up as if they had joined one day earlier.
