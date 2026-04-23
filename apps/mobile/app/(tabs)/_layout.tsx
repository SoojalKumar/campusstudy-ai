import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0d1321" },
        headerTintColor: "#f4f7fb",
        tabBarStyle: { backgroundColor: "#0d1321", borderTopColor: "#162238" },
        tabBarActiveTintColor: "#73c9c7",
        tabBarInactiveTintColor: "#7f8ea3"
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="study" options={{ title: "Study" }} />
    </Tabs>
  );
}

