"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const fieldClass = "space-y-2"

export function ClientForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const payload = Object.fromEntries(formData.entries())
    const response = await fetch("/api/crm/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        tags: String(payload.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    })
    const result = await response.json()
    setPending(false)
    if (!response.ok) return setError(result.error || "無法建立客戶")
    router.push(`/admin/clients/${result.client.id}`)
    router.refresh()
  }

  return (
    <form action={submit} className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-bold">公司資料</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className={fieldClass}><Label htmlFor="name">客戶名稱 *</Label><Input id="name" name="name" required placeholder="例如：北辰科技" /></div>
          <div className={fieldClass}><Label htmlFor="legalName">公司登記名稱</Label><Input id="legalName" name="legalName" /></div>
          <div className={fieldClass}><Label htmlFor="industry">產業</Label><Input id="industry" name="industry" placeholder="SaaS、製造、零售…" /></div>
          <div className={fieldClass}><Label htmlFor="website">網站</Label><Input id="website" name="website" type="url" placeholder="https://" /></div>
          <div className={fieldClass}><Label htmlFor="source">來源</Label><Input id="source" name="source" placeholder="朋友介紹、活動、主動開發…" /></div>
          <div className={fieldClass}><Label htmlFor="owner">負責人</Label><Input id="owner" name="owner" defaultValue="Steven" /></div>
          <div className={`${fieldClass} sm:col-span-2`}><Label htmlFor="tags">標籤</Label><Input id="tags" name="tags" placeholder="高潛力, AI 自動化, 台北（用逗號分隔）" /></div>
          <div className={`${fieldClass} sm:col-span-2`}><Label htmlFor="summary">客戶摘要</Label><Textarea id="summary" name="summary" rows={3} placeholder="這家公司是誰、目前為何值得關注。" /></div>
        </div>
      </section>

      <section className="border-t border-border pt-7">
        <h2 className="font-display text-lg font-bold">主要聯絡人</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className={fieldClass}><Label htmlFor="contactName">姓名</Label><Input id="contactName" name="contactName" /></div>
          <div className={fieldClass}><Label htmlFor="contactTitle">職稱</Label><Input id="contactTitle" name="contactTitle" /></div>
          <div className={fieldClass}><Label htmlFor="contactEmail">Email</Label><Input id="contactEmail" name="contactEmail" type="email" /></div>
          <div className={fieldClass}><Label htmlFor="contactPhone">電話</Label><Input id="contactPhone" name="contactPhone" /></div>
        </div>
      </section>

      <section className="border-t border-border pt-7">
        <h2 className="font-display text-lg font-bold">第一個下一步</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_14rem]">
          <div className={fieldClass}><Label htmlFor="nextAction">行動</Label><Input id="nextAction" name="nextAction" placeholder="例如：寄出初步訪談問題" /></div>
          <div className={fieldClass}><Label htmlFor="nextActionAt">日期</Label><Input id="nextActionAt" name="nextActionAt" type="date" /></div>
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}建立客戶
        </Button>
      </div>
    </form>
  )
}
