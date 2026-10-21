import { notFound } from "next/navigation"
import Link from "next/link"
import { Bot, BriefcaseBusiness, Mail, Phone, UserRound } from "lucide-react"
import { ActivityForm } from "@/components/crm/activity-form"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import { AdminStatus } from "@/components/admin-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadMore, nextLimitHref } from "@/components/admin-load-more"
import { getCrmClient, PAGE_SIZE } from "@/lib/crm-data"
import {
  analysisStatusLabels, analysisTypeLabels, clientStatusLabels,
  formatDate, formatDealValue, stageLabels,
} from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ limit?: string }>
}) {
  const [{ id }, { limit: limitParam }] = await Promise.all([params, searchParams])
  const activityLimit = Math.min(200, Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE))
  const data = await getCrmClient(Number(id), { activityLimit })
  if (!data) notFound()
  const { client, contacts, deals, activities, activityTotal, analyses } = data

  return (
    <div className="min-w-0 space-y-7">
      <AdminBreadcrumb items={[{ label: "客戶", href: "/admin/clients" }, { label: client.name }]} />

      <header className="flex min-w-0 flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <AdminStatus value={client.status} label={clientStatusLabels[client.status]} />
          <h1 className="admin-break mt-3 font-display text-3xl font-bold">{client.name}</h1>
          <p className="admin-break mt-2 text-sm text-muted-foreground">{[client.industry, client.source].filter(Boolean).join(" · ") || "尚未補充公司資訊"}</p>
          {client.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{client.tags.map((tag) => <span key={tag} className="border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{tag}</span>)}</div>}
        </div>
        <Button render={<Link href={`/admin/analyses?client=${client.id}`} />}>建立分析</Button>
      </header>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 border-l-2 border-l-primary">
            <CardHeader><CardTitle>下一步</CardTitle><CardDescription>{client.nextActionAt ? formatDate(client.nextActionAt) : "尚未設定日期"}</CardDescription></CardHeader>
            <CardContent><p className="admin-break text-lg">{client.nextAction || "設定一個具體的下一步，讓關係繼續往前。"}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>活動時間軸</CardTitle><CardDescription>人工操作與 agent 產出會清楚標示來源。</CardDescription></CardHeader>
            <CardContent>
              <ActivityForm clientId={client.id} />
              <div className="relative mt-7 space-y-0 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
                {activities.length === 0 ? <p className="pl-7 text-sm text-muted-foreground">還沒有活動紀錄。</p> : activities.map((item) => (
                  <div key={item.id} className="relative min-w-0 pb-6 pl-8 last:pb-0">
                    <span className="absolute left-0 top-1.5 size-[11px] border-2 border-background bg-primary" />
                    <div className="flex min-w-0 items-start gap-2"><p className="admin-break min-w-0 font-medium">{item.subject}</p>{item.source !== "human" && <Bot className="mt-1 size-3.5 shrink-0 text-primary" />}</div>
                    <p className="admin-break mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.type} · {formatDate(item.occurredAt)}</p>
                    {item.content && <p className="admin-break mt-2 text-sm text-muted-foreground">{item.content}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <LoadMore
                  shown={activities.length}
                  total={activityTotal}
                  nextHref={nextLimitHref(`/admin/clients/${client.id}`, {}, activityLimit + PAGE_SIZE)}
                  unit="筆活動"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>分析</CardTitle><CardDescription>保留版本、證據、信心度與審核狀態。</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {analyses.length === 0 ? <p className="text-sm text-muted-foreground">尚無分析。</p> : analyses.map((analysis) => (
                <Link href={`/admin/analyses/${analysis.id}`} key={analysis.id} className="admin-row min-w-0 border border-border p-4 hover:border-primary/60">
                  <p className="admin-break font-medium">{analysis.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{analysisTypeLabels[analysis.type]} · v{analysis.version}</span>
                    <AdminStatus value={analysis.status} label={analysisStatusLabels[analysis.status]} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-4" />聯絡人</CardTitle></CardHeader><CardContent className="space-y-5">
            {contacts.length === 0 ? <p className="text-sm text-muted-foreground">尚無聯絡人。</p> : contacts.map((contact) => <div key={contact.id} className="min-w-0 border-t border-border pt-4 first:border-0 first:pt-0">
              <p className="admin-break font-medium">{contact.name}</p>
              <p className="admin-break text-xs text-muted-foreground">{contact.title}</p>
              {contact.email && <a href={`mailto:${contact.email}`} className="mt-2 flex min-w-0 items-start gap-2 text-xs text-primary hover:underline"><Mail className="mt-0.5 size-3 shrink-0" /><span className="admin-break min-w-0">{contact.email}</span></a>}
              {contact.phone && <p className="admin-break mt-1 flex min-w-0 items-start gap-2 text-xs text-muted-foreground"><Phone className="mt-0.5 size-3 shrink-0" />{contact.phone}</p>}
            </div>)}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-4" />商機</CardTitle></CardHeader><CardContent className="space-y-3">
            {deals.length === 0 ? <p className="text-sm text-muted-foreground">尚無商機。核准需求分析後會自動建立。</p> : deals.map((deal) => <Link key={deal.id} href={`/admin/deals/${deal.id}`} className="admin-row block min-w-0 border-t border-border pt-3 first:border-0 first:pt-0 hover:text-primary">
              <p className="admin-break font-medium">{deal.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <AdminStatus value={deal.stage} label={stageLabels[deal.stage] || deal.stage} />
                <span className="admin-break font-mono text-xs text-primary">{formatDealValue(deal.value, deal.currency) ?? "待報價"}</span>
              </div>
            </Link>)}
          </CardContent></Card>
        </aside>
      </section>
    </div>
  )
}
