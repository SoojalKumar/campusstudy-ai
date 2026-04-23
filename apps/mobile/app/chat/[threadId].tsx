import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "../../components/screen";

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Thread {threadId}</Text>
      <View style={{ gap: 12 }}>
        <View style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 16 }}>
          <Text style={{ color: "#a6b4c9" }}>How should I revise BFS vs DFS tonight?</Text>
        </View>
        <View style={{ backgroundColor: "#133231", borderRadius: 24, padding: 16 }}>
          <Text style={{ color: "#f4f7fb" }}>
            Focus on traversal order, shortest path guarantees, and queue vs stack behavior.
          </Text>
          <Text style={{ color: "#a6b4c9", marginTop: 10 }}>Cited from Page 1 and 00:46 lecture clip.</Text>
        </View>
      </View>
    </Screen>
  );
}
