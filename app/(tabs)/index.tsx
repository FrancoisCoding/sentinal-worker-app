import {
  Animated,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import {
  tasksAtom,
  pairedDeviceNameAtom,
  isConnectedAtom,
  pendingApprovalAtom,
  dailyCostAtom,
} from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { getClient } from "@/lib/supabase";
import type { Task, TaskStatus, ApprovalRequest } from "@/lib/schemas";
import { ApprovalSheet } from "@/components/ApprovalSheet";

const STATUS_COLOR: Record<TaskStatus, string> = {
  queued: "#facc15",
  running: "#60a5fa",
  waiting_for_approval: "#fb923c",
  completed: "#4ade80",
  failed: "#f87171",
  rejected: "#6b7280",
};

export default function TasksScreen() {
  const [tasks, setTasks] = useAtom(tasksAtom);
  const [deviceName] = useAtom(pairedDeviceNameAtom);
  const [isConnected] = useAtom(isConnectedAtom);
  const [pending, setPending] = useAtom(pendingApprovalAtom);
  const [dailyCost] = useAtom(dailyCostAtom);
  const [refreshing, setRefreshing] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    if (!isConnected) return;
    fetchTasks();

    const sb = getClient();
    const channel = sb
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Task).id ? (payload.new as Task) : t
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_events" },
        (payload) => {
          const event = payload.new as {
            task_id: string;
            event_type: string;
            payload: Record<string, unknown>;
          };
          if (event.event_type === "approval_request") {
            setPending({
              id: event.task_id,
              task_id: event.task_id,
              command: String(event.payload.command ?? ""),
              status: "pending",
              created_at: new Date().toISOString(),
            } as ApprovalRequest);
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [isConnected, setTasks, setPending]);

  async function fetchTasks() {
    setRefreshing(true);
    try {
      const { data } = await getClient()
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setTasks(data as Task[]);
    } finally {
      setRefreshing(false);
    }
  }

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.lockedHero,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#7dd3fc" />
          </View>
          <Text style={styles.heroTitle}>Link your trusted desktop first</Text>
          <Text style={styles.heroText}>
            Sentinal Worker unlocks tasks, approvals, and live activity only after this phone is
            linked to one approved desktop.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/pair")}>
            <Text style={styles.primaryButtonText}>Scan desktop QR code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.secondaryButtonText}>Review trusted device details</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Secure control for one trusted device</Text>
          <Text style={styles.heroText}>
            Review task activity, approvals, and daily spend without exposing your local machine.
          </Text>
        </View>
        <View style={styles.heroMeta}>
          <View style={[styles.statusPill, isConnected ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.dot, { backgroundColor: isConnected ? "#34d399" : "#64748b" }]} />
            <Text style={styles.statusPillText}>
              {isConnected ? deviceName ?? "Trusted device linked" : "No trusted device linked"}
            </Text>
          </View>
          <Text style={styles.cost}>${dailyCost.toFixed(3)} today</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchTasks} tintColor="#5865F2" />
        }
        contentContainerStyle={tasks.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flash-outline" size={28} color="#7dd3fc" />
            </View>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptyHint}>Use Run task to send work to your linked desktop.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/tasks/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {item.type === "claude" ? "C" : item.type === "codex" ? "X" : "$"}
                </Text>
              </View>
              <Text style={styles.command} numberOfLines={1}>
                {item.command}
              </Text>
            </View>
            <View style={styles.cardMeta}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {item.status.replace(/_/g, " ")}
              </Text>
              {(item.cost_usd ?? 0) > 0 && (
                <Text style={styles.metaCost}>${item.cost_usd!.toFixed(4)}</Text>
              )}
              <Text style={styles.time}>{formatTime(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {pending && <ApprovalSheet approval={pending} onDismiss={() => setPending(null)} />}
    </View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020817", paddingHorizontal: 16, paddingTop: 16 },
  lockedHero: {
    marginTop: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  heroIconWrap: {
    height: 72,
    width: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  hero: {
    marginBottom: 16,
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 18,
  },
  heroCopy: { gap: 8 },
  heroTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "700", lineHeight: 26 },
  heroText: { color: "#93a4bd", fontSize: 14, lineHeight: 21 },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#eff6ff", fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#dbe7f5", fontSize: 14, fontWeight: "600" },
  heroMeta: { gap: 10 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusOnline: { backgroundColor: "rgba(5, 150, 105, 0.16)", borderWidth: 1, borderColor: "#134e4a" },
  statusOffline: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { color: "#dbe7f5", fontSize: 12, fontWeight: "600" },
  cost: { color: "#7dd3fc", fontSize: 12, fontWeight: "600" },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { color: "#cbd5e1", fontSize: 11, fontWeight: "700" },
  command: { flex: 1, color: "#f8fafc", fontSize: 14, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 32 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  metaCost: { color: "#93a4bd", fontSize: 11 },
  time: { color: "#6b7a92", fontSize: 11, marginLeft: "auto" },
  empty: { flex: 1 },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIconWrap: {
    height: 64,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#08111f",
  },
  emptyText: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  emptyHint: { color: "#93a4bd", fontSize: 13, textAlign: "center" },
});
