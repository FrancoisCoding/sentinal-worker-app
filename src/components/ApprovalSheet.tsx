import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getClient } from "@/lib/supabase";
import type { ApprovalRequest } from "@/lib/schemas";
import { signPayload } from "@/lib/crypto";
import { useEffect, useRef, useState } from "react";

interface Props {
  approval: ApprovalRequest;
  onDismiss: () => void;
}

export function ApprovalSheet({ approval, onDismiss }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  async function resolve(decision: "approved" | "rejected" | "always_allow") {
    try {
      const signed = await signPayload({
        approval_id: approval.id,
        task_id: approval.task_id,
        decision,
      });

      // Serialize SignedPayload to JSON string for storage
      const signedJson = JSON.stringify(signed);

      await getClient()
        .from("approval_requests")
        .update({
          status: decision,
          resolved_at: new Date().toISOString(),
          signed_response: signedJson,
        })
        .eq("id", approval.id);

      // Notify desktop via task_events
      await getClient().from("task_events").insert({
        task_id: approval.task_id,
        event_type: "approval_response",
        payload: { decision, signed_response: signedJson },
      });
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Failed to send response.");
      return;
    }
    onDismiss();
  }

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-outline" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.title}>Approval required</Text>
              <Text style={styles.subtitle}>Review a high-risk command before it runs</Text>
            </View>
          </View>

          <View style={styles.commandBox}>
            <Text style={styles.command}>{approval.command}</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,8,23,0.76)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#08111f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#162133",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#314158",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconWrap: {
    height: 42,
    width: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.22)",
  },
  title: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#93a4bd", fontSize: 13, lineHeight: 19 },
  commandBox: {
    backgroundColor: "#050d19",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#162133",
    padding: 14,
    marginBottom: 20,
  },
  command: { color: "#a3e635", fontSize: 13, fontFamily: "monospace" },
  errorText: { color: "#fca5a5", fontSize: 13, lineHeight: 19, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 12 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    alignItems: "center",
  },
  rejectText: { color: "#cbd5e1", fontSize: 14, fontWeight: "600" },
  approveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.2)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    alignItems: "center",
  },
  approveText: { color: "#bfdbfe", fontSize: 14, fontWeight: "700" },
  alwaysBtn: {
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    alignItems: "center",
    marginBottom: 12,
  },
  alwaysText: { color: "#cbd5e1", fontSize: 13, fontWeight: "600" },
  timeout: { color: "#6b7a92", fontSize: 11, textAlign: "center" },
});
