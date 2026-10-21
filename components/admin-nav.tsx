"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Inbox,
  LayoutDashboard,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/admin/today", label: "今日工作", icon: LayoutDashboard },
  { href: "/admin/inquiries", label: "網站詢問", icon: Inbox },
  { href: "/admin/clients", label: "客戶", icon: Users },
  { href: "/admin/deals", label: "商機管線", icon: BriefcaseBusiness },
  { href: "/admin/analyses", label: "分析與報價", icon: ChartNoAxesCombined },
  { href: "/admin/agent-runs", label: "Agent 審核", icon: Bot },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin navigation"
      className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 bottom-0 h-px transition-colors",
                active ? "bg-primary" : "bg-transparent group-hover:bg-border",
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}
