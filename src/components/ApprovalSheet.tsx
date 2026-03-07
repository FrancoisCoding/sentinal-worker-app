import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import type { ApprovalRequest } from "@/lib/schemas";
import { signPayload } from "@/lib/crypto";

interface Props {
  approval: ApprovalRequest;
  onDismiss: () => void;
}

export function ApprovalSheet({ approval, onDismiss }: Props) {
  async function resolve(decision: "approved" | "rejected" | "always_allow") {
    try {
      const signed = await signPayload({
        approval_id: approval.id,
        task_id: approval.task_id,
        decision,
      });

      // Serialize SignedPayload to JSON string for storage
      const signedJson = JSON.stringify(signed);

      await supabase
        .from("approval_requests")
        .update({
          status: decision,
          resolved_at: new Date().toISOString(),
          signed_response: signedJson,
        })
        .eq("id", approval.id);

      // Notify desktop via task_events
      await supabase.from("task_events").insert({
        task_id: approval.task_id,
        event_type: "approval_response",
        payload: { decision, signed_response: signedJson },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send response");
    }
    onDismiss();
  }

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.icon}>⚠️</Text>
            <View>
              <Text style={styles.title}>Approval Required</Text>
              <Text style={styles.subtitle}>High-risk command on desktop</Text>
            </View>
          </View>

          <View style={styles.commandBox}>
            <Text style={styles.command}>{approval.command}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => resolve("rejected")}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={() => resolve("approved")}>
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.alwaysBtn} onPress={() => resolve("always_allow")}>
            <Text style={styles.alwaysText}>Always Allow This Command</Text>
          </TouchableOpacity>

          <Text style={styles.timeout}>Auto-rejects in 5 minutes if no response</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  icon: { fontSize: 28 },
  title: { color: "#e5e5e5", fontSize: 15, fontWeight: "600" },
  subtitle: { color: "#555", fontSize: 12, fontFamily: "monospace" },
  commandBox: {
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    marginBottom: 20,
  },
  command: { color: "#a3e635", fontSize: 13, fontFamily: "monospace" },
  actions: { flexDirection: "row", gap: 12, marginBottom: 12 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
  },
  rejectText: { color: "#888", fontSize: 14 },
  approveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "rgba(248,113,113,0.2)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
    alignItems: "center",
  },
  approveText: { color: "#f87171", fontSize: 14 },
  alwaysBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5865F2",
    alignItems: "center",
    marginBottom: 12,
  },
  alwaysText: { color: "#5865F2", fontSize: 13, fontFamily: "monospace" },
  timeout: { color: "#333", fontSize: 10, textAlign: "center", fontFamily: "monospace" },
});
