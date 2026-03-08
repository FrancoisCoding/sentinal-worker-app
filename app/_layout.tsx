import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider, useSetAtom } from "jotai";
import { useEffect } from "react";

import { getOrCreatePhoneId } from "@/lib/crypto";
import { phoneIdAtom } from "@/lib/store";

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

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <PhoneIdLoader />
        <StatusBar style="light" backgroundColor="#0a0a0a" />
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
      </QueryClientProvider>
    </JotaiProvider>
  );
}
