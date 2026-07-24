import type { Availability, RarityTier } from "./types";

export const RARITY_LABELS: Record<RarityTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  grail: "Grail",
};

export const RARITY_COLORS: Record<RarityTier, string> = {
  common: "#6b7280",
  uncommon: "#2563eb",
  rare: "#7c3aed",
  grail: "#b45309",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  standard: "Standard",
  import: "Import",
  hard_to_find: "Hard to find",
  discontinued: "Discontinued",
};
