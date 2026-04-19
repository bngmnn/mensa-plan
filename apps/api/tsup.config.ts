import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  clean: true,
  dts: false,
  outDir: "dist",
  noExternal: ["@mensa/shared"],
});
