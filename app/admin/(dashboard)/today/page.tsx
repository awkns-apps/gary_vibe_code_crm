import Link from "next/link"
import { ArrowRight, Bot, BriefcaseBusiness, Inbox, Plus, Users } from "lucide-react"
import { AdminPageHeader } from "@/components/admin-page-header"
import { AdminStatus } from "@/components/admin-status"
import { Button } from "@/components/ui/button"
import { getCrmDashboard } from "@/lib/crm-data"
import { analysisTypeLabels, formatDate, money, stageLabels } from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  // Counts, queues and the pipeline all arrive in a single round trip.
  const { clientCount, inquiryCount, openDeals, reviewQueue, reviewTotal, queuedRunCount, tasks } = await getCrmDashboard()
  const pipeline = openDeals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0)

  const shown = [
    ...tasks.map((item) => ({ key: `task-${item.id}`, kind: "下一步", title: item.subject, meta: item.dueAt ? formatDate(item.dueAt) : "未設定期限", href: `/admin/clients/${item.clientId}`, tone: "pending" })),
    ...reviewQueue.map((item) => ({ key: `analysis-${item.id}`, kind: "待審分析", title: item.title, meta: `${analysisTypeLabels[item.type] || item.type} · v${item.version}${item.confidence == null ? "" : ` · 信心度 ${item.confidence}%`}`, href: `/admin/analyses/${item.id}`, tone: "needs_review" })),
  ].slice(0, 8)
  const decisionTotal = tasks.length + reviewTotal

  return <div className="space-y-7">
    <AdminPageHeader
      eyebrow="Today / 今日"
      title="今天的工作台"
      description="先處理需要你判斷的事，再推進客戶與商機。"
      action={<div className="flex gap-2">
        <Button variant="outline" render={<Link href="/admin/inquiries" />}><Inbox />查看詢問</Button>
        <Button render={<Link href="/admin/clients/new" />}><Plus />新增客戶</Button>
      </div>}
    />

    <section className="grid overflow-hidden border border-border bg-card sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "未整理詢問", value: inquiryCount, note: "原始 contact messages", href: "/admin/inquiries", icon: Inbox },
        { label: "活躍客戶", value: clientCount, note: "CRM 關係", href: "/admin/clients", icon: Users },
        { label: "進行中商機", value: openDeals.length, note: money.format(pipeline), href: "/admin/deals", icon: BriefcaseBusiness },
        { label: "等待審核", value: reviewTotal, note: queuedRunCount > 0 ? `另有 ${queuedRunCount} 筆 agent 排隊中` : "AI / 人工分析", href: "/admin/analyses?status=needs_review", icon: Bot },
      ].map(({ label, value, note, href, icon: Icon }) => <Link key={label} href={href} className="admin-row group flex items-start gap-4 border-b border-border p-5 last:border-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
        <div className="grid size-9 place-items-center border border-border bg-background text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"><Icon className="size-4" /></div>
        <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-medium">{value}</p><p className="admin-break mt-1 text-[11px] text-muted-foreground/70">{note}</p></div>
      </Link>)}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="admin-panel p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Decision rail</p><h2 className="mt-2 font-display text-xl font-bold">需要你決定</h2></div>
          <span className="font-mono text-xs text-muted-foreground">{decisionTotal} items</span>
        </div>
        {shown.length === 0 ? (
          <div className="mt-6 border border-dashed border-border px-5 py-10 text-center">
            <p className="font-medium">目前沒有待處理決策</p>
            <p className="mt-1 text-sm text-muted-foreground">可以從網站詢問或客戶列表開始。</p>
          </div>
        ) : <>
          <div className="decision-rail mt-6 space-y-1">{shown.map((item) => <Link key={item.key} href={item.href} className="admin-row group relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 pl-8 pr-2">
            <span className="absolute left-[2px] top-[18px] size-[9px] border-2 border-background bg-primary" />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2"><AdminStatus value={item.tone} label={item.kind} /><p className="admin-break font-medium">{item.title}</p></div>
              <p className="admin-break mt-1.5 text-xs text-muted-foreground">{item.meta}</p>
            </div>
            <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>)}</div>
          {decisionTotal > shown.length && <Link href="/admin/analyses?status=needs_review" className="mt-4 inline-block text-sm text-primary hover:underline">查看其餘 {decisionTotal - shown.length} 筆 →</Link>}
        </>}
      </div>

      <aside className="space-y-6">
        <div className="admin-panel p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pipeline</p>
          <h2 className="mt-2 font-display text-xl font-bold">管線快照</h2>
          <div className="mt-5 space-y-2">
            {openDeals.length === 0
              ? <p className="text-sm text-muted-foreground">還沒有進行中的商機。核准需求分析後會自動建立。</p>
              : openDeals.slice(0, 5).map((deal) => <Link key={deal.id} href={`/admin/deals/${deal.id}`} className="admin-row group flex items-center justify-between gap-3 border border-border p-3">
                  <div className="min-w-0">
                    <p className="admin-break text-sm font-medium">{deal.title}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{stageLabels[deal.stage] || deal.stage}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-primary">{deal.value == null ? "—" : money.format(Number(deal.value))}</span>
                </Link>)}
          </div>
        </div>

        <div className="admin-panel p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Quick start</p>
          <h2 className="mt-2 font-display text-xl font-bold">快速開始</h2>
          <div className="mt-5 space-y-2">
            {[
              ["整理新詢問", "判斷哪些值得進 CRM", "/admin/inquiries"],
              ["審核待決分析", "核准、退回或建立新版", "/admin/analyses?status=needs_review"],
              ["追 agent 執行", "排隊、失敗與變更建議", "/admin/agent-runs"],
            ].map(([title, note, href]) => <Link key={href} href={href} className="admin-row group flex items-center justify-between border border-border p-4">
              <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>)}
          </div>
        </div>
      </aside>
    </section>
  </div>
}
