"use client"

import Link from "next/link"
import { AgentFace, type Pose } from "@/components/agent-face"
import { DeskSearch, type SuggestionGroup } from "@/components/desk-search"
import { cn } from "@/lib/utils"

export type DeskGreeting = { pose: Pose; message: string; tone: "idle" | "attention" | "clear" }

const ring: Record<DeskGreeting["tone"], string> = {
  idle: "border-border",
  attention: "border-primary",
  clear: "border-signal/60",
}

/**
 * The resting state: agent, one line, a cursor. No stats, no nav — the only
 * thing you can do here is tell the desk where you want to go.
 */
export function DeskHome({
  greeting,
  suggestions,
}: {
  greeting: DeskGreeting
  suggestions: SuggestionGroup[]
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-5 pb-20 pt-[12vh]">
      <span
        className={cn(
          // desk-agent-anchor pairs this with the top-bar avatar so the browser
          // morphs one portrait between the two screens.
          "desk-agent-anchor grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-gradient-to-b from-white to-secondary",
          ring[greeting.tone],
        )}
      >
        <span className="agent-sway grid place-items-center">
          <AgentFace pose={greeting.pose} size={96} className="agent-face-in" />
        </span>
      </span>

      <p className="mt-6 text-balance text-center font-display text-2xl font-bold leading-snug tracking-tight sm:text-[1.7rem]">
        {greeting.message}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">要先看哪一筆？或直接找任何東西。</p>

      <div className="mt-8 w-full">
        <DeskSearch suggestions={suggestions} autoFocus large />
      </div>

      <Link
        href="/admin/today"
        className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
      >
        或看完整儀表板 →
      </Link>
    </div>
  )
}
