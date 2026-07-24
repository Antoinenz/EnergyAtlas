// Shared domain types. These mirror the columns in supabase/migrations.
// Not generated from the DB yet -- once the schema stabilizes, switch to
// `supabase gen types typescript` and delete the hand-written versions.

export type RarityTier = "common" | "uncommon" | "rare" | "grail";
export type Availability = "standard" | "import" | "hard_to_find" | "discontinued";

export type Flavor = {
  id: string;
  name: string;
  line_name: string | null;
  description: string | null;
  rarity_tier: RarityTier;
  default_availability: Availability;
  caffeine_mg: number | null;
  volume_ml: number | null;
  image_url: string | null;
  barcode: string | null;
  brands: { name: string } | null;
};

// Navigation param lists. Keeping these here so screens can import a single
// source of truth for their route params.
export type CatalogStackParamList = {
  CatalogList: undefined;
  FlavorDetail: { flavorId: string; flavorName: string };
};

export type RootTabParamList = {
  Catalog: undefined;
  Map: undefined;
  Profile: undefined;
};
