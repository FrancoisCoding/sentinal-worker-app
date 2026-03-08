import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { pairedDeviceIdAtom, pairedDeviceNameAtom, phoneIdAtom, isConnectedAtom } from "@/lib/store";
import { router } from "expo-router";

export default function SettingsScreen() {
  const [phoneId] = useAtom(phoneIdAtom);
  const [deviceId, setDeviceId] = useAtom(pairedDeviceIdAtom);
  const [deviceName, setDeviceName] = useAtom(pairedDeviceNameAtom);
  const [isConnected, setIsConnected] = useAtom(isConnectedAtom);

  function handleUnlink() {
    Alert.alert(
      "Unlink desktop",
      "This will remove the trusted device link. You'll need to scan the QR code again to reconnect.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync("sentinal_paired_device_id");
            await SecureStore.deleteItemAsync("sentinal_paired_device_name");
            setDeviceId(null);
            setDeviceName(null);
            setIsConnected(false);
          },
        },
      ]
    );
  }
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
        <View style={styles.heroBadge}>
          <Ionicons
            name={isConnected ? "shield-checkmark-outline" : "shield-outline"}
            size={16}
            color="#7dd3fc"
          />
          <Text style={styles.heroBadgeText}>
            {isConnected ? "Trusted desktop linked" : "Link one trusted desktop"}
          </Text>
        </View>
        <Text style={styles.heroTitle}>
          {isConnected ? "This phone is secured to one desktop" : "Start by linking your trusted desktop"}
        </Text>
        <Text style={styles.heroText}>
          {isConnected
            ? "Every task and approval stays tied to the linked desktop identity before this phone can control it."
            : "Scan the desktop QR code to create a signed one-to-one device link before you run tasks or approve actions."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/pair")}>
          <Ionicons name="scan-outline" size={18} color="#eff6ff" />
          <Text style={styles.primaryButtonText}>
            {isConnected ? "Relink trusted device" : "Scan desktop QR code"}
          </Text>
        </Pressable>
        {isConnected && (
          <Pressable style={styles.unlinkButton} onPress={handleUnlink}>
            <Ionicons name="close-circle-outline" size={16} color="#f87171" />
            <Text style={styles.unlinkButtonText}>Unlink desktop</Text>
          </Pressable>
        )}
      </Animated.View>

      <Section title="Link status">
        <View style={styles.infoBox}>
          <InfoRow label="Phone ID" value={phoneId || "—"} mono />
          <InfoRow label="Trusted desktop" value={deviceName ?? "Not linked"} />
          <InfoRow label="Status" value={isConnected ? "Linked" : "Awaiting link"} />
          {deviceId && <InfoRow label="Desktop ID" value={deviceId} mono />}
        </View>
      </Section>

      {!isConnected && (
        <Section title="How it works">
          <View style={styles.stepCard}>
            <StepItem
              index="1"
              title="Open the desktop app"
              description="Go to Trusted device on desktop and show the pairing QR code."
            />
            <StepItem
              index="2"
              title="Scan and request link"
              description="Use this phone to scan the QR and send a signed pairing request."
            />
            <StepItem
              index="3"
              title="Approve on desktop"
              description="The desktop approves the request and unlocks secure control from this phone."
            />
          </View>
        </Section>
      )}
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

function StepItem({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020817", padding: 16 },
  content: { paddingBottom: 32 },
  hero: {
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 18,
    gap: 12,
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
  heroBadgeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  primaryButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: "#eff6ff", fontSize: 14, fontWeight: "700" },
  unlinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3b1a1a",
    backgroundColor: "#1a0a0a",
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  unlinkButtonText: { color: "#f87171", fontSize: 13, fontWeight: "600" },
  heroTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "700" },
  heroText: { color: "#93a4bd", fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 32 },
  sectionTitle: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: "#08111f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  infoLabel: { color: "#93a4bd", fontSize: 12, fontWeight: "600" },
  infoValue: { color: "#f8fafc", fontSize: 12, maxWidth: "60%" },
  stepCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 16,
    gap: 16,
  },
  stepItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepIndex: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stepIndexText: { color: "#7dd3fc", fontSize: 12, fontWeight: "700" },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
  stepDescription: { color: "#93a4bd", fontSize: 13, lineHeight: 19 },
});
