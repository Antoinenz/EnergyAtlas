import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import {
  AVAILABILITY_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
} from "../lib/format";
import type { CatalogStackParamList, Flavor } from "../lib/types";

type Props = NativeStackScreenProps<CatalogStackParamList, "FlavorDetail">;

const FLAVOR_COLUMNS =
  "id, name, line_name, description, rarity_tier, default_availability, caffeine_mg, volume_ml, image_url, barcode, brands(name)";

export default function FlavorDetailScreen({ route, navigation }: Props) {
  const { flavorId, flavorName } = route.params;
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Show the name in the header immediately from route params, before the
  // full row loads.
  useLayoutEffect(() => {
    navigation.setOptions({ title: flavorName });
  }, [navigation, flavorName]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("flavors")
        .select(FLAVOR_COLUMNS)
        .eq("id", flavorId)
        .single<Flavor>();
      if (!active) return;
      if (error) setError(error.message);
      else setFlavor(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [flavorId]);

  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (error || !flavor) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          Couldn't load this flavor{error ? `: ${error}` : ""}.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {flavor.image_url ? (
        <Image source={{ uri: flavor.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No image</Text>
        </View>
      )}

      <Text style={styles.name}>{flavor.name}</Text>
      <Text style={styles.subtitle}>
        {flavor.brands?.name ?? "Unknown brand"}
        {flavor.line_name ? ` · ${flavor.line_name}` : ""}
      </Text>

      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: RARITY_COLORS[flavor.rarity_tier] },
          ]}
        >
          <Text style={styles.badgeText}>
            {RARITY_LABELS[flavor.rarity_tier]}
          </Text>
        </View>
        <View style={[styles.badge, styles.availBadge]}>
          <Text style={styles.availBadgeText}>
            {AVAILABILITY_LABELS[flavor.default_availability]}
          </Text>
        </View>
      </View>

      {flavor.description ? (
        <Text style={styles.description}>{flavor.description}</Text>
      ) : null}

      <View style={styles.specs}>
        <Spec label="Caffeine" value={flavor.caffeine_mg != null ? `${flavor.caffeine_mg} mg` : "—"} />
        <Spec label="Volume" value={flavor.volume_ml != null ? `${flavor.volume_ml} ml` : "—"} />
        <Spec label="Barcode" value={flavor.barcode ?? "—"} />
      </View>

      <Text style={styles.stockNote}>
        Stock & prices for this flavor will show here once the map and stock
        reporting land (Phase 2).
      </Text>
    </ScrollView>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  spinner: { marginTop: 32 },
  error: { color: "#b00020", marginTop: 24 },
  image: { width: "100%", height: 220, borderRadius: 12, resizeMode: "contain" },
  imagePlaceholder: {
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { color: "#999" },
  name: { fontSize: 24, fontWeight: "700", marginTop: 16 },
  subtitle: { fontSize: 15, color: "#666", marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  availBadge: { backgroundColor: "#e5e7eb" },
  availBadgeText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  description: { fontSize: 15, lineHeight: 22, color: "#333", marginTop: 16 },
  specs: {
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  specLabel: { fontSize: 15, color: "#666" },
  specValue: { fontSize: 15, fontWeight: "500" },
  stockNote: {
    marginTop: 24,
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
});
