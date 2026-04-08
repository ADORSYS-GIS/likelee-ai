import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let pwaPlugin = null;

  try {
    const { VitePWA } = await import("vite-plugin-pwa");
    pwaPlugin = VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 15000000,
      },
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Likelee - Agency Dashboard",
        short_name: "Likelee",
        description: "Likelee Agency Operations Dashboard",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
    });
  } catch {
    console.warn(
      "[vite] vite-plugin-pwa is not installed; continuing without PWA support.",
    );
  }

  return defineConfig({
    plugins: [react(), pwaPlugin].filter(Boolean),
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
