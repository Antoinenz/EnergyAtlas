# 📋 EnergyAtlas — Technical Plan & System Architecture

## 1. 🏗️ Tech Stack Overview

| Component | Technology / Service | Rationale |
|---|---|---|
| **Mobile Frontend** | React Native + Expo | Cross-platform (iOS/Android) with native map rendering, rapid UI development, and familiar React paradigm. |
| **Backend & Database** | Supabase (PostgreSQL) | Instant REST & GraphQL APIs, built-in Auth, Row Level Security (RLS), real-time subscriptions, and native PostGIS for geographic queries. |
| **Maps & Location** | `react-native-maps` / Mapbox GL | High-performance vector rendering, custom drink pin overlays, and smooth cluster rendering for dense store areas. |
| **Retailer Scrapers** | Parse.bot / Node.js Microservices | Extracting live stock & pricing from major supermarket web APIs without relying on brittle DOM scrapers. |
| **Image Hosting** | Supabase Storage | Storing user photo verification uploads, custom app assets, and high-res can artwork. |
| **Global Product Data** | Open Food Facts API | Jumpstart initial catalog barcode lookups and nutrition metadata. |

---

## 🗄️ 2. Database Schema Design (Supabase / Postgres)

### 2.1 `brands`
```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 `flavors` (Product Catalog)
```sql
CREATE TYPE availability_type AS ENUM ('standard', 'import', 'hard_to_find', 'discontinued');

CREATE TABLE flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    line_name TEXT, -- e.g. "Ultra", "Juice", "Rehab", "Pure Zero"
    description TEXT,
    rarity_tier TEXT DEFAULT 'common', -- e.g. "common", "uncommon", "rare", "grail"
    default_availability availability_type DEFAULT 'standard',
    caffeine_mg INT,
    volume_ml INT,
    image_url TEXT,
    barcode TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 `stores` (Locations)
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

### 2.4 `stock_reports` (Crowdsourced & Scraped Availability)
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

### 2.5 `user_profiles` & Gamification
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

---

## 🗺️ 3. Key Architectural Features

### 3.1 Freshness & Verification Algorithm
* Stock reports feature a **decay metric**. 
* After 14 days without user re-verification (`last_verified_at`), stock state converts to `Unverified`.
* After 30 days without verification, stock state drops from map rendering unless confirmed by another spotter.
* Users tapping *"Confirm Stock Still Here"* increment `verified_count` and refresh `last_verified_at`, earning +10 XP.

### 3.2 Automated Supermarket Integration
1. **Parse.bot Integration Pipeline:** Microservice runs scheduled cron jobs targeting major supermarket internal APIs.
2. **Upsert Logic:** Matching barcode / SKU data against existing `stores` and `flavors`. Automatically sets `is_automated_source = TRUE`.

---

## 🎯 4. Development Roadmap & Milestones

* **Phase 1: Core Catalog & Auth**
  * Supabase setup, Auth screens, Flavor catalog feed, Search & Filter by brand/line.
* **Phase 2: Interactive Map & Stock Logging**
  * Mapbox / `react-native-maps` integration, GPS pin creation, adding store locations and logging stock + price.
* **Phase 3: Gamification & Reviews**
  * Profile pages, review/comment threads, XP calculation, Badge triggers (e.g. "First Spotter").
* **Phase 4: Scrapers & Price Comparison**
  * Parse.bot setup for local supermarket inventory, price comparison view across stores.
