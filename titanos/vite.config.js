import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execFileSync } from "node:child_process";
import process from "node:process";

function getBuildVersion() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return new Date().toISOString();
  }
}

const buildVersion = getBuildVersion();

export default defineConfig({
  define: {
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(buildVersion),
  },
  plugins: [
    react(),

    VitePWA({
      registerType: "prompt",
      injectRegister: false,

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
      ],

      manifest: {
        id: "/",
        name: "TitanOS",
        short_name: "TitanOS",
        description: "Sistema de gestión para talleres",
        theme_color: "#1f1f1f",
        background_color: "#1f1f1f",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,webp}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
    }),
  ],
});
