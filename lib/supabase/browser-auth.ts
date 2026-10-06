import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./database";
import { friendlySupabaseError } from "@/lib/utils";

export async function ensureGuestSession(supabase: SupabaseClient<Database>): Promise<User> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(friendlySupabaseError(error.message));
  if (!data.user) throw new Error("Smaran could not create a guest session.");
  return data.user;
}
