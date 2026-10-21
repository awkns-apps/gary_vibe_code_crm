import Link from "next/link"
import { AdminPageHeader } from "@/components/admin-page-header"
import { AdminStatus } from "@/components/admin-status"
import { LoadMore, nextLimitHref } from "@/components/admin-load-more"
import { AnalysisForm } from "@/components/crm/analysis-form"
import { getAllAnalyses, getAnalysisStatusCounts, PAGE_SIZE } from "@/lib/crm-data"
import { analysisStatusLabels, analysisTypeLabels, formatDate } from "@/lib/crm-labels"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const statusFilters = [
  ["all", "全部"], ["needs_review", "待審"], ["approved", "已核准"],
  ["draft", "草稿"], ["rejected", "已退回"], ["superseded", "已被取代"],
] as const

const typeFilters = [["all", "全部類型"], ["needs", "需求分析"], ["market", "市場調查"], ["pricing", "報價分析"]] as const

function filterHref(status: string, type: string) {
  const params = new URLSearchParams()
  if (status !== "all") params.set("status", status)
  if (type !== "all") params.set("type", type)
  const query = params.toString()
  return query ? `/admin/analyses?${query}` : "/admin/analyses"
}

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; client?: string; limit?: string }>
}) {
  const { status = "all", type = "all", client, limit: limitParam } = await searchParams
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE))

  // Filtering happens in SQL; only the page being shown crosses the wire.
  const [{ items: analyses, total }, counts] = await Promise.all([
    getAllAnalyses({ status, type, limit }),
    getAnalysisStatusCounts(),
  ])

  return <div className="space-y-7">
    <AdminPageHeader
      eyebrow="Research desk"
      title="分析中心"
      description="需求分析、市場調查與報價分析的版本、證據和審核狀態。"
      action={<AnalysisForm
        defaultClientId={client ? Number(client) : undefined}
        autoOpen={Boolean(client)}
      />}
    />

    <div className="flex flex-col gap-3 border border-border bg-card px-5 py-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">狀態</span>
        {statusFilters.map(([key, label]) => <Link
          key={key}
          href={filterHref(key, type)}
          aria-current={status === key ? "page" : undefined}
          className={cn(
            "border px-2.5 py-1 font-mono text-[11px] transition-colors",
            status === key ? "border-primary/40 bg-primary/12 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >{label}{counts[key] ? <span className="ml-1.5 opacity-70">{counts[key]}</span> : null}</Link>)}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">類型</span>
        {typeFilters.map(([key, label]) => <Link
          key={key}
          href={filterHref(status, key)}
          aria-current={type === key ? "page" : undefined}
          className={cn(
            "border px-2.5 py-1 font-mono text-[11px] transition-colors",
            type === key ? "border-primary/40 bg-primary/12 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >{label}</Link>)}
      </div>
    </div>

    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {analyses.map((a) => <Link href={`/admin/analyses/${a.id}`} key={a.id} className="admin-row admin-panel flex min-w-0 flex-col p-5 hover:border-primary/50">
        <div className="flex justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{analysisTypeLabels[a.type]}</span>
          <span className="font-mono text-[10px] text-muted-foreground">v{a.version}</span>
        </div>
        <h2 className="admin-break mt-4 font-display text-lg font-bold">{a.title}</h2>
        <p className="admin-break mt-1 text-sm text-muted-foreground">{a.clientName}</p>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">{a.summary || "尚未填寫摘要。"}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <AdminStatus value={a.status} label={analysisStatusLabels[a.status]} />
          <span className="font-mono text-[10px] text-muted-foreground">{a.confidence == null ? "信心度未評估" : `${a.confidence}% confidence`}</span>
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">更新於 {formatDate(a.updatedAt)}</p>
      </Link>)}
    </div>

    {analyses.length === 0 ? (
      <div className="border border-dashed border-border py-14 text-center">
        <p className="text-sm text-muted-foreground">{counts.all === 0 ? "尚無分析。可以由你建立草稿，或未來由 agent 建立待審核版本。" : "這個篩選條件下沒有分析。"}</p>
        {counts.all > 0 && <Link href="/admin/analyses" className="mt-3 inline-block text-sm text-primary hover:underline">清除篩選</Link>}
      </div>
    ) : (
      <LoadMore
        shown={analyses.length}
        total={total}
        nextHref={nextLimitHref("/admin/analyses", { status, type }, limit + PAGE_SIZE)}
      />
    )}
  </div>
}
