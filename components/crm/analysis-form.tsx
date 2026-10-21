"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClientSelect } from "@/components/crm/client-select"
import { analysisTypeLabels } from "@/lib/crm-labels"

export function AnalysisForm({
  defaultClientId,
  autoOpen = false,
}: {
  defaultClientId?: number
  autoOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(autoOpen)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(data: FormData) {
    setPending(true); setError("")
    const response = await fetch("/api/crm/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(data)),
    })
    setPending(false)
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error?.message || result?.error || "建立失敗")
      return
    }
    setOpen(false)
    router.refresh()
  }

  return <>
    <Button onClick={() => setOpen(!open)} aria-expanded={open}>建立分析</Button>
    {open && <form action={submit} className="mt-3 grid gap-3 border border-primary/40 bg-card p-4 sm:grid-cols-4">
      <ClientSelect defaultValue={defaultClientId} />
      <select name="type" aria-label="分析類型" className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
        {Object.entries(analysisTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <Input name="title" required placeholder="分析標題" />
      <Button type="submit" disabled={pending}>{pending ? "建立中…" : "建立草稿"}</Button>
      {error && <p role="alert" className="text-xs text-destructive sm:col-span-4">{error}</p>}
    </form>}
  </>
}
