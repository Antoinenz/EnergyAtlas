import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";

type Mode = "signIn" | "signUp";

export default function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter an email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const action = mode === "signIn" ? signIn : signUp;
    const { error } = await action(email, password);
    setBusy(false);
    if (error) setError(error);
    // On success the auth listener swaps this screen out; nothing to do here.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "signIn" ? "Sign in" : "Create account"}
      </Text>
      <Text style={styles.subtitle}>
        To log flavors, report stock, and write reviews.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType={mode === "signIn" ? "password" : "newPassword"}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={submit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "signIn" ? "Sign in" : "Sign up"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          setMode(mode === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
        hitSlop={8}
      >
        <Text style={styles.switch}>
          {mode === "signIn"
            ? "No account? Create one"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: "#b00020", marginBottom: 12 },
  button: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switch: { color: "#2563eb", textAlign: "center", marginTop: 16, fontSize: 14 },
});
