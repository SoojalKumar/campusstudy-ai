import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type DimensionValue, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../lib/theme";

export function Card({
  children,
  tone = "default",
  style
}: {
  children: ReactNode;
  tone?: "default" | "strong" | "accent" | "warning";
  style?: ViewStyle;
}) {
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>;
}

export function Pill({
  label,
  tone = "tide"
}: {
  label: string;
  tone?: "tide" | "gold" | "ember";
}) {
  return (
    <View style={[styles.pill, pillStyles[tone]]}>
      <Text style={[styles.pillText, pillTextStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action
}: {
  eyebrow?: string;
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        {eyebrow ? <Text style={typography.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  tone = "tide"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "tide" | "gold" | "ember";
}) {
  return (
    <Card style={styles.metricTile}>
      <Pill label={label} tone={tone} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </Card>
  );
}

export function ProgressBar({ value, tone = "tide" }: { value: number; tone?: "tide" | "ember" }) {
  const width = `${Math.max(4, Math.min(100, Math.round(value * 100)))}%` as DimensionValue;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width, backgroundColor: tone === "tide" ? colors.tide : colors.ember }]} />
    </View>
  );
}

export function ActionRow({
  title,
  description,
  onPress
}: {
  title: string;
  description: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      <View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={styles.actionArrow}>Open</Text>
    </Pressable>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card style={styles.emptyState}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </Card>
  );
}

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.panel
  },
  strong: {
    backgroundColor: colors.panelStrong
  },
  accent: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.28)"
  },
  warning: {
    backgroundColor: colors.emberSoft,
    borderColor: "rgba(255,139,93,0.24)"
  }
});

const pillStyles = StyleSheet.create({
  tide: {
    backgroundColor: colors.tideSoft
  },
  gold: {
    backgroundColor: colors.goldSoft
  },
  ember: {
    backgroundColor: colors.emberSoft
  }
});

const pillTextStyles = StyleSheet.create({
  tide: {
    color: colors.tide
  },
  gold: {
    color: colors.gold
  },
  ember: {
    color: colors.ember
  }
});

const styles = StyleSheet.create({
  card: {
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6
  },
  sectionAction: {
    color: colors.tide,
    fontSize: 13,
    fontWeight: "700"
  },
  metricTile: {
    minWidth: 168
  },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18
  },
  metricHelper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: 999,
    height: "100%"
  },
  actionRow: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }]
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  actionDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  actionArrow: {
    color: colors.tide,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  emptyState: {
    borderStyle: "dashed"
  }
});
