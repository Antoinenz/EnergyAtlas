import { StyleSheet, Text, View } from "react-native";

// Placeholder. Phase 2 replaces this with react-native-maps + store pins
// backed by the `stores` / `stock_reports` tables. Kept as a real tab so the
// nav shell is complete and the eventual work drops straight in here.
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.body}>
        Store pins, stock, and prices land here in Phase 2. Not built yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { color: "#666", textAlign: "center", lineHeight: 20 },
});
