import {
  Animated,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { tasksAtom, pairedDeviceIdAtom, isConnectedAtom } from "@/lib/store";
import { getClient } from "@/lib/supabase";
import { signPayload } from "@/lib/crypto";
import type { TaskType, Task } from "@/lib/schemas";
import { colors, radii } from "@/lib/theme";

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
];

const QUICK_ACTIONS = [
  { label: "Fix lint", command: "Fix all lint errors", type: "claude" as TaskType },
  { label: "Review failing test output", command: "Review the failing test output and propose a fix.", type: "claude" as TaskType },
  { label: "Analyze repo", command: "Analyze this repository and summarize key issues", type: "claude" as TaskType },
  { label: "Implement feature", command: "Implement the requested feature and explain the changes.", type: "codex" as TaskType },
];

function upsertTask(previousTasks: Task[], nextTask: Task) {
  const remainingTasks = previousTasks.filter((task) => task.id !== nextTask.id);
  return [nextTask, ...remainingTasks].sort(
    (leftTask, rightTask) =>
      new Date(rightTask.created_at).getTime() - new Date(leftTask.created_at).getTime()
  );
}

export default function SendScreen() {
  const [taskType, setTaskType] = useState<TaskType>("claude");
  const [command, setCommand] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setTasks] = useAtom(tasksAtom);
  const [deviceId] = useAtom(pairedDeviceIdAtom);
  const [isConnected] = useAtom(isConnectedAtom);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  async function handleSubmit() {
    if (!command.trim()) return;

    setLoading(true);
    try {
      const signed = await signPayload({
        type: taskType,
        command: command.trim(),
        project_path: projectPath.trim() || null,
      });

      const { data, error } = await getClient()
        .from("tasks")
        .insert({
          device_id: deviceId,
          type: taskType,
          command: command.trim(),
          project_path: projectPath.trim() || null,
          status: "queued",
          signed_payload: JSON.stringify(signed),
        })
        .select()
        .single();

      if (error) throw error;
      setTasks((previousTasks) => upsertTask(previousTasks, data as Task));
      setCommand("");
      Alert.alert("Sent", "Task queued on the desktop.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send task");
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <View style={styles.lockedContainer}>
        <Animated.View
          style={[
            styles.lockedCard,
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
          <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Run task unlocks after device linking</Text>
          <Text style={styles.lockedText}>
            Link this phone to your trusted desktop first. That secure one-to-one link is required
            before commands or agent prompts can be sent.
          </Text>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/pair")}>
            <Text style={styles.submitText}>Link trusted device</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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
        <Text style={styles.heroTitle}>Run secure work on your linked desktop</Text>
        <Text style={styles.heroText}>
          Send a Claude Code or Codex task through the trusted desktop connection, then review
          progress from the operations feed.
        </Text>
      </Animated.View>

      <View style={styles.section}>
        <Text style={styles.label}>Task type</Text>
        <View style={styles.typeRow}>
          {TASK_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTaskType(t.value)}
              style={[styles.typeBtn, taskType === t.value && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, taskType === t.value && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Command / prompt</Text>
        <TextInput
          style={styles.input}
          value={command}
          onChangeText={setCommand}
          placeholder={
            taskType === "claude"
              ? "Ask Claude Code to inspect or change the linked desktop project"
              : "Ask Codex to complete a coding task on the linked desktop"
          }
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Project path (optional)</Text>
        <TextInput
          style={[styles.input, { height: 40 }]}
          value={projectPath}
          onChangeText={setProjectPath}
          placeholder="Optional local project path"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading || !command.trim()}
      >
        <Text style={styles.submitText}>{loading ? "Sending..." : "Send Task"}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.label}>Suggested actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity
              key={qa.label}
              style={styles.quickBtn}
              onPress={() => {
                setCommand(qa.command);
                setTaskType(qa.type);
              }}
            >
              <Text style={styles.quickText}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: "center",
  },
  lockedCard: {
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  lockedIconWrap: {
    height: 72,
    width: 72,
    borderRadius: radii.container,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  lockedTitle: { color: colors.foreground, fontSize: 20, fontWeight: "700", textAlign: "center" },
  lockedText: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: "center" },
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  content: { paddingBottom: 32 },
  hero: {
    marginBottom: 24,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  heroTitle: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  heroText: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 24 },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.interactive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primaryStrong },
  typeBtnText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600" },
  typeBtnTextActive: { color: colors.primaryForeground },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.container,
    padding: 14,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.interactive,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 32,
  },
  linkButton: {
    minHeight: 52,
    minWidth: 220,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.interactive,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "700" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.interactive,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
});
