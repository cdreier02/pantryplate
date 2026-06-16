import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site: served from https://<user>.github.io/pantryplate/
const BASE = "/pantryplate/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "PantryPlate",
        short_name: "PantryPlate",
        description:
          "Simple, LDL-friendly vegetarian meals built from one shared core pantry.",
        theme_color: "#1F4D32",
        background_color: "#F1F5EC",
        display: "standalone",
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Meal data: network wins when online (fresh meals), cache covers offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith("/meals.json"),
            handler: "NetworkFirst",
            options: {
              cacheName: "pp-meals-json",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "pp-google-fonts" },
          },
        ],
      },
    }),
  ],
});
