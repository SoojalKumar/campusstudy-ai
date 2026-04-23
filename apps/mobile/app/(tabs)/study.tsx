import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "../../components/screen";

export default function StudyTabScreen() {
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Study modes</Text>
      <View style={{ gap: 12 }}>
        {[
          ["/flashcards/demo", "Flashcards"],
          ["/quizzes/demo", "Quiz player"],
          ["/chat/demo", "Chat with sources"]
        ].map(([href, label]) => (
          <Link href={href as any} key={href} asChild>
            <Pressable style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 18 }}>
              <Text style={{ color: "#f4f7fb", fontSize: 18, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}
