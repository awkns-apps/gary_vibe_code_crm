import type { Pose } from "@/components/agent-face"

export type Tone = "idle" | "info" | "warn" | "danger" | "good"

export type AgentStatus = {
  reviewCount: number
  queuedRuns: number
  failedRuns: number
  pendingProposals: number
  openDealValue: number
  unprocessedInquiries: number
}

export type Mood = { pose: Pose; tone: Tone; message: string }

const money = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 })

/**
 * One ladder, used by both the top-bar avatar and the desk home, so the face
 * and the greeting can never disagree. Anything needing a human wins; only
 * when the desk is clear does the agent react to where you are and the time.
 */
export function resolveMood(status: AgentStatus, pathname: string, hour: number): Mood {
  if (status.failedRuns > 0) {
    return { pose: "oops", tone: "danger", message: `有 ${status.failedRuns} 筆 agent 執行失敗，我沒能處理完` }
  }
  if (status.pendingProposals > 0) {
    return { pose: "caution", tone: "warn", message: `${status.pendingProposals} 筆資料變更等你決定，我不會自己套用` }
  }
  if (status.reviewCount > 0) {
    return { pose: "alert", tone: "warn", message: `今天有 ${status.reviewCount} 筆分析等你審核` }
  }
  if (status.queuedRuns > 0) {
    return { pose: "thinking", tone: "info", message: `${status.queuedRuns} 筆工作排隊中，等下一次 cron` }
  }

  if (pathname.startsWith("/admin/inquiries")) {
    return status.unprocessedInquiries > 0
      ? { pose: "hello", tone: "info", message: `${status.unprocessedInquiries} 筆新詢問還沒建檔` }
      : { pose: "calm", tone: "good", message: "詢問都建檔了" }
  }
  if (pathname.startsWith("/admin/clients")) {
    return { pose: "greet", tone: "idle", message: "客戶主檔與互動脈絡都在這裡" }
  }
  if (pathname.startsWith("/admin/deals")) {
    return status.openDealValue > 0
      ? { pose: "proud", tone: "good", message: `管線上有 ${money.format(status.openDealValue)} 在跑` }
      : { pose: "neutral", tone: "idle", message: "還沒有進行中的商機" }
  }
  if (pathname.startsWith("/admin/analyses")) {
    return { pose: "idea", tone: "idle", message: "需求、市場與報價分析都在這裡" }
  }
  if (pathname.startsWith("/admin/agent-runs")) {
    return { pose: "focus", tone: "idle", message: "每一次執行都留有來源與結果" }
  }

  if (hour < 5) return { pose: "sheepish", tone: "idle", message: "這麼晚還在？我陪你看" }
  if (hour < 11) return { pose: "cheer", tone: "good", message: "早安，目前沒有待你決定的事" }
  if (hour < 18) return { pose: "calm", tone: "good", message: "桌面清空了，沒有待辦" }
  return { pose: "neutral", tone: "good", message: "今天的事都處理完了" }
}

/** Hour of day in Taipei, so the server and the browser agree on the greeting. */
export function taipeiHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(now))
}
