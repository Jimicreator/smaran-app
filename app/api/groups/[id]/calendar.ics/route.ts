import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGroupICS } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: membership } = await supabase.from("group_members").select("id").eq("group_id", id).eq("user_id", userData.user.id).maybeSingle();
  if (!membership) return new NextResponse("Forbidden", { status: 403 });
  const [{ data: group }, { data: events, error }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", id).single(),
    supabase.from("events").select("*").eq("group_id", id).order("start_time", { ascending: true }),
  ]);
  if (!group) return new NextResponse("Group not found", { status: 404 });
  if (error) return new NextResponse("Unable to build calendar", { status: 500 });
  return new NextResponse(createGroupICS(group, events ?? []), { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${group.code.toLowerCase()}-smaran.ics"`, "Cache-Control": "no-store" } });
}
