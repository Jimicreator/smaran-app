import { execFileSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";

const PROJECT = path.resolve(new URL("..", import.meta.url).pathname).replaceAll("\\", "/").toLowerCase();
const PID_FILE = path.join(PROJECT.replaceAll("/", path.sep), ".smaran-dev.pid");
const PORTS = [3000, 3001];
function cmd(pid) { try { return execFileSync("powershell.exe", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\").CommandLine`], { encoding: "utf8" }).toLowerCase().replaceAll("\\", "/"); } catch { return ""; } }
function pids(port) { try { const out = execFileSync("cmd.exe", ["/d", "/c", `netstat -ano -p tcp | findstr :${port}`], { encoding: "utf8" }); return [...new Set(out.split(/\r?\n/).flatMap((x) => x.match(/LISTENING\s+(\d+)$/i)?.[1] ?? []).filter(Boolean).map(Number))]; } catch { return []; } }
const targets = new Set();
if (fs.existsSync(PID_FILE)) { const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim()); if (pid) targets.add(pid); }
for (const port of PORTS) for (const pid of pids(port)) targets.add(pid);
let stopped = 0;
for (const pid of targets) {
  const line = cmd(pid);
  if (!line.includes(PROJECT) || !(line.includes("next dev") || line.includes("next/dist/bin/next"))) continue;
  try { execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); stopped += 1; console.log(`[smaran] stopped ${pid}`); } catch {}
}
try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
if (!stopped) console.log("[smaran] no Smaran dev process was running on ports 3000/3001");
