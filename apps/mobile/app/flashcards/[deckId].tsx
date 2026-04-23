import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "../../components/screen";

export default function FlashcardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Deck {deckId}</Text>
      <View
        style={{
          backgroundColor: "#10233b",
          borderRadius: 28,
          padding: 24,
          minHeight: 260,
          justifyContent: "space-between"
        }}
      >
        <Text style={{ color: "#a6b4c9", letterSpacing: 2 }}>FRONT</Text>
        <Text style={{ color: "#f4f7fb", fontSize: 26, fontWeight: "700" }}>
          When is BFS preferable to DFS?
        </Text>
        <Pressable style={{ backgroundColor: "#73c9c7", borderRadius: 18, padding: 14 }}>
          <Text style={{ color: "#081019", textAlign: "center", fontWeight: "700" }}>Reveal answer</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
