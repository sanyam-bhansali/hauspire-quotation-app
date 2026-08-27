import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#6B4226", light: "#8B5E3C", band: "#EFE7DE", line: "#D9CFC4" },
      },
    },
  },
  plugins: [],
};
export default config;
