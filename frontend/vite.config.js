import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
  environment: "jsdom",
  globals: true,
  environmentOptions: {
    jsdom: {
      url: "http://localhost",
    },
  },
},
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});