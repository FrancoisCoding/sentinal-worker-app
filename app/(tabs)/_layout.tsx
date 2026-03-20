import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { colors, radii } from "@/lib/theme";

export const unstable_settings = {
  initialRouteName: "settings",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.background },
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
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
        Link device
      </Text>
    </Pressable>
  );
}
