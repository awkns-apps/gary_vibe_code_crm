import Link from "next/link"
import { Bot, GitPullRequestArrow } from "lucide-react"
import { AdminPageHeader } from "@/components/admin-page-header"
import { AdminStatus } from "@/components/admin-status"
import { ApiAction } from "@/components/crm/api-action"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadMore, nextLimitHref } from "@/components/admin-load-more"
import { getAgentDesk, PAGE_SIZE } from "@/lib/crm-data"
import { formatDateTime, runStatusLabels } from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function AgentRunsPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const { limit: limitParam } = await searchParams
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE))
  const { runs: runPage, proposals } = await getAgentDesk({ limit })
  const runs = runPage.items
  const pending = proposals.filter((proposal) => proposal.status === "pending")
  const queued = runs.filter(({ run }) => run.status === "queued")

  return <div className="space-y-7">
    <AdminPageHeader eyebrow="Review queue" title="Agent 審核" description="先處理等待你判斷的變更，再追查每次執行的來源與結果。" />

    <section className="grid overflow-hidden border border-border bg-card sm:grid-cols-3">
      <div className="border-b border-border p-5 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">等待決定的變更</p><p className="mt-1 font-mono text-2xl font-medium">{pending.length}</p></div>
      <div className="border-b border-border p-5 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">排隊中的執行</p><p className="mt-1 font-mono text-2xl font-medium text-primary">{queued.length}</p></div>
      <div className="p-5"><p className="text-xs text-muted-foreground">總執行紀錄</p><p className="mt-1 font-mono text-2xl font-medium">{runPage.total}</p></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2"><Bot className="size-4 text-primary" />執行紀錄</CardTitle>
          <CardDescription>每筆執行可以直接跳到它產出或引用的分析與客戶。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {runs.length === 0 ? <p className="text-sm text-muted-foreground">尚無執行紀錄。</p> : runs.map(({ run, clientName, analysisTitle }) => <div key={run.id} className="min-w-0 border-t border-border pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="admin-break font-medium">{run.agentName}</p>
              <AdminStatus value={run.status} label={runStatusLabels[run.status]} />
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{run.taskType} · {run.model || "model 未記錄"} · {formatDateTime(run.createdAt)}</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {run.clientId && <Link href={`/admin/clients/${run.clientId}`} className="admin-break text-primary hover:underline">{clientName || `客戶 #${run.clientId}`}</Link>}
              {run.analysisId && <Link href={`/admin/analyses/${run.analysisId}`} className="admin-break text-muted-foreground hover:text-primary hover:underline">{analysisTitle || `分析 #${run.analysisId}`}</Link>}
              {typeof run.input?.dealId === "number" && <Link href={`/admin/deals/${run.input.dealId}`} className="admin-break text-muted-foreground hover:text-primary hover:underline">商機 #{run.input.dealId}</Link>}
            </div>
            {run.error && <p role="alert" className="admin-break mt-2 border-l-2 border-destructive pl-3 text-xs leading-relaxed text-destructive">{run.error}</p>}
          </div>)}
          <LoadMore
            shown={runs.length}
            total={runPage.total}
            nextHref={nextLimitHref("/admin/agent-runs", {}, limit + PAGE_SIZE)}
            unit="筆執行"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2"><GitPullRequestArrow className="size-4 text-primary" />等待決定的變更</CardTitle>
          <CardDescription>agent 提出的資料變更，套用前一律經過你。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 ? <p className="text-sm text-muted-foreground">目前沒有等待審核的建議。</p> : proposals.map((proposal) => <div key={proposal.id} className="min-w-0 border-t border-border pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="admin-break font-medium">{proposal.operation} {proposal.entityType}</p>
              <AdminStatus value={proposal.status} />
            </div>
            <p className="admin-break mt-1 text-sm text-muted-foreground">{proposal.reason}</p>
            {proposal.entityType === "client" && proposal.entityId && <Link href={`/admin/clients/${proposal.entityId}`} className="mt-1 inline-block text-xs text-primary hover:underline">查看目標客戶</Link>}
            {proposal.status === "pending" && <div className="mt-3 flex gap-2">
              <ApiAction url={`/api/crm/change-proposals/${proposal.id}`} body={{ action: "approve" }} label="核准並套用" variant="default" />
              <ApiAction url={`/api/crm/change-proposals/${proposal.id}`} body={{ action: "reject" }} label="拒絕" variant="destructive" />
            </div>}
          </div>)}
        </CardContent>
      </Card>
    </div>
  </div>
}
