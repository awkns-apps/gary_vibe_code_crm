import { cn } from "@/lib/utils"

/**
 * White and blue only, so state is carried by weight rather than hue:
 * filled = settled, outlined = waiting on a person, faint = in play.
 * Red is the one exception, reserved for genuine failure — an error nobody
 * can pick out at a glance will eventually cost something.
 */
const tone: Record<string, string> = {
  // settled — solid fill
  approved: "border-signal bg-signal text-white",
  completed: "border-signal bg-signal text-white",
  applied: "border-signal bg-signal text-white",
  won: "border-signal bg-signal text-white",
  active: "border-primary bg-primary text-primary-foreground",

  // waiting on a person — outlined
  needs_review: "border-primary/50 bg-primary/10 text-primary",
  pending: "border-primary/50 bg-primary/10 text-primary",
  queued: "border-primary/50 bg-primary/10 text-primary",
  running: "border-primary/50 bg-primary/10 text-primary",
  proposal: "border-primary/50 bg-primary/10 text-primary",
  negotiation: "border-primary/50 bg-primary/10 text-primary",

  // in play, lower commitment — faint
  qualified: "border-primary/25 bg-primary/5 text-primary",
  analysis: "border-primary/25 bg-primary/5 text-primary",
  lead: "border-border bg-secondary text-muted-foreground",
  discovery: "border-border bg-secondary text-muted-foreground",

  // failure — the only non-blue
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  conflict: "border-destructive/40 bg-destructive/10 text-destructive",
  lost: "border-destructive/40 bg-destructive/10 text-destructive",
}

export function AdminStatus({ value, label }: { value: string; label?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]", tone[value] || "border-border bg-secondary text-muted-foreground")}>{label || value.replaceAll("_", " ")}</span>
}
