import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useAtom } from "jotai";
import {
  tasksAtom,
  pairedDeviceNameAtom,
  isConnectedAtom,
  pendingApprovalAtom,
  dailyCostAtom,
} from "@/lib/store";
import { useEffect, useState } from "react";
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

  useEffect(() => {
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
  }, [setTasks, setPending]);

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

  return (
    <View style={styles.container}>
      {/* Connection banner */}
      <View style={styles.banner}>
        <View style={[styles.dot, { backgroundColor: isConnected ? "#4ade80" : "#333" }]} />
        <Text style={styles.bannerText}>
          {isConnected ? deviceName ?? "Connected" : "Not paired"}
        </Text>
        <Text style={styles.cost}>${dailyCost.toFixed(3)} today</Text>
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
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptyHint}>Send a task from the Send tab</Text>
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    gap: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bannerText: { color: "#555", fontSize: 12, fontFamily: "monospace", flex: 1 },
  cost: { color: "#444", fontSize: 11, fontFamily: "monospace" },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  typeBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { color: "#666", fontSize: 10, fontWeight: "bold" },
  command: { flex: 1, color: "#e5e5e5", fontSize: 13, fontFamily: "monospace" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 32 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 10, fontFamily: "monospace" },
  metaCost: { color: "#444", fontSize: 10, fontFamily: "monospace" },
  time: { color: "#333", fontSize: 10, fontFamily: "monospace", marginLeft: "auto" },
  empty: { flex: 1 },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: "#333", fontSize: 14 },
  emptyHint: { color: "#222", fontSize: 12 },
});
