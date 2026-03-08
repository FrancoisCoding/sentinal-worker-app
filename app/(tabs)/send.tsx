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

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "shell", label: "Shell" },
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
];

const QUICK_ACTIONS = [
  { label: "Fix lint", command: "Fix all lint errors", type: "claude" as TaskType },
  { label: "Run tests", command: "npm test", type: "shell" as TaskType },
  { label: "Analyze repo", command: "Analyze this repository and summarize key issues", type: "claude" as TaskType },
  { label: "Git status", command: "git status", type: "shell" as TaskType },
];

export default function SendScreen() {
  const [taskType, setTaskType] = useState<TaskType>("shell");
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
      setTasks((prev) => [data as Task, ...prev]);
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
            <Ionicons name="lock-closed-outline" size={26} color="#7dd3fc" />
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
          Send a shell command or agent prompt through the trusted desktop connection, then review
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
            taskType === "shell"
              ? "Run a shell command, for example pnpm test"
              : "Describe the work to run on the linked desktop"
          }
          placeholderTextColor="#5b6b85"
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
          placeholderTextColor="#5b6b85"
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
    backgroundColor: "#020817",
    padding: 16,
    justifyContent: "center",
  },
  lockedCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  lockedIconWrap: {
    height: 72,
    width: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  lockedTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "700", textAlign: "center" },
  lockedText: { color: "#93a4bd", fontSize: 14, lineHeight: 21, textAlign: "center" },
  container: { flex: 1, backgroundColor: "#020817", padding: 16 },
  content: { paddingBottom: 32 },
  hero: {
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 18,
    gap: 8,
  },
  heroTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "700" },
  heroText: { color: "#93a4bd", fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 24 },
  label: {
    color: "#7dd3fc",
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  typeBtnActive: { backgroundColor: "#1d4ed8", borderColor: "#2563eb" },
  typeBtnText: { color: "#93a4bd", fontSize: 13, fontWeight: "600" },
  typeBtnTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#08111f",
    borderWidth: 1,
    borderColor: "#162133",
    borderRadius: 18,
    padding: 14,
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 32,
  },
  linkButton: {
    minHeight: 52,
    minWidth: 220,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: "#eff6ff", fontSize: 14, fontWeight: "700" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#08111f",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#162133",
  },
  quickText: { color: "#cbd5e1", fontSize: 13, fontWeight: "600" },
});
