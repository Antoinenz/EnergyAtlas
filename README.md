# ⚡ EnergyAtlas (formerly Monstermap)

> **The ultimate crowdsourced locator, flavor catalog, and community network for energy drink enthusiasts and import hunters.**

---

## 📌 Overview

**EnergyAtlas** is a mobile application built for energy drink collectors, import seekers, and casual fans looking for the best local prices. While originally conceived to track rare **Monster Energy** cans, EnergyAtlas is designed to scale across all major energy drink brands (Rockstar, Red Bull, C4, Ghost, Prime, Japanese/Korean imports, and obscure regional specialty drinks).

Whether you're looking for a rare imported US *Java Monster*, checking which local dairy has the cheapest *Ultra Peachy Keen*, or competing with friends to complete your virtual can collection, **EnergyAtlas** connects you to the live community-driven energy drink network.

---

## 🔥 Key Features

### 1. 🗺️ Live Community Stock & Price Map
* **Interactive Map Pins:** Spot nearby stores, independent dairies, gas stations, and supermarkets carrying your favorite flavors.
* **Crowdsourced Inventory:** Users log stocked flavors, prices, and photo proof on-the-go.
* **Supermarket Aggregation:** Automated background scrapers (via Parse.bot) pull live stock and pricing data from major supermarket chains.
* **Stock Freshness Decay:** Automated status indicators (`Verified Fresh`, `Unverified`, `Out of Stock`) ensure map accuracy over time.

### 2. 📖 Complete Flavor Catalog & "DrinkDex"
* **Comprehensive Library:** Full database of flavors categorized by Brand, Line (e.g., *Monster Ultra*, *Juice*, *Hydro*, *Java*, *Rockstar Punch*), Region (US, Japan, EU, ANZ), and Availability Status (*Standard*, *Import*, *Limited Edition*, *Discontinued*).
* **Detailed Taste Profiles:** Flavor notes, nutritional breakdown, caffeine content, and packaging design history.
* **Personal Logging & Ratings:** Rate flavors on a 5-star scale, write tasting reviews, and maintain your personal "Tried & Collected" digital shelf.

### 3. 🎮 Gamification & Social Network
* **Rarity Tier System:** Flavors are tiered from `Common` to `Ultra Rare / Grail`.
* **Spotter Badges & Achievements:** Earn XP and unlock badges for being the first to spot a rare flavor in your city, verifying outdated store stock, or submitting accurate price updates.
* **Leaderboards & Competitions:** Add friends, compare collected can counts, and compete for top regional spotter rankings.
* **Community Discussions:** Comment threads, upvote/downvote reviews, and share import leads with local hunters.

---

## 🛠️ Project Structure

```
├── README.md              # High-level project summary and feature overview
├── PLAN.md                # Comprehensive technical specification & implementation plan
├── docs/                  # Design assets, wireframes, and API documentation
└── src/                   # React Native (Expo) app source code
```

---

## 🚀 Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/energy-atlas.git
   cd energy-atlas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Expo Development Server:**
   ```bash
   npx expo start
   ```

---

## 🤝 Contributing & Community

Contributions are welcome! Check out `PLAN.md` for our technical roadmap, database schema, and upcoming developer milestones.
