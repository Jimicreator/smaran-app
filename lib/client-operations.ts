import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import type { EventItem, Group, GroupMember } from "@/lib/types";
import { ensureGuestSession } from "@/lib/supabase/browser-auth";
import { friendlySupabaseError, isValidHttpUrl } from "@/lib/utils";

export type ClientResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Client = SupabaseClient<Database>;

export async function createGroupClient(client: Client, name: string, displayName: string): Promise<ClientResult<Group>> {
  const cleanName = name.trim();
  const cleanDisplay = displayName.trim();
  if (cleanName.length < 2) return { ok: false, error: "Group name must be at least 2 characters." };
  if (!cleanDisplay) return { ok: false, error: "Your display name is required for the group membership." };
  try {
    await ensureGuestSession(client);
    const { data, error } = await client.rpc("smaran_create_group", { group_name: cleanName, owner_display_name: cleanDisplay });
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    if (!data) return { ok: false, error: "Supabase created the group but returned no group record." };
    return { ok: true, data: data as Group };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create group." };
  }
}

export async function joinGroupClient(client: Client, code: string, displayName: string): Promise<ClientResult<GroupMember>> {
  const cleanCode = code.trim().toUpperCase();
  const cleanDisplay = displayName.trim();
  if (!/^[A-Z0-9]{6}$/.test(cleanCode)) return { ok: false, error: "Group code must be exactly 6 characters." };
  if (!cleanDisplay) return { ok: false, error: "Display name is required." };
  try {
    await ensureGuestSession(client);
    const { data, error } = await client.rpc("smaran_join_group", { join_code: cleanCode, member_display_name: cleanDisplay });
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    if (!data) return { ok: false, error: "The group was joined but no membership record was returned." };
    return { ok: true, data: data as GroupMember };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to join group." };
  }
}

export async function createEventClient(client: Client, input: {
  groupId: string; title: string; description?: string; location?: string; resourceUrl?: string; startTime: string;
  urgencyTier: "INFO" | "WARNING" | "LOUD"; warningMinutes: number[];
}): Promise<ClientResult<EventItem>> {
  if (!input.title.trim()) return { ok: false, error: "Alarm title is required." };
  if (new Date(input.startTime).getTime() < Date.now() - 5_000) return { ok: false, error: "Choose a start time in the future." };
  if (!isValidHttpUrl(input.resourceUrl)) return { ok: false, error: "Link must be a valid http(s) URL." };
  try {
    const user = await ensureGuestSession(client);
    const { data, error } = await client.from("events").insert({
      group_id: input.groupId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      resource_url: input.resourceUrl?.trim() || null,
      start_time: input.startTime,
      urgency_tier: input.urgencyTier,
      warning_minutes: input.warningMinutes,
      created_by: user.id,
      status: "active",
    }).select().single();
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    return { ok: true, data: data as EventItem };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create alarm." };
  }
}

export async function deleteEventClient(client: Client, eventId: string): Promise<ClientResult<void>> {
  try {
    await ensureGuestSession(client);
    const { error } = await client.from("events").delete().eq("id", eventId);
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to delete alarm." };
  }
}

export async function savePushSubscriptionClient(client: Client, input: { endpoint: string; p256dh: string; auth: string; expirationTime?: number | null }): Promise<ClientResult<void>> {
  try {
    const user = await ensureGuestSession(client);
    const { error } = await client.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      expiration_time: input.expirationTime ?? null,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save push subscription." };
  }
}

export async function removePushSubscriptionClient(client: Client, endpoint: string): Promise<ClientResult<void>> {
  try {
    const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return { ok: false, error: friendlySupabaseError(error.message) };
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to remove push subscription." };
  }
}
