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
import { getClient } from "@/lib/supabase";
import { getPublicKey } from "@/lib/crypto";
import { router } from "expo-router";
import { colors, radii } from "@/lib/theme";

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
            // Delete from Supabase paired_phones
            try {
              const publicKey = await getPublicKey();
              const sb = getClient();
              await sb
                .from("paired_phones")
                .delete()
                .eq("phone_public_key", publicKey);
            } catch (e) {
              console.error("Failed to delete from Supabase:", e);
            }
            // Clear local state
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
            color={colors.primary}
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
          <Ionicons name="scan-outline" size={18} color={colors.primaryForeground} />
          <Text style={styles.primaryButtonText}>
            {isConnected ? "Relink trusted device" : "Scan desktop QR code"}
          </Text>
        </Pressable>
      </Animated.View>

      <Section title="Link status">
        <View style={styles.infoBox}>
          <InfoRow label="Phone ID" value={phoneId || "—"} mono />
          <InfoRow label="Trusted desktop" value={deviceName ?? "Not linked"} />
          <InfoRow label="Status" value={isConnected ? "Linked" : "Awaiting link"} />
          {deviceId && <InfoRow label="Desktop ID" value={deviceId} mono />}
        </View>
        {isConnected ? (
          <Pressable style={styles.unlinkButton} onPress={handleUnlink}>
            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.unlinkButtonText}>Unlink desktop</Text>
          </Pressable>
        ) : null}
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
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  content: { paddingBottom: 32 },
  hero: {
    marginBottom: 24,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroBadgeText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  primaryButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.interactive,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "700" },
  unlinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.interactive,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  unlinkButtonText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  heroTitle: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  heroText: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  section: { marginBottom: 32 },
  sectionTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  infoLabel: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  infoValue: { color: colors.foreground, fontSize: 12, maxWidth: "60%" },
  stepCard: {
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 16,
  },
  stepItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepIndex: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepIndexText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  stepDescription: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
});
