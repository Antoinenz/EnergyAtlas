import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/format";
import type { CatalogStackParamList, Flavor } from "../lib/types";

type Props = NativeStackScreenProps<CatalogStackParamList, "CatalogList">;

const FLAVOR_COLUMNS =
  "id, name, line_name, description, rarity_tier, default_availability, caffeine_mg, volume_ml, image_url, barcode, brands(name)";

export default function CatalogScreen({ navigation }: Props) {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadFlavors = useCallback(async () => {
    const { data, error } = await supabase
      .from("flavors")
      .select(FLAVOR_COLUMNS)
      .order("name")
      .returns<Flavor[]>();

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setFlavors(data ?? []);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadFlavors();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadFlavors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFlavors();
    setRefreshing(false);
  }, [loadFlavors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flavors;
    return flavors.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.brands?.name.toLowerCase().includes(q) ||
        f.line_name?.toLowerCase().includes(q)
    );
  }, [flavors, query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search flavors, brands, lines..."
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {loading && <ActivityIndicator style={styles.spinner} />}

      {error && !loading && (
        <Text style={styles.error}>
          Couldn't load flavors: {error}
          {"\n"}Pull to retry. Is the Supabase stack running?
        </Text>
      )}

      {!loading && !error && flavors.length === 0 && (
        <Text style={styles.empty}>
          No flavors yet. Seed the catalog from the repo root
          (`npm run seed:off`) or add some by hand.
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 && styles.listEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              navigation.navigate("FlavorDetail", {
                flavorId: item.id,
                flavorName: item.name,
              })
            }
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.rowMain}>
              <Text style={styles.flavorName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.flavorMeta}>
                {item.brands?.name ?? "Unknown brand"}
                {item.line_name ? ` · ${item.line_name}` : ""}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: RARITY_COLORS[item.rarity_tier] },
              ]}
            >
              <Text style={styles.badgeText}>
                {RARITY_LABELS[item.rarity_tier]}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
  },
  spinner: { marginTop: 24 },
  error: { color: "#b00020", marginBottom: 12 },
  empty: { color: "#666", marginBottom: 12 },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  rowPressed: { opacity: 0.5 },
  thumb: { width: 44, height: 56, marginRight: 12, resizeMode: "contain" },
  thumbPlaceholder: { backgroundColor: "#f2f2f2", borderRadius: 6 },
  rowMain: { flex: 1 },
  flavorName: { fontSize: 16, fontWeight: "500" },
  flavorMeta: { fontSize: 13, color: "#666", marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});
