import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect } from "react";
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
  const setDeviceId = useSetAtom(pairedDeviceIdAtom);
  const setDeviceName = useSetAtom(pairedDeviceNameAtom);
  const setIsConnected = useSetAtom(isConnectedAtom);

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
      const { error } = await sb.from("pairing_requests").insert({
        device_id: deviceId,
        phone_public_key: publicKey,
        phone_name: `Phone-${phoneId.slice(0, 8)}`,
        status: "pending",
      });

      if (error) throw error;

      // Subscribe to pairing_requests for approval
      const channel = sb
        .channel(`pairing-${phoneId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "pairing_requests",
            filter: `phone_public_key=eq.${publicKey}`,
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
              Alert.alert("Paired!", `Connected to ${deviceName}`, [
                { text: "OK", onPress: () => router.back() },
              ]);
            } else if (req.status === "rejected") {
              sb.removeChannel(channel);
              Alert.alert("Rejected", "The desktop rejected the pairing request.", [
                { text: "OK", onPress: () => setScanned(false) },
              ]);
            }
          }
        )
        .subscribe();

      // Auto-cancel after 60 seconds
      setTimeout(() => {
        sb.removeChannel(channel);
        if (!scanned) return;
        Alert.alert("Timeout", "Pairing request timed out.", [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
      }, 60_000);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to pair", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    } finally {
      setPairing(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera permission required to scan QR code</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
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

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.finder} />
        <Text style={styles.hint}>
          {pairing ? "Waiting for desktop approval..." : "Point at the QR code on your desktop"}
        </Text>
        {pairing && <ActivityIndicator color="#5865F2" style={{ marginTop: 16 }} />}
        {scanned && !pairing && (
          <TouchableOpacity style={styles.retryBtn} onPress={() => setScanned(false)}>
            <Text style={styles.retryText}>Scan again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  centered: { flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", padding: 32 },
  permText: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 20 },
  permBtn: { backgroundColor: "#5865F2", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permBtnText: { color: "#fff", fontSize: 14 },
  overlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  finder: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: "#5865F2",
    borderRadius: 12,
    marginBottom: 24,
  },
  hint: { color: "#e5e5e5", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: "#5865F2", borderRadius: 8 },
  retryText: { color: "#fff", fontSize: 13 },
});
