// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   base: "/h-chat-app/",
//   server: {
//     port: 3000,
//     open: true,
//   },
//   resolve: {
//     alias: {
//       "@": "/src",
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // ⭐ مهم: Vercel يخدم من الجذر (وليس من مجلد فرعي مثل GitHub Pages)
  base: "/",
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
