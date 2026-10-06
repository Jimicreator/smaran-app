import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { ensureGuestSession } from "@/lib/supabase/browser-auth";
import { savePushSubscriptionClient, removePushSubscriptionClient } from "@/lib/client-operations";

type Client = SupabaseClient<Database>;

type DeviceAlertResult =
  | { ok: true; push: boolean }
  | { ok: false; error: string };

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw).map((char) => char.charCodeAt(0)));
}

export function pushIsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export async function requestBrowserNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) return { ok: false, error: "This browser does not support notifications." };
  if (!window.isSecureContext && window.location.hostname !== "localhost") return { ok: false, error: "Device notifications require HTTPS on phones. Use the deployed Smaran HTTPS link for phone alarms." };
  const permission = await Notification.requestPermission();
  return permission === "granted" ? { ok: true } : { ok: false, error: "Notification permission was not granted." };
}

export async function enableDeviceAlerts(client: Client): Promise<DeviceAlertResult> {
  const notificationResult = await requestBrowserNotifications();
  if (!notificationResult.ok) return { ok: false, error: notificationResult.error ?? "Could not enable notifications." };

  if (!pushIsConfigured()) return { ok: true, push: false };
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "This browser does not support background push. Browser notifications remain available." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: true, push: false };

  try {
    const user = await ensureGuestSession(client);
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await registration.update().catch(() => undefined);
    const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, error: "The browser returned an incomplete push subscription." };
    const saved = await savePushSubscriptionClient(client, {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      expirationTime: json.expirationTime ?? null,
    });
    if (!saved.ok) return saved;
    void user;
    return { ok: true, push: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not enable device alerts." };
  }
}

export async function enableBackgroundPush(client: Client) {
  const result = await enableDeviceAlerts(client);
  return result.ok && result.push ? result : result.ok ? { ok: false as const, error: "Background push is not configured for this deployment yet." } : result;
}

export async function disableBackgroundPush(client: Client) {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return { ok: true as const };
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return removePushSubscriptionClient(client, endpoint);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not disable device alerts." };
  }
}
