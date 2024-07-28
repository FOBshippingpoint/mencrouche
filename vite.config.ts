import type { UserConfig } from "vite";

export default {
  // ...
  root: "src", // ./src
  build: {
    outDir: "../dist/site", // ./dist
  },
  base: "/duatz/"
} satisfies UserConfig;
