"use client";

import { useEffect } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="min-h-screen px-4 py-8"><div className="mx-auto flex min-h-[75vh] max-w-xl items-center justify-center"><div className="w-full rounded-[26px] border border-white/8 bg-[#0b0e14] p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300"><TriangleAlert size={20}/></div><h1 className="mt-5 text-xl font-semibold">Smaran hit an unexpected error.</h1><p className="mt-2 text-sm leading-6 text-white/35">Retry the page first. Shared records are stored in Supabase and are not removed by a browser error.</p><Button onClick={reset} className="mt-6"><RefreshCcw size={15}/> Try again</Button></div></div></main>;
}
