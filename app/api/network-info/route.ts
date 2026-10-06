import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

function isPrivateIPv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function interfaceScore(name: string) {
  const value = name.toLowerCase();
  if (/wlan|wi-?fi|wireless/.test(value)) return 100;
  if (/ethernet|en\d+/.test(value)) return 80;
  if (/virtual|vmware|virtualbox|veth|hyper-v|hyperv|wsl|docker|tailscale|zerotier|loopback/.test(value)) return -100;
  return 20;
}

export async function GET() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const usableConfigured = configured && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(configured) ? configured.replace(/\/$/, "") : "";
  const candidates: Array<{ address: string; score: number }> = [];

  for (const [name, values] of Object.entries(networkInterfaces())) {
    const score = interfaceScore(name);
    if (score < 0 || !values) continue;
    for (const value of values) {
      if (value.family !== "IPv4" || value.internal || !isPrivateIPv4(value.address)) continue;
      candidates.push({ address: value.address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.address.localeCompare(b.address));
  const unique = [...new Set(candidates.map((item) => item.address))];
  const port = url.port || "3000";
  const lanUrls = process.env.NODE_ENV === "development"
    ? unique.map((address) => `http://${address}:${port}`)
    : [];

  return NextResponse.json({
    currentOrigin: null,
    configuredAppUrl: usableConfigured || null,
    lanUrls,
  }, { headers: { "cache-control": "no-store" } });
}
