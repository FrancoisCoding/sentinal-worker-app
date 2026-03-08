import { Animated, View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { tasksAtom, taskLogsAtom } from "@/lib/store";
import { useEffect, useRef } from "react";
import { supabase, isConfigured } from "@/lib/supabase";
import { useSetAtom } from "jotai";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tasks] = useAtom(tasksAtom);
  const setTaskLogs = useSetAtom(taskLogsAtom);
  const [taskLogs] = useAtom(taskLogsAtom);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const task = tasks.find((t) => t.id === id);
  const liveLines = taskLogs[id] ?? [];

  // Subscribe to task_events for live log streaming
  useEffect(() => {
    if (!isConfigured() || !id) return;

    const channel = supabase
      .channel(`task-events-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_events",
          filter: `task_id=eq.${id}`,
        },
        (payload) => {
          const event = payload.new as {
            event_type: string;
            payload: Record<string, unknown>;
          };
          if (event.event_type === "stdout" || event.event_type === "stderr") {
            const line = String(event.payload.line ?? "");
            setTaskLogs((prev) => ({
              ...prev,
              [id]: [...(prev[id] ?? []), line],
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, setTaskLogs]);

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Task not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View
        style={[
          styles.hero,
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
        <View style={styles.heroBadge}>
          <Ionicons name="terminal-outline" size={16} color="#7dd3fc" />
          <Text style={styles.heroBadgeText}>{task.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.heroTitle}>Task detail</Text>
        <Text style={styles.heroText}>
          Review command context, trusted-device execution status, and live output.
        </Text>
      </Animated.View>

      <View style={styles.meta}>
        <MetaRow label="ID" value={task.id} />
        <MetaRow label="Type" value={task.type.toUpperCase()} />
        <MetaRow label="Status" value={task.status.replace(/_/g, " ")} />
        {task.started_at && (
          <MetaRow label="Started" value={new Date(task.started_at).toLocaleString()} />
        )}
        {task.completed_at && (
          <MetaRow label="Completed" value={new Date(task.completed_at).toLocaleString()} />
        )}
        {(task.cost_usd ?? 0) > 0 && (
          <MetaRow label="Cost" value={`$${task.cost_usd!.toFixed(6)}`} />
        )}
      </View>

      <View style={styles.commandBox}>
        <Text style={styles.sectionLabel}>Command</Text>
        <Text style={styles.command}>{task.command}</Text>
      </View>

      <View style={styles.logBox}>
        <Text style={styles.logHeader}>Live output</Text>
        {liveLines.length === 0 && (
          <Text style={styles.logEmpty}>
            {task.status === "queued" ? "Waiting to start..." : "No output yet"}
          </Text>
        )}
        {liveLines.map((line, i) => (
          <Text key={i} style={styles.logLine}>{line}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020817" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#020817" },
  notFound: { color: "#93a4bd", fontSize: 14 },
  hero: {
    marginBottom: 16,
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 18,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#16324d",
    backgroundColor: "#0d1b2d",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroBadgeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "700" },
  heroText: { color: "#93a4bd", fontSize: 14, lineHeight: 21 },
  meta: {
    backgroundColor: "#08111f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { color: "#93a4bd", fontSize: 12, fontWeight: "600" },
  metaValue: { color: "#f8fafc", fontSize: 12, maxWidth: "65%" },
  commandBox: {
    backgroundColor: "#08111f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  command: { color: "#e5e7eb", fontSize: 13, fontFamily: "monospace", lineHeight: 20 },
  logBox: {
    backgroundColor: "#050d19",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    padding: 16,
    minHeight: 200,
  },
  logHeader: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  logEmpty: { color: "#93a4bd", fontSize: 13, lineHeight: 20 },
  logLine: { color: "#a3e635", fontSize: 11, fontFamily: "monospace", lineHeight: 18 },
});
