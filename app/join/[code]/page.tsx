import { JoinClient } from "@/components/join-client";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClient code={code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)} />;
}
