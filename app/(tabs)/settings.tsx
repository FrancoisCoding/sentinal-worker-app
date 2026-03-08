import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useAtom, useSetAtom } from "jotai";
import { pairedDeviceIdAtom, pairedDeviceNameAtom, phoneIdAtom, isConnectedAtom, supabaseReadyAtom } from "@/lib/store";
import { configure } from "@/lib/supabase";
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const SUPABASE_URL_KEY = "sentinal_supabase_url";
const SUPABASE_KEY_KEY = "sentinal_supabase_key";

export default function SettingsScreen() {
  const [phoneId] = useAtom(phoneIdAtom);
  const [deviceId] = useAtom(pairedDeviceIdAtom);
  const [deviceName] = useAtom(pairedDeviceNameAtom);
  const [isConnected] = useAtom(isConnectedAtom);
  const setReady = useSetAtom(supabaseReadyAtom);

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const url = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
      const key = await SecureStore.getItemAsync(SUPABASE_KEY_KEY);
      if (url) setSupabaseUrl(url);
      if (key) setSupabaseKey(key);
    }
    load();
  }, []);

  async function handleSave() {
    await SecureStore.setItemAsync(SUPABASE_URL_KEY, supabaseUrl.trim());
    await SecureStore.setItemAsync(SUPABASE_KEY_KEY, supabaseKey.trim());
    if (supabaseUrl.trim() && supabaseKey.trim()) {
      configure(supabaseUrl.trim(), supabaseKey.trim());
      setReady(true);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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

      <Section title="Supabase relay">
        <Field
          label="Supabase URL"
          value={supabaseUrl}
          onChangeText={setSupabaseUrl}
          placeholder="https://xxx.supabase.co"
        />
        <Field
          label="Supabase Anon Key"
          value={supabaseKey}
          onChangeText={setSupabaseKey}
          placeholder="eyJ..."
          secureTextEntry
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? "Saved ✓" : "Save"}</Text>
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#222"
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
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
  fieldLabel: { color: "#444", fontSize: 11, fontFamily: "monospace", marginBottom: 6 },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    padding: 12,
    color: "#e5e5e5",
    fontFamily: "monospace",
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: "#5865F2",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "monospace" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#5865F2",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineBtnText: { color: "#5865F2", fontSize: 13, fontFamily: "monospace" },
});
