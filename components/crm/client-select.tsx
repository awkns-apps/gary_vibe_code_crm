"use client"

import { useEffect, useState } from "react"

export type ClientOption = { id: number; name: string }

/**
 * Loads its options the first time it renders — i.e. when the form is opened —
 * so listing pages no longer pay for a client list nobody has asked for yet.
 */
export function ClientSelect({ defaultValue }: { defaultValue?: number }) {
  const [clients, setClients] = useState<ClientOption[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/crm/clients?fields=options")
      .then((response) => (response.ok ? response.json() : { clients: [] }))
      .then((data) => { if (!cancelled) setClients(data.clients ?? []) })
      .catch(() => { if (!cancelled) setClients([]) })
    return () => { cancelled = true }
  }, [])

  return (
    <select
      name="clientId"
      required
      aria-label="客戶"
      aria-busy={clients === null}
      defaultValue={defaultValue ?? ""}
      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
    >
      <option value="">{clients === null ? "載入客戶中…" : "選擇客戶"}</option>
      {(clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
    </select>
  )
}
