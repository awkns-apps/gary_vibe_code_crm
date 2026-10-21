import { notFound } from "next/navigation"
import Link from "next/link"
import { Bot, BriefcaseBusiness, ChartNoAxesCombined, CircleUser, Target } from "lucide-react"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import { AdminStatus } from "@/components/admin-status"
import { DealStage } from "@/components/crm/api-action"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDeal } from "@/lib/crm-data"
import {
  analysisStatusLabels, analysisTypeLabels, clientStatusLabels,
  formatDate, formatDealValue, runStatusLabels, stageLabels,
} from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getDeal(Number((await params).id))
  if (!data) notFound()
  const { deal, client, analyses, activities, runs } = data
  const value = formatDealValue(deal.value, deal.currency)

  return <div className="min-w-0 space-y-7">
    <AdminBreadcrumb items={[
      { label: "商機管線", href: "/admin/deals" },
      { label: deal.title },
    ]} />

    <header className="min-w-0 border-b border-border pb-7">
      <div className="flex flex-wrap items-center gap-3">
        <AdminStatus value={deal.stage} label={stageLabels[deal.stage] || deal.stage} />
        <span className="font-mono text-[11px] text-muted-foreground">{deal.probability}% probability</span>
        {deal.expectedCloseAt && <span className="font-mono text-[11px] text-muted-foreground">預計成交 {formatDate(deal.expectedCloseAt)}</span>}
      </div>
      <h1 className="admin-break mt-3 font-display text-3xl font-bold">{deal.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href={`/admin/clients/${client.id}`} className="admin-break inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <CircleUser className="size-4 shrink-0" />{client.name}
        </Link>
        <p className="font-mono text-lg text-primary">{value ?? <span className="text-base text-muted-foreground">金額待報價</span>}</p>
      </div>
      <div className="mt-5 max-w-xs">
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" htmlFor={`stage-${deal.id}`}>變更階段</label>
        <DealStage id={deal.id} stage={deal.stage} selectId={`stage-${deal.id}`} />
      </div>
    </header>

    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <Card className="min-w-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-4 text-primary" />範圍與報價</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Scope</p><p className="admin-break mt-1.5 leading-relaxed">{deal.scope || "尚未定義範圍。核准需求分析時會帶入摘要。"}</p></div>
            <div className="border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">報價備註</p><p className="admin-break mt-1.5 leading-relaxed text-muted-foreground">{deal.pricingNotes || "尚未報價。核准報價分析時會帶入。"}</p></div>
            {deal.lostReason && <div className="border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-destructive">未成交原因</p><p className="admin-break mt-1.5 leading-relaxed">{deal.lostReason}</p></div>}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="size-4 text-primary" />這個商機的分析</CardTitle>
            <CardDescription>需求、市場與報價分析的版本與審核狀態。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.length === 0
              ? <p className="text-sm text-muted-foreground">尚無分析。</p>
              : analyses.map((analysis) => <Link key={analysis.id} href={`/admin/analyses/${analysis.id}`} className="admin-row group flex min-w-0 flex-wrap items-center justify-between gap-3 border border-border p-4 hover:border-primary/60">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{analysisTypeLabels[analysis.type] || analysis.type}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">v{analysis.version}</span>
                    </div>
                    <p className="admin-break mt-1.5 font-medium">{analysis.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {analysis.confidence != null && <span className="font-mono text-[10px] text-muted-foreground">{analysis.confidence}%</span>}
                    <AdminStatus value={analysis.status} label={analysisStatusLabels[analysis.status]} />
                  </div>
                </Link>)}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>活動時間軸</CardTitle><CardDescription>只顯示掛在這個商機上的紀錄。</CardDescription></CardHeader>
          <CardContent>
            {activities.length === 0
              ? <p className="text-sm text-muted-foreground">還沒有活動紀錄。</p>
              : <div className="relative space-y-0 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
                  {activities.map((item) => <div key={item.id} className="relative min-w-0 pb-6 pl-8 last:pb-0">
                    <span className="absolute left-0 top-1.5 size-[11px] border-2 border-background bg-primary" />
                    <div className="flex min-w-0 items-start gap-2"><p className="admin-break min-w-0 font-medium">{item.subject}</p>{item.source !== "human" && <Bot className="mt-1 size-3.5 shrink-0 text-primary" />}</div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.type} · {formatDate(item.occurredAt)}</p>
                    {item.content && <p className="admin-break mt-2 text-sm text-muted-foreground">{item.content}</p>}
                  </div>)}
                </div>}
          </CardContent>
        </Card>
      </div>

      <aside className="min-w-0 space-y-6">
        <Card className="min-w-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><CircleUser className="size-4" />客戶</CardTitle></CardHeader>
          <CardContent>
            <Link href={`/admin/clients/${client.id}`} className="admin-break block font-medium text-primary hover:underline">{client.name}</Link>
            <p className="mt-2"><AdminStatus value={client.status} label={clientStatusLabels[client.status]} /></p>
            <p className="admin-break mt-3 text-xs text-muted-foreground">{[client.industry, client.source].filter(Boolean).join(" · ") || "尚未補充公司資訊"}</p>
            {client.nextAction && <p className="admin-break mt-3 border-t border-border pt-3 text-xs"><span className="text-muted-foreground">下一步：</span>{client.nextAction}</p>}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-4" />數字</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">金額</span><span className="admin-break font-mono">{value ?? "待報價"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">機率</span><span className="font-mono">{deal.probability}%</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">預計成交</span><span className="font-mono">{formatDate(deal.expectedCloseAt)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">建立於</span><span className="font-mono">{formatDate(deal.createdAt)}</span></div>
          </CardContent>
        </Card>

        {runs.length > 0 && <Card className="min-w-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-4" />Agent 執行</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {runs.map((run) => <div key={run.id} className="min-w-0 border-t border-border pt-3 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="admin-break font-mono text-xs">{run.agentName}</p><AdminStatus value={run.status} label={runStatusLabels[run.status]} /></div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{run.taskType}</p>
              {run.error && <p role="alert" className="admin-break mt-2 border-l-2 border-destructive pl-2 text-xs text-destructive">{run.error}</p>}
            </div>)}
          </CardContent>
        </Card>}
      </aside>
    </section>
  </div>
}
