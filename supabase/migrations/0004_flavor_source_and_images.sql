-- Support for catalog data synced from external sources (Parse.bot scraping
-- Monster's own site) and locally-stored can artwork.

-- 1. Provenance + extra fields the scraper provides -----------------------

alter table flavors
    add column source text,          -- e.g. 'parsebot_monster'; null for manual/OFF rows
    add column source_slug text,     -- stable per-source id, used for idempotent upserts
    add column flavor_profile text,  -- short taste descriptor from the source
    add column sugar_g numeric(6, 2);

-- Idempotency for synced rows: one flavor per (source, source_slug). Partial
-- so it only applies to source-backed rows and never collides with the many
-- manual/OFF rows where source is null.
create unique index flavors_source_slug_key
    on flavors (source, source_slug)
    where source is not null;

-- 2. Storage bucket for can images ----------------------------------------

-- Public so the app can load `image_url` directly with no auth. Can art isn't
-- sensitive. Uploads happen via the service-role key in the sync script, which
-- bypasses RLS, so no storage.objects insert policy is needed here.
insert into storage.buckets (id, name, public)
values ('can-images', 'can-images', true)
on conflict (id) do nothing;
