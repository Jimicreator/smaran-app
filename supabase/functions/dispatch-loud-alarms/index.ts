import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

type DueNotification = {
  event_id: string;
  user_id: string;
  title: string;
  group_id: string;
  group_name: string;
  start_time: string;
  notification_kind: string;
};

type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cronSecret = Deno.env.get("SMARAN_CRON_SECRET");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  if (!supabaseUrl || !serviceRoleKey || !cronSecret || !vapidPublicKey || !vapidPrivateKey) return json({ error: "Push dispatcher is not configured" }, 503);
  if (req.headers.get("x-smaran-cron-secret") !== cronSecret) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey) as SupabaseClient;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 75_000).toISOString();
  const windowEnd = new Date(now.getTime() + 15_000).toISOString();

  const { data: due, error: dueError } = await supabase.rpc("smaran_claim_due_notifications", {
    window_start: windowStart,
    window_end: windowEnd,
  }) as { data: DueNotification[] | null; error: { message: string } | null };

  if (dueError) return json({ error: dueError.message }, 500);
  if (!due?.length) return json({ sent: 0, claimed: 0 });

  const userIds = [...new Set(due.map((row) => row.user_id))];
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds) as { data: PushSubscriptionRow[] | null; error: { message: string } | null };

  if (subscriptionError) return json({ error: subscriptionError.message }, 500);

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const item of due) {
    const targets = (subscriptions ?? []).filter((sub) => sub.user_id === item.user_id);
    const warning = item.notification_kind.startsWith("WARNING_");
    const label = warning ? item.notification_kind.replace("WARNING_", "") + " min warning" : "LOUD · due now";
    const body = warning ? `Shared Smaran reminder in ${item.group_name}: ${item.title}` : `A shared Smaran alarm is due in ${item.group_name}.`;

    for (const target of targets) {
      try {
        await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify({
          title: `${label} · ${item.title}`,
          body,
          tag: `smaran-${item.event_id}-${item.notification_kind}`,
          url: `/dashboard?group=${item.group_id}`,
        }));
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleEndpoints.push(target.endpoint);
      }
    }
  }

  if (staleEndpoints.length) await supabase.from("push_subscriptions").delete().in("endpoint", [...new Set(staleEndpoints)]);
  return json({ sent, claimed: due.length, removedStale: staleEndpoints.length });
});
