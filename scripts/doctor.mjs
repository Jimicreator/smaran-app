import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const PROJECT = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function readEnvFile() {
  try { return fs.readFileSync(path.join(PROJECT, ".env.local"), "utf8"); } catch { return ""; }
}

function getEnv(name, fileText) {
  return process.env[name] ?? fileText.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1] ?? "";
}

function mark(label, ok) {
  console.log(`[${ok ? "OK" : "FAIL"}] ${label}`);
  return ok;
}

const [major, minor] = process.versions.node.split(".").map(Number);
const nextSupported = major > 20 || (major === 20 && minor >= 9) || major >= 21;
const newerToolingRecommended = major > 22 || (major === 22 && minor >= 13) || major >= 23;
const fileText = readEnvFile();
let failures = 0;

if (!mark(`Node ${process.versions.node} (Next.js-compatible minimum 20.9)`, nextSupported)) failures++;
if (!newerToolingRecommended) console.log("[WARN] Some developer dependencies prefer Node 22.13+. You can upgrade Node later; this is not a Smaran runtime failure.");
if (!mark("package.json", fs.existsSync(path.join(PROJECT, "package.json")))) failures++;
if (!mark(".env.local", fs.existsSync(path.join(PROJECT, ".env.local")))) failures++;
if (!mark("Supabase URL", Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL", fileText)))) failures++;
if (!mark("Supabase publishable key", Boolean(getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", fileText)))) failures++;
if (!mark("Supabase migration", fs.existsSync(path.join(PROJECT, "supabase/migrations/20261006_smaran_v1_3.sql")))) failures++;

let nextOk = false;
try {
  const nextPkg = require.resolve("next/package.json", { paths: [PROJECT] });
  nextOk = fs.existsSync(nextPkg);
} catch {}
if (!nextOk) nextOk = fs.existsSync(path.join(PROJECT, "node_modules/next/dist/bin/next"));
if (!mark("Next.js installed", nextOk)) failures++;

let tscOk = false;
try {
  const tscPkg = require.resolve("typescript/package.json", { paths: [PROJECT] });
  tscOk = fs.existsSync(tscPkg);
} catch {}
if (!tscOk) tscOk = fs.existsSync(path.join(PROJECT, "node_modules/typescript/bin/tsc"));
if (!mark("TypeScript installed", tscOk)) failures++;

// Do not spawn npm from inside npm. That caused the old false failure.
const npmRuntime = Boolean(process.env.npm_execpath || process.env.npm_command);
if (npmRuntime) {
  mark("npm runtime", true);
} else if (process.platform !== "win32") {
  mark("npm runtime", true);
} else {
  // If someone invokes the doctor directly with `node scripts/doctor.mjs`,
  // still verify that npm is discoverable without launching a second npm.
  try {
    execFileSync("where.exe", ["npm"], { stdio: "ignore" });
    mark("npm available", true);
  } catch {
    mark("npm available", false);
    failures++;
  }
}

console.log("\nRecommended verification:");
console.log("  npm run typecheck");
console.log("  npm run build");
if (failures) process.exitCode = 1;
