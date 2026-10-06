import { spawn, execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Windows-safe project root. URL.pathname adds a leading slash to C:/ paths;
// fileURLToPath() converts the file URL correctly on every supported platform.
const PROJECT = fileURLToPath(new URL("../", import.meta.url));
const PORT = 3000;
const PID_FILE = path.join(PROJECT, ".smaran-dev.pid");
const LAN_FLAG = true;

function isPrivateIPv4(address) {
  return /^(10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3}\.)\d{1,3})$/.test(address);
}

function likelyPhysicalInterface(name) {
  const value = String(name).toLowerCase();
  return !/(wsl|docker|veth|vethernet|hyper-v|hyperv|virtualbox|vmware|loopback|vpn|wireguard|tailscale|zerotier|hamachi|tap|bridge)/.test(value);
}

function privateIPv4s() {
  const preferred = [];
  const fallback = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const info of entries ?? []) {
      const family = typeof info.family === "string" ? info.family : String(info.family);
      if (family !== "IPv4" || info.internal || !isPrivateIPv4(info.address)) continue;
      (likelyPhysicalInterface(name) ? preferred : fallback).push({ address: info.address, name });
    }
  }

  const dedupe = (items) => [...new Map(items.map((item) => [item.address, item])).values()];
  const all = [...dedupe(preferred), ...dedupe(fallback)];
  // Prefer common home/phone LAN ranges over virtual/WSL addresses.
  all.sort((a, b) => {
    const score = (ip) => ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") || ip.startsWith("172.19.") ? 3 : 2;
    return score(a.address) - score(b.address);
  });
  return all;
}

function commandLine(pid) {
  if (process.platform !== "win32") return "";
  try {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\").CommandLine`],
      { encoding: "utf8" },
    ).trim();
  } catch {
    return "";
  }
}

function pidsOnPort(port) {
  if (process.platform !== "win32") return [];
  try {
    const output = execFileSync(
      "cmd.exe",
      ["/d", "/c", `netstat -ano -p tcp | findstr :${port}`],
      { encoding: "utf8" },
    );
    const pids = [];
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/LISTENING\s+(\d+)$/i);
      if (match?.[1]) pids.push(Number(match[1]));
    }
    return [...new Set(pids)];
  } catch {
    return [];
  }
}

function stopStaleSmaran() {
  if (process.platform !== "win32") return;

  const projectMarker = PROJECT.replaceAll("\\", "/").toLowerCase();
  const candidates = new Set(pidsOnPort(PORT));

  if (fs.existsSync(PID_FILE)) {
    const old = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (Number.isInteger(old) && old > 0) candidates.add(old);
  }

  const killed = [];
  for (const pid of candidates) {
    if (pid === process.pid) continue;
    const cmd = commandLine(pid).replaceAll("\\", "/").toLowerCase();
    const looksLikeSmaran = cmd.includes(projectMarker) &&
      (cmd.includes("next dev") || cmd.includes("next/dist/bin/next") || cmd.includes("next\\dist\\bin\\next"));
    if (!looksLikeSmaran) continue;
    try {
      execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      killed.push(pid);
    } catch {
      // Process may already be gone.
    }
  }

  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
  if (killed.length) console.log(`[smaran] Stopped stale Smaran Next process(es): ${killed.join(", ")}`);
}

function nextBinary() {
  return path.join(PROJECT, "node_modules", "next", "dist", "bin", "next");
}

stopStaleSmaran();
console.log(`[smaran] Starting Smaran on port ${PORT} (LAN enabled)...`);
console.log("[smaran] This PC: http://localhost:3000");

const ips = privateIPv4s();
if (LAN_FLAG && ips.length) {
  for (const entry of ips) {
    console.log(`[smaran] PHONE on same Wi-Fi: http://${entry.address}:3000`);
  }
} else if (LAN_FLAG) {
  console.log("[smaran] LAN IP: not detected. Run ipconfig and use the Wi-Fi IPv4 address.");
}
console.log("[smaran] Do not use 0.0.0.0 in the phone browser; that is only the server bind address.");
console.log("[smaran] If phone cannot connect, allow TCP 3000 on the Windows Private network.");

const binary = nextBinary();
if (!fs.existsSync(binary)) {
  console.error(`[smaran] Next.js CLI not found at: ${binary}`);
  console.error("[smaran] You already installed packages if 'npm run typecheck' works; this usually means the old launcher was resolving the project path incorrectly.");
  console.error("[smaran] Run 'npm install --legacy-peer-deps' once, then retry.");
  process.exit(1);
}

// IMPORTANT: use an absolute Windows-safe CLI path and Node itself. This avoids
// cmd.exe/npx.cmd spawn EINVAL issues and avoids the old URL.pathname bug.
const child = spawn(
  process.execPath,
  [binary, "dev", "--hostname", "0.0.0.0", "--port", String(PORT)],
  { stdio: "inherit", shell: false, cwd: PROJECT, env: process.env, windowsHide: false },
);

try { fs.writeFileSync(PID_FILE, String(child.pid ?? "")); } catch {}

let shuttingDown = false;
function cleanup() {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
}
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  cleanup();
  if (!child.killed) child.kill(signal);
}

process.on("exit", cleanup);
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("error", (error) => {
  cleanup();
  console.error(`[smaran] Could not start Next.js: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  cleanup();
  if (!shuttingDown && signal) console.error(`[smaran] Next.js stopped by ${signal}.`);
  process.exit(code ?? 0);
});
