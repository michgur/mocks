import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useConnections, useImportableNumbers } from '@/api/useApi'
import { COUNTRY_FLAGS, type Agent } from '@/types'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

export function ImportNumbersModal({
  open,
  onOpenChange,
  agent,
  companyId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  agent: Agent
  companyId: string
}) {
  const { importable } = useImportableNumbers(companyId)
  const { connections } = useConnections(companyId)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  // Clear the selection whenever the modal closes.
  useEffect(() => {
    if (!open) setSelected(new Set())
  }, [open])

  const accountSid = connections[0]?.accountSid

  const toggle = (number: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })

  const onImport = async () => {
    setBusy(true)
    try {
      const picks = importable.filter((n) => selected.has(n.number))
      await api.importNumbers(agent.id, picks)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const count = selected.size
  const noun = count === 1 ? 'number' : 'numbers'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import numbers</DialogTitle>
          <DialogDescription>
            Link numbers from your connected Twilio account
            {accountSid && (
              <>
                {' '}
                (<span className="font-mono">{accountSid}</span>)
              </>
            )}{' '}
            to <strong>{agent.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {importable.length === 0 ? (
          <div className="rounded-md border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
            No numbers available to import. All numbers in this account are already linked.
          </div>
        ) : (
          <div className="max-h-72 space-y-1 overflow-auto">
            {importable.map((n) => {
              const checked = selected.has(n.number)
              return (
                <label
                  key={n.number}
                  className="flex cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 hover:bg-accent"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(n.number)} />
                  <span>{COUNTRY_FLAGS[n.country]}</span>
                  <span className="flex-1 font-mono text-sm">{n.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.region ? `${n.country} • ${n.region}` : n.country}
                  </span>
                </label>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onImport} disabled={busy || count === 0}>
            {busy ? 'Importing…' : `Import ${count} ${noun}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
