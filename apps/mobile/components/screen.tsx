import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { colors, spacing } from "../lib/theme";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={[styles.orb, styles.goldOrb]} />
      <View pointerEvents="none" style={[styles.orb, styles.tideOrb]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stack}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.ink,
    flex: 1
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  stack: {
    gap: spacing.lg
  },
  orb: {
    borderRadius: 999,
    height: 240,
    opacity: 0.28,
    position: "absolute",
    width: 240
  },
  goldOrb: {
    backgroundColor: colors.ember,
    left: -120,
    top: -90
  },
  tideOrb: {
    backgroundColor: colors.tide,
    right: -130,
    top: 80
  }
});
