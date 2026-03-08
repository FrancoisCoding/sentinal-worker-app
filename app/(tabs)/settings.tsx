import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useAtom } from "jotai";
import { pairedDeviceIdAtom, pairedDeviceNameAtom, phoneIdAtom, isConnectedAtom } from "@/lib/store";
import { router } from "expo-router";

export default function SettingsScreen() {
  const [phoneId] = useAtom(phoneIdAtom);
  const [deviceId] = useAtom(pairedDeviceIdAtom);
  const [deviceName] = useAtom(pairedDeviceNameAtom);
  const [isConnected] = useAtom(isConnectedAtom);

  return (
    <ScrollView style={styles.container}>
      <Section title="Device pairing">
        <View style={styles.infoBox}>
          <InfoRow label="Phone ID" value={phoneId || "—"} mono />
          <InfoRow label="Paired desktop" value={deviceName ?? "Not paired"} />
          <InfoRow label="Status" value={isConnected ? "Connected" : "Disconnected"} />
          {deviceId && <InfoRow label="Desktop ID" value={deviceId} mono />}
        </View>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/pair")}>
          <Text style={styles.outlineBtnText}>
            {deviceId ? "Re-pair desktop" : "Pair desktop"}
          </Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: "monospace" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  section: { marginBottom: 32 },
  sectionTitle: {
    color: "#444",
    fontSize: 10,
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: "#444", fontSize: 11, fontFamily: "monospace" },
  infoValue: { color: "#888", fontSize: 11, maxWidth: "60%" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#5865F2",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineBtnText: { color: "#5865F2", fontSize: 13, fontFamily: "monospace" },
});
