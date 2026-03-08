import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";

export const unstable_settings = {
  initialRouteName: "settings",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#08111f",
          borderTopColor: "#162133",
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#7dd3fc",
        tabBarInactiveTintColor: "#6b7a92",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: "#08111f" },
        headerShadowVisible: false,
        headerTintColor: "#f8fafc",
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
        sceneStyle: { backgroundColor: "#020817" },
      }}
    >
      <Tabs.Screen
        name="settings"
        options={{
          title: "Trusted device",
          tabBarIcon: ({ color }) => (
            <TabIcon name="shield-checkmark-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Operations",
          tabBarIcon: ({ color }) => (
            <TabIcon name="grid-outline" color={color} />
          ),
          headerRight: () => <PairButton />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Run task",
          tabBarIcon: ({ color }) => (
            <TabIcon name="add-circle-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={name} size={20} color={color} />;
}

function PairButton() {
  return (
    <Pressable
      onPress={() => router.push("/pair")}
      style={{
        marginRight: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1e293b",
        backgroundColor: "#0f172a",
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "600" }}>
        Link device
      </Text>
    </Pressable>
  );
}
