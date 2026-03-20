import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider, useSetAtom } from "jotai";
import { useEffect } from "react";

import * as SecureStore from "expo-secure-store";
import { getOrCreatePhoneId } from "@/lib/crypto";
import { phoneIdAtom, pairedDeviceIdAtom, pairedDeviceNameAtom, isConnectedAtom } from "@/lib/store";
import { colors } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

function PhoneIdLoader() {
  const setPhoneId = useSetAtom(phoneIdAtom);
  useEffect(() => {
    getOrCreatePhoneId().then(setPhoneId);
  }, [setPhoneId]);
  return null;
}

function PairingStateLoader() {
  const setDeviceId = useSetAtom(pairedDeviceIdAtom);
  const setDeviceName = useSetAtom(pairedDeviceNameAtom);
  const setIsConnected = useSetAtom(isConnectedAtom);
  useEffect(() => {
    async function load() {
      const id = await SecureStore.getItemAsync("sentinal_paired_device_id");
      const name = await SecureStore.getItemAsync("sentinal_paired_device_name");
      if (id) {
        setDeviceId(id);
        setDeviceName(name ?? "Desktop");
        setIsConnected(true);
      }
    }
    load();
  }, [setDeviceId, setDeviceName, setIsConnected]);
  return null;
}

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <PhoneIdLoader />
        <PairingStateLoader />
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontSize: 17, fontWeight: "600" },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="tasks/[id]"
            options={{ title: "Task detail", presentation: "card" }}
          />
          <Stack.Screen
            name="pair"
            options={{ title: "Link trusted device", presentation: "modal" }}
          />
        </Stack>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
