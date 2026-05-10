import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f6f3ec",
        tide: "#315c72",
        ember: "#b85d42",
        gold: "#9f6f2c"
      },
      backgroundImage: {
        "study-grid":
          "linear-gradient(rgba(23,32,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23,32,51,0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
