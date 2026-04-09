import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const runner = path.resolve(repoRoot, "internal", "onboarding-agent", "run.mjs");
const cases = [
  "internal/onboarding-agent/examples/onboarding-advocacia-mock.json",
  "internal/onboarding-agent/examples/onboarding-imobiliaria-mock.json"
];

let failed = false;

for (const testCase of cases) {
  const result = spawnSync(
    process.execPath,
    [runner, "--input", testCase, "--mode", "dry-run"],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (result.status !== 0 && result.status !== 2) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

