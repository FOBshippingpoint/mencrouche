import type { UserConfig } from "vite";

export default {
  root: "src", // ./src
  build: {
    outDir: "../dist/site", // ./dist
  },
  base: "/mencrouche/" // Required for GitHub Pages.
} satisfies UserConfig;
