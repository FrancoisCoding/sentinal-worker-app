import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#1a1a1a",
          height: 60,
        },
        tabBarActiveTintColor: "#5865F2",
        tabBarInactiveTintColor: "#444",
        tabBarLabelStyle: { fontSize: 10, fontFamily: "monospace" },
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#e5e5e5",
        headerTitleStyle: { fontFamily: "monospace", fontSize: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <TabIcon label="⚡" color={color} />
          ),
          headerRight: () => <PairButton />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color }) => (
            <TabIcon label="+" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <TabIcon label="⚙" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{label}</Text>;
}

function PairButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push("/pair")}
      style={{ marginRight: 16 }}
    >
      <Text style={{ color: "#5865F2", fontSize: 12, fontFamily: "monospace" }}>
        Pair
      </Text>
    </TouchableOpacity>
  );
}
