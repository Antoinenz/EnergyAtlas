import { StyleSheet, Text, View } from "react-native";

// Placeholder. Becomes the auth + profile screen: sign in/up, your username,
// your "tried" list and reviews. Auth is the next focused piece of work.
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.body}>
        Sign in, your collection, and your reviews will live here. Auth is next
        on the list.
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
