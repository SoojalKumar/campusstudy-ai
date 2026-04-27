import { Tabs } from "expo-router";

import { colors } from "../../lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.inkSoft },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.tide,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: {
          backgroundColor: colors.inkSoft,
          borderTopColor: colors.line,
          minHeight: 72,
          paddingBottom: 12,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="study" options={{ title: "Study" }} />
    </Tabs>
  );
}
