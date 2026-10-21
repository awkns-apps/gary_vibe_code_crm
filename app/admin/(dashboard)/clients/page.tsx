import Link from "next/link"
import { ArrowRight, Plus, Search } from "lucide-react"
import { AdminPageHeader } from "@/components/admin-page-header"
import { AdminStatus } from "@/components/admin-status"
import { LoadMore, nextLimitHref } from "@/components/admin-load-more"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCrmClients, PAGE_SIZE } from "@/lib/crm-data"
import { clientStatusLabels } from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; limit?: string }> }) {
  const { q = "", limit: limitParam } = await searchParams
  const query = q.trim()
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE))
  const { items: clients, total, hasMore } = await getCrmClients({ query, limit })

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Relationships" title="客戶" description="管理客戶主檔、聯絡人、下一步與完整互動脈絡。" action={<Button render={<Link href="/admin/clients/new" />}><Plus />新增客戶</Button>} />

      <form className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={query} className="pl-9" placeholder="搜尋客戶、產業或標籤" aria-label="搜尋客戶" />
      </form>

      {clients.length === 0 ? (
        query ? (
          <div className="border border-dashed border-border px-6 py-16 text-center">
            <h2 className="font-display text-xl font-bold">找不到符合「{query}」的客戶</h2>
            <Link href="/admin/clients" className="mt-4 inline-block text-sm text-primary hover:underline">清除搜尋</Link>
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-16 text-center">
            <h2 className="font-display text-xl font-bold">建立第一位 CRM 客戶</h2>
            <p className="mt-2 text-sm text-muted-foreground">網站詢問不會自動出現在這裡。</p>
            <Button className="mt-6" render={<Link href="/admin/clients/new" />}>新增客戶</Button>
          </div>
        )
      ) : (
        <>
          <div className="admin-panel overflow-hidden">
            <div className="hidden grid-cols-[1.3fr_0.8fr_0.7fr_1.2fr_auto] gap-4 border-b border-border bg-secondary/30 px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>客戶</span><span>產業</span><span>狀態</span><span>下一步</span><span />
            </div>
            {clients.map((client) => (
              <Link key={client.id} href={`/admin/clients/${client.id}`} className="admin-row grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1.3fr_0.8fr_0.7fr_1.2fr_auto] md:items-center md:gap-4">
                <div className="min-w-0"><p className="admin-break font-medium">{client.name}</p><p className="admin-break mt-1 text-xs text-muted-foreground">{client.tags.join(" · ") || "尚無標籤"}</p></div>
                <span className="admin-break text-sm text-muted-foreground">{client.industry || "—"}</span>
                <span><AdminStatus value={client.status} label={clientStatusLabels[client.status]} /></span>
                <span className="admin-break text-sm text-muted-foreground">{client.nextAction || "尚未設定"}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>

          <LoadMore
            shown={clients.length}
            total={total}
            nextHref={nextLimitHref("/admin/clients", { q: query }, limit + PAGE_SIZE)}
            unit="位客戶"
          />
          {!hasMore && total > PAGE_SIZE && <p className="sr-only">已顯示全部客戶</p>}
        </>
      )}
    </div>
  )
}
