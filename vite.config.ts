import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), babel({ presets: [reactCompilerPreset()] })],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  server: { host: "127.0.0.1" },
  optimizeDeps: {
    // Avoids rebuilding the cache during the first form submission or navigation.
    noDiscovery: true,
    include: [
      "better-auth/react",
      "better-auth/client/plugins",
      "zod",
      "@livekit/components-react",
      "livekit-client",
      "gsap",
      "@gsap/react",
      "radix-ui",
      "@tanstack/react-table",
      "date-fns",
      "nuqs",
      "nuqs/adapters/react-router/v8",
      "nuqs/server",
      "@sentry/react-router",
      "class-variance-authority",
      "cn",
      "cmdk",
      "lucide-react",
      "sonner",
      "uqr",
      "@date-fns/tz",
      "react-day-picker",
    ],
  },
});
