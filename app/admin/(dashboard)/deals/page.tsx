import Link from "next/link"
import { AdminPageHeader } from "@/components/admin-page-header"
import { DealForm } from "@/components/crm/deal-form"
import { DealStage } from "@/components/crm/api-action"
import { getAllDeals } from "@/lib/crm-data"
import { dealStages, money } from "@/lib/crm-labels"
export const dynamic = "force-dynamic"

export default async function DealsPage() {
  // One query. The form loads its own client options only when opened.
  const deals = await getAllDeals()
  const open = deals.filter((deal) => !["won", "lost"].includes(deal.stage))
  const total = open.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0)

  return <div className="space-y-8">
    <AdminPageHeader
      eyebrow="Pipeline"
      title="商機"
      description="從需求釐清到成交，查看每個機會的金額、機率與下一步。"
      action={<DealForm />}
    />

    <section className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border border-border bg-card px-5 py-4">
      <div><p className="text-xs text-muted-foreground">進行中商機</p><p className="mt-1 font-mono text-2xl font-medium">{open.length}</p></div>
      <div><p className="text-xs text-muted-foreground">加權前總額</p><p className="mt-1 font-mono text-2xl font-medium text-primary">{money.format(total)}</p></div>
      <p className="text-xs text-muted-foreground">未定價的商機以 0 計入，核准報價分析後會自動帶入金額。</p>
    </section>

    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {dealStages.map(([key, label]) => {
        const items = deals.filter((deal) => deal.stage === key)
        const sum = items.reduce((acc, deal) => acc + Number(deal.value ?? 0), 0)
        return <section key={key} className="min-w-0 border-t-2 border-border bg-card/50 p-3 md:min-h-48">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">{label}</h2>
            <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
          </div>
          {sum > 0 && <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{money.format(sum)}</p>}
          <div className="mt-4 min-w-0 space-y-3">
            {items.length === 0
              ? <p className="text-xs text-muted-foreground/50">—</p>
              : items.map((deal) => <article key={deal.id} className="min-w-0 border border-border bg-background p-3 transition-colors hover:border-primary/50">
                  <Link href={`/admin/deals/${deal.id}`} className="admin-break block text-sm font-medium hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{deal.title}</Link>
                  <Link href={`/admin/clients/${deal.clientId}`} className="admin-break mt-1 block text-xs text-muted-foreground hover:text-primary">{deal.clientName}</Link>
                  <p className="mt-3 font-mono text-xs text-primary">{deal.value == null ? <span className="text-muted-foreground">金額待報價</span> : `${deal.currency} ${Number(deal.value).toLocaleString("zh-TW")}`}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{deal.probability}% probability</p>
                  <DealStage id={deal.id} stage={deal.stage} />
                </article>)}
          </div>
        </section>
      })}
    </div>
  </div>
}
