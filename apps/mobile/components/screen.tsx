import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#081019" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ gap: 16 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

