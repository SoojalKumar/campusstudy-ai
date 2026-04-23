import { Text, View } from "react-native";

import { Screen } from "../../components/screen";
import { mobileDashboard } from "../../lib/demo-data";

export default function MobileDashboardScreen() {
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Today&apos;s study stack</Text>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {[
          ["Due cards", `${mobileDashboard.dueFlashcards}`],
          ["Streak", `${mobileDashboard.streakDays} days`]
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              backgroundColor: "#0d1321",
              borderRadius: 24,
              padding: 16,
              minWidth: 150
            }}
          >
            <Text style={{ color: "#a6b4c9", fontSize: 14 }}>{label}</Text>
            <Text style={{ color: "#f4f7fb", fontSize: 28, fontWeight: "700", marginTop: 8 }}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 18, gap: 12 }}>
        <Text style={{ color: "#f4f7fb", fontSize: 20, fontWeight: "700" }}>Weak topics</Text>
        {mobileDashboard.weakTopics.map((topic) => (
          <Text key={topic} style={{ color: "#a6b4c9", fontSize: 15 }}>
            {topic}
          </Text>
        ))}
      </View>
    </Screen>
  );
}
