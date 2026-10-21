import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"
import { AdminPageHeader } from "@/components/admin-page-header"
import { AdminStatus } from "@/components/admin-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadMore, nextLimitHref } from "@/components/admin-load-more"
import { getInquiries, PAGE_SIZE } from "@/lib/crm-data"
import { analysisStatusLabels, formatDateTime } from "@/lib/crm-labels"

export const dynamic = "force-dynamic"

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const { limit: limitParam } = await searchParams
  const limit = Math.min(200, Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE))
  const { items: submissions, total, processed } = await getInquiries({ limit })
  const latestCreatedAt = submissions[0]?.createdAt ?? null

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Contact inbox"
        title="網站詢問"
        description="原始訊息與它們在 CRM 裡的去向。分析 agent 處理過的詢問會直接連到客戶與分析。"
      />

      <section className="grid overflow-hidden border border-border bg-card sm:grid-cols-3">
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">原始詢問</p><p className="mt-1 font-mono text-2xl font-medium">{total}</p></div>
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">已建檔進 CRM</p><p className="mt-1 font-mono text-2xl font-medium text-primary">{processed}</p></div>
        <div className="p-5"><p className="text-xs text-muted-foreground">最近收到</p><p className="mt-1 text-sm">{formatDateTime(latestCreatedAt)}</p></div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>原始訊息</CardTitle>
          <CardDescription>依收到時間排序。建檔由 agent 或你手動進行，這頁不會自動改動 CRM。</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">還沒有網站詢問。</div>
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {submissions.map((item) => (
                  <article key={item.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="admin-break font-medium">{item.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                      </div>
                      <a aria-label={`寄信給 ${item.name}`} className="grid size-10 shrink-0 place-items-center border border-border text-primary" href={`mailto:${item.email}`}><Mail className="size-4" /></a>
                    </div>
                    <h3 className="admin-break mt-4 text-sm font-medium">{item.subject}</h3>
                    <p className="admin-break mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.message}</p>
                    <p className="admin-break mt-3 text-xs text-primary">{item.email}</p>
                    <div className="mt-4 border-t border-border pt-3"><InquiryLinkage item={item} /></div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">收到時間</th>
                    <th className="px-3 py-3 font-medium">姓名</th>
                    <th className="px-3 py-3 font-medium">主旨</th>
                    <th className="px-3 py-3 font-medium">訊息</th>
                    <th className="px-3 py-3 font-medium">CRM 去向</th>
                  </tr></thead>
                  <tbody>{submissions.map((item) => (
                    <tr key={item.id} className="admin-row border-b border-border/70 align-top last:border-0">
                      <td className="whitespace-nowrap px-3 py-4 font-mono text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                      <td className="px-3 py-4">
                        <p className="admin-break font-medium">{item.name}</p>
                        <a className="admin-break mt-1 inline-flex items-center gap-1.5 text-xs text-primary hover:underline" href={`mailto:${item.email}`}><Mail className="size-3 shrink-0" />{item.email}</a>
                      </td>
                      <td className="admin-break px-3 py-4">{item.subject}</td>
                      <td className="max-w-sm px-3 py-4 text-muted-foreground"><p className="line-clamp-3 whitespace-pre-wrap">{item.message}</p></td>
                      <td className="px-3 py-4"><InquiryLinkage item={item} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <LoadMore
        shown={submissions.length}
        total={total}
        nextHref={nextLimitHref("/admin/inquiries", {}, limit + PAGE_SIZE)}
        unit="筆詢問"
      />
    </div>
  )
}

type Linkage = {
  clientId: number | null
  clientName: string | null
  analysisId: number | null
  analysisTitle: string | null
  analysisStatus: string | null
}

function InquiryLinkage({ item }: { item: Linkage }) {
  if (item.clientId == null) {
    return <span className="font-mono text-[11px] text-muted-foreground">尚未建檔</span>
  }
  return (
    <div className="min-w-0 space-y-1.5">
      <Link href={`/admin/clients/${item.clientId}`} className="admin-break group inline-flex items-center gap-1.5 text-primary hover:underline">
        {item.clientName}
        <ArrowRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
      {item.analysisId != null && (
        <Link href={`/admin/analyses/${item.analysisId}`} className="admin-break flex flex-wrap items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <span className="admin-break">{item.analysisTitle}</span>
          {item.analysisStatus && <AdminStatus value={item.analysisStatus} label={analysisStatusLabels[item.analysisStatus]} />}
        </Link>
      )}
    </div>
  )
}
