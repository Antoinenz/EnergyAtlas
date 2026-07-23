-- Phase 1-2 core schema: catalog (brands, flavors), stores, and crowdsourced stock reports.
-- See PLAN.md section 2 for the design rationale.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- 1. brands -------------------------------------------------------------

create table brands (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    logo_url text,
    created_at timestamptz not null default now()
);

alter table brands enable row level security;

create policy "brands are publicly readable"
    on brands for select
    to anon, authenticated
    using (true);

-- No insert/update/delete policy: catalog data is curated via the seed
-- script (service role key) for now. Revisit once there's a moderation
-- flow for community-submitted brands.

-- 2. flavors (product catalog) -------------------------------------------

create type availability_type as enum ('standard', 'import', 'hard_to_find', 'discontinued');
create type rarity_tier_type as enum ('common', 'uncommon', 'rare', 'grail');

create table flavors (
    id uuid primary key default gen_random_uuid(),
    brand_id uuid references brands(id) on delete cascade,
    name text not null,
    line_name text, -- e.g. "Ultra", "Juice", "Rehab", "Pure Zero"
    description text,
    rarity_tier rarity_tier_type not null default 'common',
    default_availability availability_type not null default 'standard',
    caffeine_mg int,
    volume_ml int,
    image_url text,
    barcode text unique,
    created_at timestamptz not null default now()
);

create index flavors_brand_id_idx on flavors(brand_id);

alter table flavors enable row level security;

create policy "flavors are publicly readable"
    on flavors for select
    to anon, authenticated
    using (true);

-- Same as brands: writes go through the seed script / service role for now.

-- 3. stores (locations) ---------------------------------------------------

create type store_type as enum ('supermarket', 'dairy_convenience', 'gas_station', 'specialty_import');

create table stores (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    store_type store_type not null,
    address text,
    latitude double precision not null,
    longitude double precision not null,
    location geography(point, 4326),
    created_by uuid references auth.users(id) on delete set null,
    is_automated_source boolean not null default false,
    created_at timestamptz not null default now()
);

create index stores_location_idx on stores using gist(location);

-- Keep `location` in sync with latitude/longitude so callers only ever
-- need to supply the plain columns.
create or replace function stores_set_location()
returns trigger
language plpgsql
as $$
begin
    new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
    return new;
end;
$$;

create trigger stores_set_location_trigger
    before insert or update of latitude, longitude on stores
    for each row
    execute function stores_set_location();

alter table stores enable row level security;

create policy "stores are publicly readable"
    on stores for select
    to anon, authenticated
    using (true);

create policy "authenticated users can add stores"
    on stores for insert
    to authenticated
    with check (created_by = auth.uid());

create policy "creators can update their own stores"
    on stores for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

-- 4. stock_reports (crowdsourced availability) ----------------------------

create table stock_reports (
    id uuid primary key default gen_random_uuid(),
    store_id uuid references stores(id) on delete cascade,
    flavor_id uuid references flavors(id) on delete cascade,
    price_local numeric(6, 2),
    currency char(3) not null default 'NZD',
    in_stock boolean not null default true,
    photo_url text,
    reported_by uuid references auth.users(id) on delete set null,
    verified_count int not null default 1,
    last_verified_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index stock_reports_store_id_idx on stock_reports(store_id);
create index stock_reports_flavor_id_idx on stock_reports(flavor_id);
create index stock_reports_last_verified_at_idx on stock_reports(last_verified_at);

alter table stock_reports enable row level security;

create policy "stock reports are publicly readable"
    on stock_reports for select
    to anon, authenticated
    using (true);

create policy "authenticated users can log stock reports"
    on stock_reports for insert
    to authenticated
    with check (reported_by = auth.uid());

create policy "reporters can update their own stock reports"
    on stock_reports for update
    to authenticated
    using (reported_by = auth.uid())
    with check (reported_by = auth.uid());

-- Freshness helper: PLAN.md's decay windows (14 days -> unverified, 30 days
-- -> dropped) are read at query time rather than stored, so the numbers can
-- change without a migration. A view keeps that logic in one place.
create view stock_reports_with_status as
select
    sr.*,
    case
        when sr.last_verified_at >= now() - interval '14 days' then 'fresh'
        when sr.last_verified_at >= now() - interval '30 days' then 'unverified'
        else 'stale'
    end as freshness_status
from stock_reports sr;
