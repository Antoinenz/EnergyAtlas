# EnergyAtlas (formerly Monstermap)

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
└── src/                   # React Native (Expo) app source
```

## Quick start (development)

```bash
git clone https://github.com/your-username/energy-atlas.git
cd energy-atlas
npm install
npx expo start
```

Nothing runs against a real Supabase instance yet — see PLAN.md for setup once the schema is applied.

## Contributing

See PLAN.md for the schema, architecture decisions, and roadmap.
