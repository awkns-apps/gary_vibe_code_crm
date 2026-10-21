import { notFound } from "next/navigation"
import Link from "next/link"
import { Bot, CheckCircle2, CircleUser, GitBranch } from "lucide-react"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import { AdminStatus } from "@/components/admin-status"
import { ApiAction } from "@/components/crm/api-action"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAnalysis } from "@/lib/crm-data"
import {
  analysisStatusLabels, analysisTypeLabels, formatDate,
  formatDealValue, runStatusLabels, stageLabels,
} from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function AnalysisDetail({ params }: { params: Promise<{ id: string }> }) {
  const data = await getAnalysis(Number((await params).id))
  if (!data) notFound()
  const { analysis, clientName, deal, runs, siblings } = data
  const pricingRun = runs.find((run) => run.taskType === "pricing_analysis")

  return <div className="mx-auto min-w-0 max-w-5xl space-y-7">
    <AdminBreadcrumb items={[
      { label: "分析中心", href: "/admin/analyses" },
      { label: clientName, href: `/admin/clients/${analysis.clientId}` },
      { label: analysis.title },
    ]} />

    <header className="min-w-0 border-b border-border pb-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-primary">{analysisTypeLabels[analysis.type] || analysis.type}</span>
        <span className="font-mono text-[11px] text-muted-foreground">v{analysis.version}</span>
        <AdminStatus value={analysis.status} label={analysisStatusLabels[analysis.status]} />
        {analysis.confidence != null && <span className="font-mono text-[11px] text-muted-foreground">信心度 {analysis.confidence}%</span>}
      </div>
      <h1 className="admin-break mt-3 font-display text-3xl font-bold">{analysis.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link href={`/admin/clients/${analysis.clientId}`} className="admin-break inline-flex items-center gap-2 text-primary hover:underline">
          <CircleUser className="size-4 shrink-0" />{clientName}
        </Link>
        <span className="admin-break">created by {analysis.createdBy}</span>
        {analysis.reviewedBy && <span className="admin-break">reviewed by {analysis.reviewedBy} · {formatDate(analysis.reviewedAt)}</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {analysis.status === "draft" && <ApiAction url={`/api/crm/analyses/${analysis.id}`} body={{ status: "needs_review" }} label="送交審核" />}
        {analysis.status === "needs_review" && <>
          <ApiAction url={`/api/crm/analyses/${analysis.id}`} body={{ status: "approved" }} label="核准" variant="default" />
          <ApiAction url={`/api/crm/analyses/${analysis.id}`} body={{ status: "rejected" }} label="退回" variant="destructive" />
        </>}
        {analysis.status === "approved" && <ApiAction url={`/api/crm/analyses/${analysis.id}`} body={{ createVersion: true }} label="建立新版本" />}
      </div>
    </header>

    {(deal || pricingRun || siblings.length > 0) && <Card className="min-w-0">
      <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" />管線</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {deal
          ? <div className="min-w-0">
              <p className="text-xs text-muted-foreground">連結商機</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <Link href={`/admin/deals/${deal.id}`} className="admin-break font-medium text-primary hover:underline">{deal.title}</Link>
                <AdminStatus value={deal.stage} label={stageLabels[deal.stage] || deal.stage} />
                <span className="font-mono text-xs text-muted-foreground">{formatDealValue(deal.value, deal.currency) ?? "金額待報價"}</span>
              </div>
            </div>
          : <p className="text-sm text-muted-foreground">尚未連結商機。核准需求分析後會自動建立。</p>}

        {pricingRun && <div className="min-w-0 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">報價分析</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="admin-break font-medium">{pricingRun.agentName}</span>
            <AdminStatus value={pricingRun.status} label={runStatusLabels[pricingRun.status]} />
            <Link href="/admin/agent-runs" className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline">
              {pricingRun.status === "queued" ? "等待 cron 執行" : pricingRun.taskType}
            </Link>
          </div>
          {pricingRun.error && <p role="alert" className="admin-break mt-2 border-l-2 border-destructive pl-3 text-xs text-destructive">{pricingRun.error}</p>}
        </div>}

        {siblings.length > 0 && <div className="min-w-0 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">同商機的其他分析</p>
          <div className="mt-2 space-y-2">{siblings.map((sibling) => <Link key={sibling.id} href={`/admin/analyses/${sibling.id}`} className="flex flex-wrap items-center gap-3 hover:underline">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{analysisTypeLabels[sibling.type] || sibling.type}</span>
            <span className="admin-break text-sm">{sibling.title}</span>
            <AdminStatus value={sibling.status} label={analysisStatusLabels[sibling.status]} />
          </Link>)}</div>
        </div>}
      </CardContent>
    </Card>}

    <Card><CardHeader><CardTitle>摘要</CardTitle></CardHeader><CardContent><p className="admin-break leading-relaxed text-muted-foreground">{analysis.summary || "這份分析仍是空白草稿。"}</p></CardContent></Card>

    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Card className="min-w-0"><CardHeader><CardTitle>發現</CardTitle></CardHeader><CardContent className="space-y-4">
        {analysis.findings.length === 0
          ? <p className="text-sm text-muted-foreground">尚未記錄發現。</p>
          : analysis.findings.map((finding, index) => <div key={index} className="min-w-0 border-t border-border pt-4 first:border-0 first:pt-0"><p className="admin-break font-medium">{finding.label}</p><p className="admin-break mt-1 text-sm text-muted-foreground">{finding.detail}</p></div>)}
      </CardContent></Card>
      <Card className="min-w-0"><CardHeader><CardTitle>建議</CardTitle></CardHeader><CardContent className="space-y-3">
        {analysis.recommendations.length === 0
          ? <p className="text-sm text-muted-foreground">尚未提出建議。</p>
          : analysis.recommendations.map((recommendation, index) => <p key={index} className="admin-break flex gap-3 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{recommendation}</p>)}
      </CardContent></Card>
    </div>

    <Card className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-4" />證據與追溯</CardTitle></CardHeader><CardContent className="space-y-2">
      {analysis.evidence.length === 0
        ? <p className="text-sm text-muted-foreground">尚未附上來源。</p>
        : analysis.evidence.map((evidence, index) => <div key={index} className="min-w-0 border-t border-border pt-2 first:border-0 first:pt-0">
            <p className="admin-break text-sm">{evidence.url ? <a href={evidence.url} className="break-all text-primary hover:underline">{evidence.title}</a> : evidence.title}</p>
            {evidence.note && <p className="admin-break mt-0.5 text-xs text-muted-foreground">{evidence.note}</p>}
          </div>)}
    </CardContent></Card>
  </div>
}
