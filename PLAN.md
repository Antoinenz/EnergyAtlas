# EnergyAtlas — Technical Plan

## 1. Tech stack

| Component | Choice | Why |
|---|---|---|
| Mobile frontend | React Native + Expo | Cross-platform, native map support, fast iteration. |
| Backend & database | Supabase (Postgres) | Auth, RLS, realtime, and PostGIS for geo queries out of the box. |
| Maps | `react-native-maps` (Mapbox GL if clustering/styling needs outgrow it) | Start with the simpler option; don't reach for Mapbox until pin density actually requires it. |
| Image hosting | Supabase Storage | Photo verification uploads, can artwork. |
| Initial product data | Open Food Facts API | Seed the catalog by barcode instead of entering everything by hand. |
| Brand catalog scrape | Parse.bot (Monster site) | Daily job pulls Monster's own catalog + high-res transparent can art into our DB/Storage. Catalog enrichment only — see §3.2. |
| Retailer stock scrapers | Not in v1 | See §3.2 — scraping supermarket stock/pricing is the risky idea, still deferred. |

## 2. Database schema (Supabase / Postgres)

### 2.1 `brands`
```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 `flavors` (product catalog)
```sql
CREATE TYPE availability_type AS ENUM ('standard', 'import', 'hard_to_find', 'discontinued');

CREATE TABLE flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    line_name TEXT, -- e.g. "Ultra", "Juice", "Rehab", "Pure Zero"
    description TEXT,
    rarity_tier TEXT DEFAULT 'common', -- "common" | "uncommon" | "rare" | "grail"
    default_availability availability_type DEFAULT 'standard',
    caffeine_mg INT,
    volume_ml INT,
    image_url TEXT,
    barcode TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 `stores` (locations)
```sql
CREATE TYPE store_type AS ENUM ('supermarket', 'dairy_convenience', 'gas_station', 'specialty_import');

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    store_type store_type NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- PostGIS spatial index
    created_by UUID REFERENCES auth.users(id),
    is_automated_source BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 `stock_reports` (crowdsourced availability)
```sql
CREATE TABLE stock_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    flavor_id UUID REFERENCES flavors(id) ON DELETE CASCADE,
    price_local NUMERIC(6, 2),
    currency CHAR(3) DEFAULT 'NZD',
    in_stock BOOLEAN DEFAULT TRUE,
    photo_url TEXT,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_count INT DEFAULT 1,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.5 `user_profiles` and community tables (later phase)
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    xp_points INT DEFAULT 0,
    spotter_rank TEXT DEFAULT 'Novice Spotter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    flavor_id UUID REFERENCES flavors(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- e.g. "first_spotter", "import_king"
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT
);

CREATE TABLE user_badges (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);
```

`reviews` (ratings/notes) is useful from day one and cheap to build — keep it early. `badges`/`user_badges`/XP are the part to actually defer; they only matter once there's a userbase to compete within.

## 3. Architectural notes

### 3.1 Freshness/verification
- A stock report with no re-verification for 14 days flips to `unverified`.
- After 30 days unverified, it drops off the map unless someone confirms it's still there.
- Tapping "still here" bumps `verified_count` and resets `last_verified_at`.

This only works if there's enough report volume that decay doesn't just mean "the map is always empty." Worth watching once real data exists — the 14/30-day windows are a starting guess, not a tested number.

### 3.2 Scraping — catalog yes, retailer stock no
Two very different uses get lumped under "scraping"; they carry very different risk.

**Catalog enrichment (in use).** A daily Parse.bot job (`scripts/sync-parsebot.mjs`, cron at 04:00) pulls Monster's own published catalog — names, descriptions, caffeine/volume, and high-res transparent can art — and stores all of it in our own DB + Storage bucket. The app never calls Parse.bot; it only reads what the job wrote. This is low-risk (a brand's public product listing), idempotent (upsert on `source_slug`), and degrades fine if the source is down (we keep the last copy). It doesn't cover every flavor — imports/limited editions aren't on the Monster site — so it supplements manual/OFF entry, it doesn't replace it.

**Retailer stock/pricing (still deferred).** Pulling live stock/pricing from supermarket chains sounds like the highest-leverage feature (instant map density, no user effort), which is exactly why it's tempting to build first. Don't:
- Major retailers don't publish public stock/price APIs; anything reachable is an internal API not meant for third-party use — a ToS risk and a maintenance burden (it changes or blocks you without notice).
- It replaces the exact crowdsourcing behavior the app depends on. If the map is fully scraper-fed, there's no reason for a user to ever submit a report, and the community layer has nothing to stand on.
- Phase-5 experiment on a single retailer, evaluated for legal/ToS risk first — not a launch feature.

### 3.3 Cold start
The map is the headline feature and it's worthless with zero data. Before any of the map/scraper work, decide who enters the first ~100 store/stock records and in what city. Realistic options: seed it yourself in your own city, or recruit a handful of people from an existing energy-drink collecting community (Reddit/Facebook groups already exist for this) to seed before public launch. This should be a launch task, not an afterthought.

## 4. Roadmap

- **Phase 0: Seed data plan.** Decide the launch city/region, seed ~50-100 stores manually, pull an initial flavor set from Open Food Facts + manual entry for anything missing. No app code depends on this, but nothing else matters without it.
- **Phase 1: Catalog & auth.** Supabase setup, auth screens, flavor catalog browse/search/filter by brand & line.
- **Phase 2: Map & stock logging.** `react-native-maps` integration, store pins (manual add), log stock + price + photo, freshness decay.
- **Phase 3: Reviews & ratings.** Per-flavor rating/notes, personal "tried" list. (Cheap, ship alongside phase 1 or 2 if time allows.)
- **Phase 4: Community layer.** Profiles, badges, XP, leaderboards, comment threads — once there's a real userbase generating reports to compete over.
- **Phase 5 (experimental, not committed): retailer scraper.** One retailer, evaluated for ToS/legal risk first, treated as an addition to crowdsourced data rather than a replacement for it.
