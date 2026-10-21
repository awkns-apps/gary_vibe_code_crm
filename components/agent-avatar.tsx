"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AgentFace, type Pose } from "@/components/agent-face"
import { resolveMood, type AgentStatus, type Mood, type Tone } from "@/lib/agent-mood"
import { cn } from "@/lib/utils"

/**
 * Every few seconds the portrait moves to another expression from the *same*
 * mood, so it reads as the same person reacting — never as a random shuffle.
 */
const RELATED: Record<Pose, Pose[]> = {
  alert: ["alert", "caution", "focus"],
  caution: ["caution", "focus", "alert"],
  oops: ["oops", "awkward", "sheepish"],
  awkward: ["awkward", "sheepish", "oops"],
  thinking: ["thinking", "working", "awkward"],
  working: ["working", "thinking", "focus"],
  focus: ["focus", "thinking", "caution"],
  idea: ["idea", "focus", "thinking"],
  hello: ["hello", "greet", "cheer"],
  greet: ["greet", "hello", "calm"],
  cheer: ["cheer", "greet", "hello"],
  proud: ["proud", "cheer", "greet"],
  calm: ["calm", "neutral", "sheepish"],
  neutral: ["neutral", "calm", "working"],
  sheepish: ["sheepish", "awkward", "calm"],
}

const POSE_INTERVAL_MS = 4200

/** Weight, not hue — the palette is white and blue, with red kept for failure. */
const toneRing: Record<Tone, string> = {
  idle: "border-border",
  info: "border-primary/45",
  warn: "border-primary",
  danger: "border-destructive/70",
  good: "border-signal/50",
}

const toneDot: Record<Tone, string> = {
  idle: "bg-wash",
  info: "bg-primary/50",
  warn: "bg-primary",
  danger: "bg-destructive",
  good: "bg-signal",
}

export function AgentAvatar({ size = 76 }: { size?: number }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [beat, setBeat] = useState(0)

  const load = useCallback(() => {
    let cancelled = false
    fetch("/api/crm/agent-status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (!cancelled && data) setStatus(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Refetch on every route change so the face reflects what you just did.
  useEffect(() => load(), [load, pathname])

  // Advance the expression on a slow beat.
  useEffect(() => {
    const timer = setInterval(() => setBeat((n) => n + 1), POSE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // Derived, not stored. The clock is only read once status has arrived — which
  // can only happen client-side — so the server and first client render agree.
  const mood: Mood = status
    ? resolveMood(status, pathname, new Date().getHours())
    : { pose: "working", tone: "idle", message: "正在看今天的狀況…" }

  const cycle = RELATED[mood.pose]
  const pose = cycle[beat % cycle.length]

  return (
    <div className="flex min-w-0 items-center gap-3.5">
      {/* Back to the resting desk — the portrait is the way home. */}
      <Link
        href="/admin"
        title="回到搜尋入口"
        aria-label={`回到搜尋入口。Agent 狀態：${mood.message}`}
        className={cn(
          // The ink was drawn on paper, so the portrait keeps a paper ground —
          // a touch cooler than the page so the circle still reads as an object.
          "desk-agent-anchor relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 transition-colors",
          "bg-gradient-to-b from-white to-secondary",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          toneRing[mood.tone],
        )}
        style={{ width: size, height: size }}
      >
        <span className="agent-sway grid place-items-center">
          <AgentFace key={pose} pose={pose} size={size} className="agent-face-in" />
        </span>
      </Link>
      <div className="hidden min-w-0 md:block">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", toneDot[mood.tone])} aria-hidden="true" />
          Desk agent
        </p>
        <p className="admin-break mt-0.5 text-sm text-foreground">{mood.message}</p>
      </div>
    </div>
  )
}
