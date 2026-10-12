// Кроссплатформенный запуск тестов (Windows PowerShell и Linux одинаково):
//   node tests/run.mjs unit [аргументы playwright]
//   node tests/run.mjs e2e  [аргументы playwright]
import { spawnSync } from "node:child_process";

const [project = "unit", ...rest] = process.argv.slice(2);
const env = { ...process.env };
if (project === "unit") env.PW_NO_SERVER = "1"; // юнит-тестам серверы не нужны

const result = spawnSync("npx", ["playwright", "test", `--project=${project}`, ...rest], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
