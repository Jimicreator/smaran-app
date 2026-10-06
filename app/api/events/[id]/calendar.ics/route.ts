import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEventICS } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error || !event) return new NextResponse("Event not found", { status: 404 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: membership } = await supabase.from("group_members").select("id").eq("group_id", event.group_id).eq("user_id", userData.user.id).maybeSingle();
  if (!membership) return new NextResponse("Forbidden", { status: 403 });
  const { data: group } = await supabase.from("groups").select("name").eq("id", event.group_id).single();
  return new NextResponse(createEventICS(event, group?.name ?? "Smaran"), { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="smaran-${event.id}.ics"`, "Cache-Control": "no-store" } });
}
