export const colors = {
  ink: "#07111d",
  inkSoft: "#0d1728",
  panel: "#101d31",
  panelStrong: "#142640",
  line: "rgba(255,255,255,0.11)",
  text: "#f5f7fb",
  muted: "#a8b6ca",
  dim: "#74849d",
  tide: "#73c9c7",
  tideSoft: "rgba(115,201,199,0.16)",
  gold: "#f6d78b",
  goldSoft: "rgba(246,215,139,0.16)",
  ember: "#ff8b5d",
  emberSoft: "rgba(255,139,93,0.16)",
  success: "#9ee6b5",
  danger: "#ff8fa3"
};

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30
};

export const typography = {
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 2.8,
    textTransform: "uppercase" as const
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.8
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
};

