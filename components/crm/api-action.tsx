"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { dealStages } from "@/lib/crm-labels"

type ApprovalEffects = {
  dealId: number | null
  dealCreated: boolean
  dealStage: string | null
  clientPromoted: boolean
  pricingRunQueued: boolean
  dealValue: string | null
  notes: string[]
}

function describeEffects(effects: ApprovalEffects): string {
  const parts: string[] = []
  if (effects.dealCreated) parts.push("已建立商機")
  else if (effects.dealId) parts.push("已連結既有商機")
  if (effects.dealStage) parts.push(`階段：${effects.dealStage}`)
  if (effects.dealValue) parts.push(`金額：${Number(effects.dealValue).toLocaleString()}`)
  if (effects.clientPromoted) parts.push("客戶升級為 qualified")
  if (effects.pricingRunQueued) parts.push("已排入報價分析")
  return [parts.join("・"), ...effects.notes].filter(Boolean).join(" ")
}

export function ApiAction({ url, body, label, variant = "outline" }: { url: string; body: Record<string, unknown>; label: string; variant?: "outline" | "default" | "destructive" }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  async function run() {
    setPending(true); setError(""); setSuccess("")
    const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const result = await response.json().catch(() => null)
    setPending(false)
    if (!response.ok) {
      setError(result?.error?.message || "操作失敗")
      return
    }
    if (result?.effects) setSuccess(describeEffects(result.effects))
    router.refresh()
  }
  return <div>
    <Button size="sm" variant={variant} onClick={run} disabled={pending}>{pending ? "處理中…" : label}</Button>
    {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    {success && <p role="status" className="mt-1 text-xs text-signal">{success}</p>}
  </div>
}

export function DealStage({ id, stage, selectId }: { id: number; stage: string; selectId?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function change(next: string) {
    setPending(true); setError("")
    const response = await fetch(`/api/crm/deals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: next }) })
    setPending(false)
    if (!response.ok) { setError("階段更新失敗"); return }
    router.refresh()
  }
  return <div className="mt-2">
    <select
      id={selectId}
      aria-label="商機階段"
      disabled={pending}
      defaultValue={stage}
      onChange={(event) => change(event.target.value)}
      className="h-8 w-full cursor-pointer border border-input bg-background px-2 text-xs transition-colors hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
    >
      {dealStages.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
  </div>
}
