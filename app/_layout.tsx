import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";

import { getOrCreatePhoneId } from "@/lib/crypto";
import { configure } from "@/lib/supabase";
import { phoneIdAtom, supabaseReadyAtom, appLoadedAtom } from "@/lib/store";

const SUPABASE_URL_KEY = "sentinal_supabase_url";
const SUPABASE_KEY_KEY = "sentinal_supabase_key";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

// ─── Loaders ─────────────────────────────────────────────────────────────────

function AppLoader() {
  const setPhoneId = useSetAtom(phoneIdAtom);
  const setReady = useSetAtom(supabaseReadyAtom);
  const setLoaded = useSetAtom(appLoadedAtom);

  useEffect(() => {
    async function init() {
      try {
        const [id, url, key] = await Promise.all([
          getOrCreatePhoneId(),
          SecureStore.getItemAsync(SUPABASE_URL_KEY),
          SecureStore.getItemAsync(SUPABASE_KEY_KEY),
        ]);
        setPhoneId(id);
        if (url && key) {
          configure(url, key);
          setReady(true);
        }
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, [setPhoneId, setReady, setLoaded]);

  return null;
}

// ─── Connection gate ──────────────────────────────────────────────────────────

function SetupScreen() {
  const setReady = useSetAtom(supabaseReadyAtom);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleConnect() {
    if (!url.trim() || !key.trim()) return;
    setSaving(true);
    try {
      await SecureStore.setItemAsync(SUPABASE_URL_KEY, url.trim());
      await SecureStore.setItemAsync(SUPABASE_KEY_KEY, key.trim());
      configure(url.trim(), key.trim());
      setReady(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.gate}>
      <View style={styles.gateCard}>
        <Text style={styles.gateTitle}>Connect to Supabase</Text>
        <Text style={styles.gateSub}>
          Sentinal Worker needs a Supabase project to relay tasks from your
          phone. Enter your project credentials to get started.
        </Text>

        <Text style={styles.fieldLabel}>Supabase URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://project.supabase.co"
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
          Supabase Anon Key
        </Text>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={setKey}
          placeholder="eyJ..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.connectBtn,
            (!url.trim() || !key.trim() || saving) && styles.connectBtnDisabled,
          ]}
          onPress={handleConnect}
          disabled={!url.trim() || !key.trim() || saving}
        >
          <Text style={styles.connectBtnText}>
            {saving ? "Connecting..." : "Connect"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root shell ───────────────────────────────────────────────────────────────

function AppContent() {
  const loaded = useAtomValue(appLoadedAtom);
  const ready = useAtomValue(supabaseReadyAtom);

  if (!loaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#5865F2" />
      </View>
    );
  }

  if (!ready) {
    return <SetupScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#e5e5e5",
        headerTitleStyle: { fontFamily: "monospace", fontSize: 14 },
        contentStyle: { backgroundColor: "#0a0a0a" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="tasks/[id]"
        options={{ title: "Task Detail", presentation: "card" }}
      />
      <Stack.Screen
        name="pair"
        options={{ title: "Pair Desktop", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <AppLoader />
        <StatusBar style="light" backgroundColor="#0a0a0a" />
        <AppContent />
      </QueryClientProvider>
    </JotaiProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  gate: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  gateCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 24,
  },
  gateTitle: {
    color: "#e5e5e5",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  gateSub: {
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    color: "#444",
    fontSize: 10,
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
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
  connectBtn: {
    backgroundColor: "#5865F2",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  connectBtnDisabled: { opacity: 0.4 },
  connectBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
