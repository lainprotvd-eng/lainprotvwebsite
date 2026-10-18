-- Run once in the Supabase SQL Editor. All application access uses RLS.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.map_projects (slug text primary key);
insert into public.map_projects(slug) values
('ice-scream-1'),('ice-scream-1-j-asks-for-help'),('ice-scream-2'),
('ice-scream-2-charlies-revenge'),('ice-scream-3'),('ice-scream-4'),
('ice-scream-5'),('ice-scream-6'),('ice-scream-7'),('ice-scream-8'),
('dark-internet'),('the-twins');
alter table public.map_projects enable row level security;
create policy "Projects are public" on public.map_projects for select using(true);

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
 created_at timestamptz not null default now()
);
create unique index profiles_username_ci on public.profiles(lower(username));
alter table public.profiles enable row level security;
create policy "Public nicknames" on public.profiles for select using(true);
create policy "Create own profile" on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "Edit own nickname" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

create table app_private.review_moderators (user_id uuid primary key references auth.users(id) on delete cascade);
create table app_private.review_bans (user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on app_private.review_moderators,app_private.review_bans from public,anon,authenticated;
create function public.is_review_moderator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from app_private.review_moderators where user_id=auth.uid());
$$;
create function app_private.can_review() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 and not exists(select 1 from app_private.review_bans b where b.user_id=auth.uid());
$$;
-- Policies may call this function, but users cannot access the private tables.
grant usage on schema app_private to authenticated;
grant execute on function app_private.can_review() to authenticated;

create table public.map_reviews (
 id uuid primary key default gen_random_uuid(),
 project_slug text not null references public.map_projects(slug),
 user_id uuid not null references public.profiles(id) on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 body text not null check(char_length(btrim(body)) between 5 and 2000),
 hidden boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint one_review_per_account_per_project unique(project_slug,user_id)
);
create index map_reviews_project_created on public.map_reviews(project_slug,created_at desc) where not hidden;
alter table public.map_reviews enable row level security;
create policy "Read published or own reviews" on public.map_reviews for select using(not hidden or user_id=(select auth.uid()) or (select public.is_review_moderator()));
create policy "Confirmed members create own reviews" on public.map_reviews for insert to authenticated with check(user_id=(select auth.uid()) and not hidden and (select app_private.can_review()));
create policy "Members edit own visible review" on public.map_reviews for update to authenticated using(user_id=(select auth.uid()) and not hidden and (select app_private.can_review())) with check(user_id=(select auth.uid()) and not hidden and (select app_private.can_review()));

create function app_private.review_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.hidden:=false;
  new.created_at:=now();
 elsif new.id<>old.id or new.project_slug<>old.project_slug or new.user_id<>old.user_id or new.created_at<>old.created_at then
  raise exception 'Review ownership and creation date cannot be changed';
 end if;
 new.body:=btrim(new.body);
 new.updated_at:=now();
 return new;
end $$;
create trigger review_guard before insert or update on public.map_reviews for each row execute function app_private.review_guard();

create function public.review_summary(project text) returns table(review_count bigint,average_rating numeric)
language sql stable security definer set search_path='' as $$
 select count(*),round(avg(rating),2) from public.map_reviews where project_slug=project and not hidden;
$$;
create function public.hide_review(review_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_review_moderator() then raise insufficient_privilege using message='Moderator access required'; end if;
 -- Soft removal keeps the unique account/project slot and prevents reposting spam.
 update public.map_reviews set hidden=true where id=review_id;
end $$;

revoke all on public.map_projects,public.profiles,public.map_reviews from anon,authenticated;
grant select on public.map_projects,public.profiles,public.map_reviews to anon,authenticated;
grant insert(id,username) on public.profiles to authenticated;
grant update(username) on public.profiles to authenticated;
grant insert(project_slug,user_id,rating,body) on public.map_reviews to authenticated;
grant update(rating,body) on public.map_reviews to authenticated;
revoke all on function public.is_review_moderator(), public.review_summary(text), public.hide_review(uuid) from public;
grant execute on function public.is_review_moderator(),public.review_summary(text) to anon,authenticated;
grant execute on function public.hide_review(uuid) to authenticated;
revoke all on function app_private.review_guard(),app_private.can_review() from public;
grant execute on function app_private.can_review() to authenticated;
commit;

-- AFTER creating and confirming the owner's account, run this separately:
-- insert into app_private.review_moderators(user_id)
-- select id from auth.users where email = 'YOUR_OWNER_EMAIL';
-- To ban a spam account, insert its UUID into app_private.review_bans.
