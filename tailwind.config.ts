import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#531220", light: "#7A2A3A", band: "#F3E9EC", line: "#E0CDD3" },
      },
    },
  },
  plugins: [],
};
export default config;
