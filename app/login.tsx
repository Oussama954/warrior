import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

const C = colors.light;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    const result = await login(password);
    setLoading(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error ?? "Login failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>⚔</Text>
        </View>
        <Text style={styles.title}>Warrior Bot</Text>
        <Text style={styles.subtitle}>v5.1.1 · BTC/USDT 30m · 20× Futures</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Dashboard Password</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={C.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            autoFocus
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={C.primaryForeground} />
            ) : (
              <Text style={styles.btnText}>Unlock</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Connecting to remote server</Text>
        <Text style={styles.hintSub}>212-115-110-104.eu-fr-cloud-xip.com</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: C.foreground,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: C.mutedForeground,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 32,
  },
  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: C.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.foreground,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 13,
    color: C.destructive,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: C.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: C.mutedForeground,
    fontFamily: "Inter_400Regular",
  },
  hintSub: {
    fontSize: 11,
    color: C.muted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
