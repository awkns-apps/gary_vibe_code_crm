import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AdminPageHeader } from "@/components/admin-page-header"
import { ClientForm } from "@/components/crm/client-form"
import { Card, CardContent } from "@/components/ui/card"

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />返回客戶</Link>
      <AdminPageHeader eyebrow="New relationship" title="新增客戶" description="先建立足以推進工作的資料；其他資訊之後可以由你或 agents 逐步補上。" />
      <Card><CardContent><ClientForm /></CardContent></Card>
    </div>
  )
}
