import Link from "next/link"
import { ChevronDown } from "lucide-react"

/**
 * URL-driven "load more": the next click is just a bigger `limit` in the query
 * string, so the list stays server-rendered, shareable and back-button safe.
 */
export function LoadMore({
  shown,
  total,
  nextHref,
  unit = "筆",
}: {
  shown: number
  total: number
  nextHref: string
  unit?: string
}) {
  if (total === 0) return null
  const hasMore = shown < total

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <p className="font-mono text-xs text-muted-foreground">顯示 {shown} / {total} {unit}</p>
      {hasMore && (
        <Link
          href={nextHref}
          scroll={false}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          載入更多
          <ChevronDown className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

/** Builds the href for the next page-size step, preserving other filters. */
export function nextLimitHref(basePath: string, params: Record<string, string | undefined>, nextLimit: number) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") search.set(key, value)
  }
  search.set("limit", String(nextLimit))
  return `${basePath}?${search.toString()}`
}
