import { defineConfig } from "tsdown"

export default defineConfig({
  sourcemap: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
})
