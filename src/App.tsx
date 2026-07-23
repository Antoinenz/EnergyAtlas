import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "./lib/supabase";

// Phase 1: catalog browse/search. Deliberately no navigation library yet --
// this is one screen until there's a second screen worth routing to.

type Flavor = {
  id: string;
  name: string;
  line_name: string | null;
  rarity_tier: string;
  default_availability: string;
  brands: { name: string } | null;
};

export default function App() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFlavors() {
      const { data, error } = await supabase
        .from("flavors")
        .select("id, name, line_name, rarity_tier, default_availability, brands(name)")
        .order("name")
        .returns<Flavor[]>();

      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setFlavors(data ?? []);
      }
      setLoading(false);
    }

    loadFlavors();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>EnergyAtlas Catalog</Text>
      <TextInput
        style={styles.search}
        placeholder="Search flavors, brands, lines..."
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {loading && <ActivityIndicator style={styles.spinner} />}

      {error && (
        <Text style={styles.error}>
          Couldn't load flavors: {error}
          {"\n"}Is `supabase start` running and .env pointed at it?
        </Text>
      )}

      {!loading && !error && flavors.length === 0 && (
        <Text style={styles.empty}>
          No flavors yet. Run `npm run seed:off` from the repo root to seed
          from Open Food Facts.
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.flavorName}>{item.name}</Text>
            <Text style={styles.flavorMeta}>
              {item.brands?.name ?? "Unknown brand"}
              {item.line_name ? ` · ${item.line_name}` : ""} · {item.rarity_tier}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 12,
  },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  spinner: {
    marginTop: 24,
  },
  error: {
    color: "#b00020",
    marginBottom: 12,
  },
  empty: {
    color: "#666",
    marginBottom: 12,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  flavorName: {
    fontSize: 16,
    fontWeight: "500",
  },
  flavorMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});
