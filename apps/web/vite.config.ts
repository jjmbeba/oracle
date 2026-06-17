import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Most-specific prefix first — passes /api/auth/* through as-is to match backend route
      "/api/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Less-specific prefix second — strips /api for routes without the prefix on the backend
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
