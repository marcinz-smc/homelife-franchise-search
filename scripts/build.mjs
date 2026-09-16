import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const workspaces = ["hlfs-mongo", "hlfs-lambda", "hlfs-admin", "hlfs-cloudfront"];

for (const workspace of workspaces) {
  const result = spawnSync(npm, ["run", "build", "-w", workspace], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
