"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ActivityForm({ clientId }: { clientId: number }) {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [type, setType] = useState("note")
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!subject.trim()) return
    setPending(true)
    const response = await fetch("/api/crm/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, subject, type }),
    })
    setPending(false)
    if (response.ok) {
      setSubject("")
      router.refresh()
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
      <select value={type} onChange={(event) => setType(event.target.value)} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
        <option value="note">備註</option><option value="call">電話</option><option value="meeting">會議</option><option value="email">Email</option><option value="task">待辦</option>
      </select>
      <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="記下一次互動或待辦…" />
      <Button onClick={submit} disabled={pending || !subject.trim()}>加入時間軸</Button>
    </div>
  )
}
