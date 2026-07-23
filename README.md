# EnergyAtlas

A crowdsourced map and flavor catalog for energy drink collectors and import hunters.

## Overview

EnergyAtlas helps people find where specific energy drink flavors are in stock nearby, at what price, and log/rate the ones they've tried. It started as a Monster Energy tracker and is built to extend to other brands (Rockstar, Red Bull, C4, Ghost, Prime, and imported Japanese/Korean/regional lines) once the core works for one.

The two things it actually does:

- Tells you where a flavor is in stock and how much it costs, based on reports from other users.
- Gives you a catalog to log what you've tried, with ratings and notes.

Everything else (badges, leaderboards, automated scrapers) is downstream of those two working.

## Features

### Stock & price map
- Map of stores (supermarkets, dairies/convenience, gas stations, specialty import shops) with reported flavor stock and price.
- Users log what they see, with an optional photo as proof.
- Reports decay over time (`fresh` → `unverified` → dropped) unless someone re-confirms them. See PLAN.md for the exact timing.

### Flavor catalog
- Flavors organized by brand, line (Ultra, Juice, Hydro, Java, etc.), region, and availability (standard, import, limited, discontinued).
- Flavor detail: taste notes, nutrition, caffeine content, packaging history.
- Personal log: mark tried, rate 1–5, keep notes.

### Community layer (later phase, not v1)
- Rarity tiers and spotter badges/XP for finding rare stock or confirming outdated listings.
- Friends, leaderboards, comment threads on reviews.

This layer only makes sense once there's enough real usage to compete over. It's in the plan, not in the first build.

## Project structure

```
├── README.md              # This file
├── PLAN.md                # Technical plan: schema, architecture, roadmap
├── docs/                  # Design assets, wireframes, API notes
├── supabase/
│   └── migrations/        # SQL schema + RLS policies, applied in order
├── scripts/
│   └── seed-off.mjs       # Bootstraps brands/flavors from Open Food Facts
└── src/                   # React Native (Expo) app source
```

## Quick start (development)

Requires Node 22+, Docker (for the local Supabase stack), and the Expo Go
app on your phone (or a simulator) to actually see it running.

```bash
git clone https://github.com/your-username/energy-atlas.git
cd energy-atlas

# 1. Start the local backend (Postgres + Auth + API), applies migrations
#    in supabase/migrations/ automatically.
npx supabase start

# 2. Point the app at it.
cd src
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_ANON_KEY from `npx supabase status` (run from repo root)

# 3. Install and run.
npm install
npx expo start
```

The catalog will be empty on first run. Seed it from Open Food Facts:

```bash
# from the repo root
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=...   # from `npx supabase status`
npm install
npm run seed:off -- --brand-name "Monster Energy" --brand-tag monster-energy
```

OFF coverage is inconsistent (missing quantities, no imports/limited
editions), so treat this as a starting point, not a complete catalog.

To reset the local database to match the latest migrations:

```bash
npx supabase db reset
```

## Contributing

See PLAN.md for the schema, architecture decisions, and roadmap.
