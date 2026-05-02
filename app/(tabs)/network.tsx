import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const C = colors.light;

interface NetworkInfo {
  publicIp?: string;
  localIPv4?: string[];
  hostname?: string;
}

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const { apiRequest, logout } = useAuth();
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await apiRequest("/network");
      const body = await res.json();
      setInfo(body as NetworkInfo);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchNetwork();
    const interval = setInterval(fetchNetwork, 15000);
    return () => clearInterval(interval);
  }, [fetchNetwork]);

  const copy = async (val: string) => {
    await Clipboard.setStringAsync(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Logout from dashboard?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => { logout(); router.replace("/login"); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Network</Text>
        <Text style={styles.headerSub}>Server connection info</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Remote Server</Text>
            <View style={styles.divider} />
            <InfoRow label="API Base URL" value="212-115-110-104.eu-fr-cloud-xip.com/api" onCopy={() => copy("http://212-115-110-104.eu-fr-cloud-xip.com/api")} />
          </View>

          {info && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Server Network</Text>
              <View style={styles.divider} />
              {info.hostname && <InfoRow label="Hostname" value={info.hostname} onCopy={() => copy(info.hostname!)} />}
              {info.publicIp && <InfoRow label="Public IPv4" value={info.publicIp} onCopy={() => copy(info.publicIp!)} />}
              {(info.localIPv4 ?? []).map((ip, i) => (
                <InfoRow key={i} label={`Local IP ${i + 1}`} value={ip} onCopy={() => copy(ip)} />
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Session</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.8}>
              <Feather name="log-out" size={16} color={C.destructive} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onCopy} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      <Feather name="copy" size={14} color={C.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.foreground, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: C.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  infoLabel: { fontSize: 11, color: C.mutedForeground, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, color: C.foreground, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  logoutText: { fontSize: 15, color: C.destructive, fontFamily: "Inter_500Medium" },
});
