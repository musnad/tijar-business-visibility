import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: ".",
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  // Tesseract is browser-only (Scan Document). Keep it out of the Nitro/SSR graph
  // so production builds do not hang tracing its worker/wasm assets.
  ssr: {
    external: ["tesseract.js"],
  },
  optimizeDeps: {
    exclude: ["tesseract.js"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      // SSR error wrapper in src/server.ts (nitro/vite builds from this entry).
      server: { entry: "server" },
    }),
    viteReact(),
    nitro({
      rollupConfig: {
        external: ["tesseract.js"],
      },
    }),
  ],
});
