/** One dictionary for the whole admin, so the same value never reads two ways. */

export const dealStages = [
  ["discovery", "初步接觸"],
  ["analysis", "分析中"],
  ["proposal", "提案"],
  ["negotiation", "議價"],
  ["won", "成交"],
  ["lost", "未成交"],
] as const

export const stageLabels: Record<string, string> = Object.fromEntries(dealStages)

export const clientStatusLabels: Record<string, string> = {
  lead: "潛在", qualified: "已確認", active: "合作中", dormant: "暫停", archived: "封存",
}

export const analysisStatusLabels: Record<string, string> = {
  draft: "草稿", needs_review: "待審", approved: "已核准", superseded: "已被取代", rejected: "已退回",
}

export const analysisTypeLabels: Record<string, string> = {
  needs: "需求分析", market: "市場調查", pricing: "報價分析",
}

export const runStatusLabels: Record<string, string> = {
  queued: "排隊中", running: "執行中", completed: "已完成", failed: "失敗", cancelled: "已取消",
}

export const money = new Intl.NumberFormat("zh-TW", {
  style: "currency", currency: "TWD", maximumFractionDigits: 0,
})

export function formatDealValue(value: string | null, currency = "TWD"): string | null {
  if (value == null) return null
  return `${currency} ${Number(value).toLocaleString("zh-TW")}`
}

/**
 * Rows that come back from raw `db.execute` SQL are not guaranteed to carry
 * driver-parsed Dates, so accept whatever a timestamp column can arrive as.
 */
export type DateLike = Date | string | number | null | undefined

function toDate(value: DateLike): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: DateLike): string {
  const date = toDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(date)
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value)
  if (!date) return "尚無資料"
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei",
  }).format(date)
}
