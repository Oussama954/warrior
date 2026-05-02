import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

type LogTab = "main" | "tick" | "stdout";

const TABS: { key: LogTab; label: string; endpoint: string }[] = [
  { key: "main", label: "Main", endpoint: "/logs/main" },
  { key: "tick", label: "Tick", endpoint: "/logs/tick" },
  { key: "stdout", label: "Stdout", endpoint: "/logs/stdout" },
];

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const { apiRequest } = useAuth();
  const [activeTab, setActiveTab] = useState<LogTab>("main");
  const [logs, setLogs] = useState<Record<LogTab, string>>({ main: "", tick: "", stdout: "" });
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const fetchLog = useCallback(async (tab: LogTab) => {
    const endpoint = TABS.find((t) => t.key === tab)?.endpoint ?? "/logs/main";
    try {
      const res = await apiRequest(endpoint);
      const body = await res.json();
      const content = (body as { content?: string }).content ?? "";
      setLogs((prev) => ({ ...prev, [tab]: content }));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    setLoading(true);
    fetchLog(activeTab);
    const interval = setInterval(() => fetchLog(activeTab), 3000);
    return () => clearInterval(interval);
  }, [activeTab, fetchLog]);

  const rawLines = logs[activeTab].split("\n").filter(Boolean);
  const lines = activeTab === "tick" ? [...rawLines].reverse() : rawLines;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Logs</Text>
        <Text style={styles.headerSub}>{lines.length} lines · auto-refresh 3s</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : lines.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="file-text" size={32} color={C.mutedForeground} />
          <Text style={styles.emptyText}>No log entries yet</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.logScroll}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator
        >
          {lines.map((line, i) => (
            <LogLine key={i} line={line} isTick={activeTab === "tick"} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LogLine({ line, isTick }: { line: string; isTick: boolean }) {
  let color: string;
  if (isTick) {
    color = "#ffffff";
  } else if (/error|exception|traceback/i.test(line)) {
    color = C.destructive;
  } else if (/warn/i.test(line)) {
    color = C.warning;
  } else if (/info|start|running/i.test(line)) {
    color = C.info;
  } else if (/signal|long|short|buy|sell|profit|pnl/i.test(line)) {
    color = C.success;
  } else {
    color = C.mutedForeground;
  }

  return (
    <Text style={[styles.logLine, { color }]} selectable>
      {line}
    </Text>
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: C.primary,
  },
  tabText: { fontSize: 14, color: C.mutedForeground, fontFamily: "Inter_500Medium" },
  tabTextActive: { color: C.primary, fontFamily: "Inter_600SemiBold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, color: C.mutedForeground, fontFamily: "Inter_400Regular" },
  logScroll: { flex: 1, backgroundColor: C.background },
  logLine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 1,
  },
});
