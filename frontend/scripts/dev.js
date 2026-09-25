const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const TRACE_FILE = path.join(
  process.env.HOME || "/tmp",
  ".next",
  "trace"
);

function killProcessOnPort(port) {
  try {
    const output = execSync(`ss -tlnp 2>/dev/null || lsof -i :${port} -t 2>/dev/null`, { encoding: "utf8" });
    const pids = output.trim().split("\n").filter(p => /^\d+$/.test(p));
    pids.forEach(pid => {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`[dev] Killed process PID ${pid}`);
      } catch (_) {}
    });
  } catch (_) {}
}

function removeStaleTrace() {
  try {
    if (fs.existsSync(TRACE_FILE)) {
      fs.unlinkSync(TRACE_FILE);
      console.log("[dev] Trace file removed.");
    }
  } catch (_) {
    console.log("[dev] Trace file not present (clean start).");
  }
}

console.log("[dev] Checking for zombie processes on port 3000...");
killProcessOnPort(3000);
removeStaleTrace();

console.log("[dev] Starting Next.js dev server...\n");
const next = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_PATH: "./node_modules",
  },
});

next.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => next.kill("SIGINT"));
process.on("SIGTERM", () => next.kill("SIGTERM"));
