"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { DeskSearch, type SuggestionGroup } from "@/components/desk-search"

/** Triggers live in several places (top bar, mobile bar); the palette is mounted once. */
const PALETTE_EVENT = "admin:command-palette"

export function CommandPaletteTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <button
      type="button"
      aria-label="搜尋任何東西"
      onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
      className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Search className="size-4" aria-hidden="true" />
    </button>
  }
  return <button
    type="button"
    onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
    className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <Search className="size-4 shrink-0" aria-hidden="true" />
    <span>搜尋任何東西</span>
    <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘K</kbd>
  </button>
}

/**
 * The same list the desk home shows, wrapped in an overlay. Sharing
 * `DeskSearch` is the point — behaviour cannot drift between the two.
 */
export function AdminCommandPalette() {
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<SuggestionGroup[]>([])
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    restoreFocusRef.current?.focus()
  }, [])

  useEffect(() => {
    function toggle() {
      setOpen((previous) => {
        if (!previous) restoreFocusRef.current = document.activeElement as HTMLElement
        return !previous
      })
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        toggle()
      }
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener(PALETTE_EVENT, toggle)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener(PALETTE_EVENT, toggle)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/crm/suggestions")
      .then((response) => (response.ok ? response.json() : { groups: [] }))
      .then((data) => { if (!cancelled) setGroups(data.groups ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      <button type="button" aria-label="關閉搜尋" className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-sm" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="快速跳轉"
        className="relative flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card p-3 shadow-2xl"
      >
        <div className="min-h-0 overflow-y-auto">
          <DeskSearch suggestions={groups} autoFocus onNavigate={close} />
        </div>
      </div>
    </div>
  )
}
