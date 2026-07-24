import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import AuthForm from "../components/AuthForm";

export default function ProfileScreen() {
  const { user, initializing, signOut } = useAuth();

  if (initializing) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {user ? <SignedIn onSignOut={signOut} /> : <AuthForm />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignedIn({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("id", user.id)
      .single<{ username: string }>();
    if (!error && data) setUsername(data.username);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveUsername = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from("user_profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);
    setSaving(false);
    setStatus(error ? error.message : "Saved");
  };

  if (loading) return <ActivityIndicator style={styles.spinner} />;

  return (
    <View style={styles.signedIn}>
      <Text style={styles.heading}>Your profile</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.readonly}>{user?.email}</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        onPress={saveUsername}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save username</Text>
        )}
      </Pressable>
      {status && (
        <Text style={status === "Saved" ? styles.ok : styles.error}>
          {status}
        </Text>
      )}

      <Text style={styles.note}>
        Your "tried" collection and reviews will show here once flavor reviews
        land.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        onPress={onSignOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  content: { paddingVertical: 24, flexGrow: 1 },
  spinner: { marginTop: 40 },
  signedIn: { paddingHorizontal: 24 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  label: {
    fontSize: 13,
    color: "#666",
    marginTop: 16,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  readonly: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  ok: { color: "#16a34a", marginTop: 8 },
  error: { color: "#b00020", marginTop: 8 },
  note: {
    marginTop: 28,
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    lineHeight: 18,
  },
  signOut: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#b00020",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutText: { color: "#b00020", fontSize: 15, fontWeight: "600" },
});
