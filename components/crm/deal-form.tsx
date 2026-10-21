"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClientSelect } from "@/components/crm/client-select"
import { dealStages } from "@/lib/crm-labels"

export function DealForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function submit(data: FormData) {
    setPending(true); setError("")
    const response = await fetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) })
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
    <Button onClick={() => setOpen(!open)} aria-expanded={open}>新增商機</Button>
    {open && <form action={submit} className="mt-3 grid gap-3 border border-primary/40 bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <ClientSelect />
      <Input name="title" required placeholder="商機名稱" />
      <Input name="value" type="number" min="0" placeholder="預估金額" />
      <select name="stage" aria-label="階段" className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
        {dealStages.filter(([key]) => key !== "won" && key !== "lost").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <Button type="submit" disabled={pending}>{pending ? "儲存中…" : "儲存商機"}</Button>
      {error && <p role="alert" className="text-xs text-destructive lg:col-span-5">{error}</p>}
    </form>}
  </>
}
