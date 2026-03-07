import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { tasksAtom, taskLogsAtom } from "@/lib/store";
import { useEffect } from "react";
import { supabase, isConfigured } from "@/lib/supabase";
import { useSetAtom } from "jotai";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tasks] = useAtom(tasksAtom);
  const setTaskLogs = useSetAtom(taskLogsAtom);
  const [taskLogs] = useAtom(taskLogsAtom);

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
    <ScrollView style={styles.container}>
      {/* Meta */}
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

      {/* Command */}
      <View style={styles.commandBox}>
        <Text style={styles.command}>{task.command}</Text>
      </View>

      {/* Log stream */}
      <View style={styles.logBox}>
        <Text style={styles.logHeader}>Output</Text>
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
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { color: "#333", fontSize: 14 },
  meta: {
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { color: "#444", fontSize: 11, fontFamily: "monospace" },
  metaValue: { color: "#888", fontSize: 11, fontFamily: "monospace", maxWidth: "65%" },
  commandBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    marginBottom: 12,
  },
  command: { color: "#e5e5e5", fontSize: 13, fontFamily: "monospace" },
  logBox: {
    backgroundColor: "#050505",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
    padding: 12,
    minHeight: 200,
  },
  logHeader: { color: "#333", fontSize: 10, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" },
  logEmpty: { color: "#222", fontSize: 12, fontFamily: "monospace" },
  logLine: { color: "#a3e635", fontSize: 11, fontFamily: "monospace", lineHeight: 18 },
});
