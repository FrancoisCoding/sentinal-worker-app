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
import { colors, radii, STATUS_COLOR } from "@/lib/theme";

function mergeTaskList(nextTasks: Task[]) {
  const taskMap = new Map<string, Task>();

  for (const task of nextTasks) {
    taskMap.set(task.id, task);
  }

  return Array.from(taskMap.values()).sort(
    (leftTask, rightTask) =>
      new Date(rightTask.created_at).getTime() - new Date(leftTask.created_at).getTime()
  );
}

function upsertTask(previousTasks: Task[], nextTask: Task) {
  return mergeTaskList([nextTask, ...previousTasks.filter((task) => task.id !== nextTask.id)]);
}

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
            setTasks((previousTasks) => upsertTask(previousTasks, payload.new as Task));
          } else if (payload.eventType === "UPDATE") {
            setTasks((previousTasks) => upsertTask(previousTasks, payload.new as Task));
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
      if (data) setTasks(mergeTaskList(data as Task[]));
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
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
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
            <View style={[styles.dot, { backgroundColor: isConnected ? colors.success : colors.mutedForeground }]} />
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
          <RefreshControl refreshing={refreshing} onRefresh={fetchTasks} tintColor={colors.primary} />
        }
        contentContainerStyle={tasks.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flash-outline" size={28} color={colors.primary} />
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
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 16 },
  lockedHero: {
    marginTop: 12,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  heroIconWrap: {
    height: 72,
    width: 72,
    borderRadius: radii.container,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  hero: {
    marginBottom: 16,
    gap: 14,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  heroCopy: { gap: 8 },
  heroTitle: { color: colors.foreground, fontSize: 20, fontWeight: "700", lineHeight: 26 },
  heroText: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  primaryButton: {
    width: "100%",
    borderRadius: radii.interactive,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    width: "100%",
    borderRadius: radii.interactive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  heroMeta: { gap: 10 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusOnline: { backgroundColor: colors.successSurface, borderWidth: 1, borderColor: colors.successBorder },
  statusOffline: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.borderStrong },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  cost: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  card: {
    marginBottom: 12,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { color: colors.foreground, fontSize: 11, fontWeight: "700" },
  command: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 32 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  metaCost: { color: colors.mutedForeground, fontSize: 11 },
  time: { color: colors.mutedForeground, fontSize: 11, marginLeft: "auto" },
  empty: { flex: 1 },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIconWrap: {
    height: 64,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  emptyText: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  emptyHint: { color: colors.mutedForeground, fontSize: 13, textAlign: "center" },
});
