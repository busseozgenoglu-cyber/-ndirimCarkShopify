import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

if (process.env.HOST) {
  process.env.SHOPIFY_VITE_HMR_USE_WSS =
    process.env.SHOPIFY_VITE_HMR_USE_WSS ?? "1";
}

const port = Number(process.env.PORT || 8080);
const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

export default defineConfig({
  server: {
    allowedHosts: [host],
    port,
    hmr: { protocol: "ws", host: "localhost", port: 64999, clientPort: 64999 },
    fs: { allow: ["app", "node_modules"] },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  build: { assetsInlineLimit: 0 },
  optimizeDeps: { include: ["@shopify/app-bridge-react"] },
});
