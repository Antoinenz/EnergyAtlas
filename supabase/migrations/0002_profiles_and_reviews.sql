-- Phase 3: user profiles and flavor reviews/ratings.
-- Badges/XP (PLAN.md 2.5 community tables) are intentionally deferred to
-- Phase 4 and not created here yet -- see PLAN.md section 4.

-- 1. user_profiles ---------------------------------------------------------

create table user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique,
    avatar_url text,
    created_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "profiles are publicly readable"
    on user_profiles for select
    to anon, authenticated
    using (true);

create policy "users can update their own profile"
    on user_profiles for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- Auto-create a profile row when someone signs up, so the app never has to
-- juggle "auth user exists but profile doesn't" as a state. Username is a
-- placeholder (user_<8 hex chars>, collision odds are negligible for now)
-- that the app should prompt the user to change on first login.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.user_profiles (id, username)
    values (new.id, 'user_' || substr(new.id::text, 1, 8));
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function handle_new_user();

-- 2. reviews ----------------------------------------------------------------

create table reviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references user_profiles(id) on delete cascade,
    flavor_id uuid references flavors(id) on delete cascade,
    rating int not null check (rating >= 1 and rating <= 5),
    comment text,
    upvotes int not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, flavor_id)
);

create index reviews_flavor_id_idx on reviews(flavor_id);

alter table reviews enable row level security;

create policy "reviews are publicly readable"
    on reviews for select
    to anon, authenticated
    using (true);

create policy "authenticated users can write reviews"
    on reviews for insert
    to authenticated
    with check (user_id = auth.uid());

create policy "users can update their own reviews"
    on reviews for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "users can delete their own reviews"
    on reviews for delete
    to authenticated
    using (user_id = auth.uid());
