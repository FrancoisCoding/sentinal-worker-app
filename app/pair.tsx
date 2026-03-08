import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { pairedDeviceIdAtom, pairedDeviceNameAtom, isConnectedAtom } from "@/lib/store";
import { getClient } from "@/lib/supabase";
import { getOrCreatePhoneId, getPublicKey } from "@/lib/crypto";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const PAIRED_DEVICE_KEY = "sentinal_paired_device_id";
const PAIRED_NAME_KEY = "sentinal_paired_device_name";

export default function PairScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const setDeviceId = useSetAtom(pairedDeviceIdAtom);
  const setDeviceName = useSetAtom(pairedDeviceNameAtom);
  const setIsConnected = useSetAtom(isConnectedAtom);
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Load existing pairing on mount
  useEffect(() => {
    async function loadPairing() {
      const id = await SecureStore.getItemAsync(PAIRED_DEVICE_KEY);
      const name = await SecureStore.getItemAsync(PAIRED_NAME_KEY);
      if (id) {
        setDeviceId(id);
        setDeviceName(name ?? "Desktop");
        setIsConnected(true);
      }
    }
    loadPairing();
  }, [setDeviceId, setDeviceName, setIsConnected]);

  async function handleQrCode(data: string) {
    if (scanned || pairing) return;
    setScanned(true);
    setPairing(true);

    try {
      // QR format: sentinalworker://pair?device_id=<uuid>&channel=<channel>&name=<name>
      const url = new URL(data);
      if (url.protocol !== "sentinalworker:") throw new Error("Invalid QR code");

      const deviceId = url.searchParams.get("device_id");
      const deviceName = url.searchParams.get("name") ?? "Desktop";

      if (!deviceId) throw new Error("Missing device_id in QR code");

      const phoneId = await getOrCreatePhoneId();
      const publicKey = await getPublicKey();

      // Insert pairing request into Supabase with real Ed25519 public key
      const sb = getClient();
      const { data: insertedRows, error } = await sb
        .from("pairing_requests")
        .insert({
          device_id: deviceId,
          phone_public_key: publicKey,
          phone_name: `Phone-${phoneId.slice(0, 8)}`,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      const requestId = (insertedRows as { id: string }).id;

      // Subscribe to pairing_requests by row ID (avoids REPLICA IDENTITY FULL requirement)
      const channel = sb
        .channel(`pairing-${phoneId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "pairing_requests",
            filter: `id=eq.${requestId}`,
          },
          async (payload) => {
            const req = payload.new as { status: string };
            if (req.status === "approved") {
              sb.removeChannel(channel);
              await SecureStore.setItemAsync(PAIRED_DEVICE_KEY, deviceId);
              await SecureStore.setItemAsync(PAIRED_NAME_KEY, deviceName);
              setDeviceId(deviceId);
              setDeviceName(deviceName);
              setIsConnected(true);
              setFeedback(`Trusted device linked to ${deviceName}.`);
              setTimeout(() => router.back(), 900);
            } else if (req.status === "rejected") {
              sb.removeChannel(channel);
              setFeedback("The desktop rejected the pairing request.");
              setScanned(false);
            }
          }
        )
        .subscribe();

      // Auto-cancel after 60 seconds
      setTimeout(() => {
        sb.removeChannel(channel);
        if (!scanned) return;
        setFeedback("Pairing request timed out. Try scanning again.");
        setScanned(false);
      }, 60_000);
    } catch (e: any) {
      setFeedback(e?.message ?? "Failed to pair.");
      setScanned(false);
    } finally {
      setPairing(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Animated.View
          style={[
            styles.permissionCard,
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
          <View style={styles.permissionIconWrap}>
            <Ionicons name="scan-outline" size={28} color="#7dd3fc" />
          </View>
          <Text style={styles.permissionTitle}>Scan the trusted desktop QR code</Text>
          <Text style={styles.permText}>
            Camera access is required to read the desktop pairing code and create the signed
            one-to-one device link.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow camera access</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : ({ data }) => handleQrCode(data)}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.finder,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.72, 1],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1.01],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#7dd3fc" />
            <Text style={styles.sheetBadgeText}>Trusted device linking</Text>
          </View>
          <Text style={styles.sheetTitle}>Scan the desktop QR code</Text>
          <Text style={styles.hint}>
            {pairing
              ? "Waiting for desktop approval to complete the secure link."
              : "Align the QR code inside the frame to request a secure one-to-one device link."}
          </Text>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
        {pairing && <ActivityIndicator color="#7dd3fc" style={{ marginTop: 18 }} />}
        <TouchableOpacity style={styles.retryBtn} onPress={() => {
          setFeedback(null);
          setScanned(false);
        }}>
          <Text style={styles.retryText}>
            {pairing ? "Scanning locked during approval" : "Scan again"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#020817",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionCard: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#162133",
    backgroundColor: "#08111f",
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  permissionIconWrap: {
    height: 72,
    width: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  permissionTitle: { color: "#f8fafc", fontSize: 21, fontWeight: "700", textAlign: "center" },
  permText: { color: "#93a4bd", fontSize: 14, lineHeight: 21, textAlign: "center" },
  permBtn: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  permBtnText: { color: "#eff6ff", fontSize: 14, fontWeight: "700" },
  overlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,8,23,0.5)",
  },
  finder: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: "#7dd3fc",
    backgroundColor: "rgba(8,17,31,0.08)",
    borderRadius: 24,
    marginBottom: 24,
  },
  sheet: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
  },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#16324d",
    backgroundColor: "rgba(8,17,31,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetBadgeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },
  sheetTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "700", textAlign: "center" },
  hint: { color: "#dbe7f5", fontSize: 14, lineHeight: 21, textAlign: "center", paddingHorizontal: 28 },
  feedback: {
    color: "#7dd3fc",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(8,17,31,0.92)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  retryText: { color: "#dbe7f5", fontSize: 13, fontWeight: "600" },
});
