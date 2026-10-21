import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type Crumb = { label: string; href?: string }

/**
 * The trail every detail page opens with. The last crumb is the current page
 * and is never a link — everything before it is a way back out.
 */
export function AdminBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="麵包屑" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
              {item.href && !last
                ? <Link href={item.href} className="admin-break rounded-sm px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{item.label}</Link>
                : <span className="admin-break px-1 py-0.5 text-foreground" aria-current={last ? "page" : undefined}>{item.label}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
