import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "node:child_process";
import net from "node:net";
import { defineConfig, type Plugin } from "vite";

const CRON_LOCK_PORT = 45123;

function cronPlugin(): Plugin {
  return {
    name: "cron",
    apply: "serve",
    async configureServer(server) {
      const lock = net.createServer();
      const acquired = await new Promise<boolean>((resolve) => {
        lock.once("error", () => resolve(false));
        lock.once("listening", () => resolve(true));
        lock.listen(CRON_LOCK_PORT, "127.0.0.1");
      });
      if (!acquired) return;

      const proc = spawn("bun", ["cron.ts"], { stdio: "inherit" });
      server.httpServer?.on("close", () => {
        proc.kill();
        lock.close();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    external: ["bun:sqlite", "bun"],
  },
  optimizeDeps: {
    entries: ["./app/**/*.tsx"],
  },
  plugins: [tailwindcss(), reactRouter(), cronPlugin()],
});
