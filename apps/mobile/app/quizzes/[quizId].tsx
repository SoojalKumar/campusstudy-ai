import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "../../components/screen";

export default function QuizScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Quiz {quizId}</Text>
      <View style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 18, gap: 12 }}>
        <Text style={{ color: "#f4f7fb", fontSize: 18, fontWeight: "700" }}>
          Which structure powers breadth-first search?
        </Text>
        {["Stack", "Queue", "Heap", "Set"].map((option) => (
          <Pressable
            key={option}
            style={{ borderWidth: 1, borderColor: "#162238", borderRadius: 18, padding: 14 }}
          >
            <Text style={{ color: "#f4f7fb" }}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
