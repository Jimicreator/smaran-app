"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", loading = false, children, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "ghost" | "danger" | "outline"; loading?: boolean }) {
  const variants = {
    default: "bg-white text-black hover:bg-white/90 shadow-sm",
    secondary: "border border-white/10 bg-white/[.07] text-white hover:bg-white/[.11]",
    ghost: "bg-transparent text-white/65 hover:bg-white/[.06] hover:text-white",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
    outline: "border border-white/10 bg-transparent text-white/75 hover:bg-white/[.06]",
  } as const;
  return <button {...props} type={type} disabled={props.disabled || loading} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45", variants[variant], className)}>{loading && <Loader2 size={15} className="animate-spin" />}{children}</button>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-11 w-full rounded-xl border border-white/10 bg-[#090c11] px-3.5 text-sm text-white outline-none placeholder:text-white/24 focus:border-white/22 focus:ring-2 focus:ring-white/[.05]", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full resize-y rounded-xl border border-white/10 bg-[#090c11] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/24 focus:border-white/22 focus:ring-2 focus:ring-white/[.05]", props.className)} />;
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return <div className="mb-1.5 flex items-center justify-between gap-2"><label className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/38">{children}</label>{hint && <span className="text-[10px] text-white/20">{hint}</span>}</div>;
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-white/9 bg-white/[.04] px-2.5 py-1 text-[10px] font-semibold tracking-[.1em] text-white/52", className)}>{children}</span>;
}
