import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "../../components/screen";

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Course {courseId}</Text>
      <View style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 18, gap: 10 }}>
        {["Topic folders", "Study pack viewer", "Recent uploads", "Transcript-first review"].map((item) => (
          <Text key={item} style={{ color: "#a6b4c9", fontSize: 15 }}>
            {item}
          </Text>
        ))}
      </View>
    </Screen>
  );
}
