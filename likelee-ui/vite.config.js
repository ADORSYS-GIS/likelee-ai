import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return defineConfig({
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL),
    },
    server: {
      allowedHosts: true,
      host: true,
      port: 5173,
      strictPort: true,
      watch: {
        usePolling: true,
        interval: 500,
      },
      hmr: {
        host: "localhost",
        port: 5173,
        protocol: "ws",
      },
      proxy: {
        "/api": {
          target: "http://localhost:8787",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
  });
};
