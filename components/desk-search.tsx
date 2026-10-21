"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDeskNavigate } from "@/components/desk-transitions"
import {
  Bot, BriefcaseBusiness, ChartNoAxesCombined, CornerDownLeft,
  Inbox, LayoutDashboard, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchItem = { id: string; kind: string; title: string; subtitle: string; href: string }
export type SuggestionGroup = { label: string; items: SearchItem[] }

export const PAGES: SearchItem[] = [
  { id: "page-today", kind: "頁面", title: "今日工作", subtitle: "待決策與管線快照", href: "/admin/today" },
  { id: "page-inquiries", kind: "頁面", title: "網站詢問", subtitle: "原始訊息與 CRM 去向", href: "/admin/inquiries" },
  { id: "page-clients", kind: "頁面", title: "客戶", subtitle: "客戶主檔與互動脈絡", href: "/admin/clients" },
  { id: "page-deals", kind: "頁面", title: "商機管線", subtitle: "階段、金額與機率", href: "/admin/deals" },
  { id: "page-review", kind: "頁面", title: "待審分析", subtitle: "需要你核准或退回", href: "/admin/analyses?status=needs_review" },
  { id: "page-analyses", kind: "頁面", title: "分析中心", subtitle: "需求、市場與報價分析", href: "/admin/analyses" },
  { id: "page-runs", kind: "頁面", title: "Agent 審核", subtitle: "執行紀錄與變更建議", href: "/admin/agent-runs" },
  { id: "page-new-client", kind: "頁面", title: "新增客戶", subtitle: "建立 CRM 客戶主檔", href: "/admin/clients/new" },
]

const kindIcons: Record<string, typeof Users> = {
  客戶: Users,
  商機: BriefcaseBusiness,
  分析: ChartNoAxesCombined,
  待審分析: ChartNoAxesCombined,
  頁面: LayoutDashboard,
  待決變更: Bot,
  執行失敗: Bot,
}

function score(item: SearchItem, query: string): number {
  const haystack = `${item.title} ${item.subtitle} ${item.kind}`.toLowerCase()
  const at = haystack.indexOf(query)
  if (at === -1) return -1
  return (item.title.toLowerCase().includes(query) ? 1000 : 0) - at
}

/**
 * The list is the same in both places it appears: the desk home and the ⌘K
 * overlay. Only the chrome around it differs, so behaviour can never drift
 * between the two.
 */
export function DeskSearch({
  suggestions,
  autoFocus = false,
  onNavigate,
  large = false,
}: {
  suggestions: SuggestionGroup[]
  autoFocus?: boolean
  onNavigate?: () => void
  large?: boolean
}) {
  const navigate = useDeskNavigate()
  const [query, setQuery] = useState("")
  const [remote, setRemote] = useState<SearchItem[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // The full index is only needed once the user actually starts typing.
  const load = useCallback(() => {
    fetch("/api/crm/search")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => setRemote(data.items ?? []))
      .catch(() => {})
  }, [])

  const typing = query.trim().length > 0

  useEffect(() => {
    if (typing && remote.length === 0) load()
  }, [typing, remote.length, load])

  const groups: SuggestionGroup[] = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return [...suggestions, { label: "快速前往", items: PAGES.slice(0, 6) }]
    }
    const hits = [...PAGES, ...remote]
      .map((item) => ({ item, rank: score(item, normalized) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 20)
      .map((entry) => entry.item)
    return [{ label: `${hits.length} 個結果`, items: hits }]
  }, [query, remote, suggestions])

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" })
  }, [active])

  function go(item: SearchItem) {
    onNavigate?.()
    navigate(item.href)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)) }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (event.key === "Enter" && flat[active]) { event.preventDefault(); go(flat[active]) }
  }

  let index = -1

  return (
    <div className="flex w-full flex-col">
      <div
        className={cn(
          "flex items-center gap-3 border border-input bg-background px-4 transition-colors focus-within:border-primary",
          large ? "h-14 rounded-xl" : "h-10 rounded-lg",
        )}
      >
        <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0) }}
          onKeyDown={onKeyDown}
          placeholder="搜尋客戶、商機、分析或頁面…"
          aria-label="搜尋任何東西"
          aria-controls="desk-results"
          autoComplete="off"
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground", large ? "text-base" : "text-sm")}
        />
        <kbd className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
          {typing ? "ESC 清空" : "⌘K"}
        </kbd>
      </div>

      <div ref={listRef} id="desk-results" role="listbox" aria-label="搜尋結果" className="mt-3 flex flex-col gap-1">
        {flat.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">找不到符合的項目。</p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => {
              index += 1
              const i = index
              const Icon = kindIcons[item.kind] ?? Inbox
              const on = i === active
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-active={on}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="admin-break block text-sm font-medium">{item.title}</span>
                    {item.subtitle && <span className="admin-break block text-xs text-muted-foreground">{item.subtitle}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.kind}</span>
                  {on && <CornerDownLeft className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
