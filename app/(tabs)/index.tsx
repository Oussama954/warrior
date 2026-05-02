import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

interface BotStatus {
  running: boolean;
  pid?: number;
  uptimeSec?: number;
  lastExitCode?: number | null;
  hasBinanceKeys?: boolean;
}

interface BotState {
  wallet?: number;
  total_pnl?: number;
  trade_count?: number;
  position?: {
    side?: string;
    size?: number;
    entry?: number;
    pnl?: number;
  } | null;
  last_tick?: string;
  last_signal?: string;
}

function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtNum(n?: number, decimals = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(decimals);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { apiRequest, logout } = useAuth();
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [state, setState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s1, s2] = await Promise.all([
        apiRequest("/bot/status").then((r) => r.json()),
        apiRequest("/state").then((r) => r.json()).catch(() => ({})),
      ]);
      setStatus(s1 as BotStatus);
      setState(s2 as BotState);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);
    try {
      const res = await apiRequest("/bot/start", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        Alert.alert("Error", (body as { error?: string }).error ?? "Failed to start");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchData();
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
    setActionLoading(false);
  };

  const handleStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("Stop Bot", "Are you sure you want to stop the trading bot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await apiRequest("/bot/stop", { method: "POST" });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              Alert.alert("Error", (body as { error?: string }).error ?? "Failed to stop");
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              fetchData();
            }
          } catch {
            Alert.alert("Error", "Network error");
          }
          setActionLoading(false);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Logout from dashboard?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => { logout(); router.replace("/login"); } },
    ]);
  };

  const running = status?.running ?? false;
  const pnl = state?.total_pnl ?? 0;
  const pnlColor = pnl >= 0 ? C.success : C.destructive;

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Warrior Bot</Text>
          <Text style={styles.headerSub}>BTC/USDT 30m · 20× Futures</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={20} color={C.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.statusDot(running)} />
            <Text style={styles.statusText}>{running ? "RUNNING" : "STOPPED"}</Text>
            {status?.pid != null && running && (
              <Text style={styles.pidText}>PID {status.pid}</Text>
            )}
            {status?.uptimeSec != null && running && (
              <Text style={styles.uptimeText}>{formatUptime(status.uptimeSec)}</Text>
            )}
          </View>
          <View style={styles.divider} />
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn, (!running && !actionLoading) ? {} : styles.btnDisabled]}
              onPress={handleStart}
              disabled={running || actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading && !running ? (
                <ActivityIndicator color={C.primaryForeground} size="small" />
              ) : (
                <>
                  <Feather name="play" size={16} color={running ? C.mutedForeground : C.primaryForeground} />
                  <Text style={[styles.actionBtnText, running && { color: C.mutedForeground }]}>Start</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.stopBtn, (running && !actionLoading) ? {} : styles.btnDisabled]}
              onPress={handleStop}
              disabled={!running || actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading && running ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="square" size={16} color={!running ? C.mutedForeground : "#fff"} />
                  <Text style={[styles.stopBtnText, !running && { color: C.mutedForeground }]}>Stop</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          <MetricCard label="Wallet Balance" value={`${fmtNum(state?.wallet)} USDT`} icon="credit-card" />
          <MetricCard label="Total P&L" value={`${pnl >= 0 ? "+" : ""}${fmtNum(pnl)} USDT`} icon="trending-up" valueColor={pnlColor} />
          <MetricCard label="Total Trades" value={String(state?.trade_count ?? "—")} icon="bar-chart-2" />
          <MetricCard label="Last Signal" value={state?.last_signal ?? "—"} icon="zap" />
        </View>

        {/* Position */}
        {state?.position && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Open Position</Text>
            <View style={styles.divider} />
            <View style={styles.posGrid}>
              <PosRow label="Side" value={state.position.side ?? "—"} valueColor={state.position.side === "LONG" ? C.success : C.destructive} />
              <PosRow label="Size" value={`${fmtNum(state.position.size, 4)} BTC`} />
              <PosRow label="Entry" value={`$${fmtNum(state.position.entry, 2)}`} />
              <PosRow label="Unrealized P&L" value={`${(state.position.pnl ?? 0) >= 0 ? "+" : ""}${fmtNum(state.position.pnl)} USDT`} valueColor={(state.position.pnl ?? 0) >= 0 ? C.success : C.destructive} />
            </View>
          </View>
        )}

        {/* Config */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Configuration</Text>
          <View style={styles.divider} />
          <View style={styles.posGrid}>
            <PosRow label="Strategy" value="Warrior v5.1.1" />
            <PosRow label="Pair" value="BTC/USDT" />
            <PosRow label="Timeframe" value="30m" />
            <PosRow label="Leverage" value="20×" />
            <PosRow label="Wallet %" value="50%" />
            <PosRow label="Binance Keys" value={status?.hasBinanceKeys ? "Loaded" : "Missing"} valueColor={status?.hasBinanceKeys ? C.success : C.destructive} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, icon, valueColor }: { label: string; value: string; icon: string; valueColor?: string }) {
  return (
    <View style={styles.metricCard}>
      <Feather name={icon as never} size={16} color={C.mutedForeground} style={{ marginBottom: 8 }} />
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PosRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.posRow}>
      <Text style={styles.posLabel}>{label}</Text>
      <Text style={[styles.posValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.foreground, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: C.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { padding: 8 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: (running: boolean) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: running ? C.success : C.destructive,
  }),
  statusText: { fontSize: 15, fontWeight: "700", color: C.foreground, fontFamily: "Inter_700Bold" },
  pidText: { fontSize: 12, color: C.mutedForeground, fontFamily: "Inter_400Regular", marginLeft: 4 },
  uptimeText: { fontSize: 12, color: C.primary, fontFamily: "Inter_500Medium", marginLeft: "auto" as never },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  controlRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  startBtn: { backgroundColor: C.primary },
  stopBtn: { backgroundColor: C.destructive },
  btnDisabled: { opacity: 0.35 },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: C.primaryForeground, fontFamily: "Inter_700Bold" },
  stopBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  metricValue: { fontSize: 18, fontWeight: "700", color: C.foreground, fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 11, color: C.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: C.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  posGrid: { gap: 10 },
  posRow: { flexDirection: "row", justifyContent: "space-between" },
  posLabel: { fontSize: 13, color: C.mutedForeground, fontFamily: "Inter_400Regular" },
  posValue: { fontSize: 13, color: C.foreground, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
