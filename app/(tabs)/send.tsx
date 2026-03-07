import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { useAtom } from "jotai";
import { tasksAtom, pairedDeviceIdAtom, phoneIdAtom } from "@/lib/store";
import { supabase, isConfigured } from "@/lib/supabase";
import { signPayload } from "@/lib/crypto";
import type { TaskType, Task } from "@/lib/schemas";

const TASK_TYPES: { value: TaskType; label: string; icon: string }[] = [
  { value: "shell", label: "Shell", icon: "$" },
  { value: "claude", label: "Claude", icon: "C" },
  { value: "codex", label: "Codex", icon: "X" },
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
  const [phoneId] = useAtom(phoneIdAtom);

  async function handleSubmit() {
    if (!command.trim()) return;
    if (!isConfigured()) {
      Alert.alert("Not configured", "Add your Supabase URL and key in Settings.");
      return;
    }

    setLoading(true);
    try {
      const signed = await signPayload({
        type: taskType,
        command: command.trim(),
        project_path: projectPath.trim() || null,
        phone_id: phoneId,
      });

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          device_id: deviceId,
          type: taskType,
          command: command.trim(),
          project_path: projectPath.trim() || null,
          status: "queued",
          signed_payload: signed,
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

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
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
                {t.icon} {t.label}
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
            taskType === "shell" ? "echo hello world" : "Refactor this repository..."
          }
          placeholderTextColor="#2a2a2a"
          multiline
          numberOfLines={3}
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
          placeholder="/Users/me/myproject"
          placeholderTextColor="#2a2a2a"
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
        <Text style={styles.label}>Quick actions</Text>
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
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  section: { marginBottom: 24 },
  label: { color: "#444", fontSize: 10, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    backgroundColor: "#111",
  },
  typeBtnActive: { backgroundColor: "#5865F2", borderColor: "#5865F2" },
  typeBtnText: { color: "#555", fontSize: 12, fontFamily: "monospace" },
  typeBtnTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    padding: 12,
    color: "#e5e5e5",
    fontFamily: "monospace",
    fontSize: 13,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#5865F2",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 32,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontSize: 14, fontFamily: "monospace" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  quickText: { color: "#666", fontSize: 12, fontFamily: "monospace" },
});
