import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Switch } from './ui/switch'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { api, isEligibleForCapability } from '@/api/client'
import { useNumbers } from '@/api/useApi'
import {
  CAPABILITY_LABELS,
  type Capability,
} from '@/types'

interface Props {
  capability: Capability | null
  onClose: () => void
}

export function AssignmentDialog({ capability, onClose }: Props) {
  const { numbers } = useNumbers()
  const [autoAssign, setAutoAssign] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (capability) {
      setAutoAssign(capability.autoAssign)
      setSelected(new Set(capability.assignedNumberIds))
    }
  }, [capability])

  if (!capability) return null

  const eligible = numbers.filter((n) => isEligibleForCapability(n, capability))
  const assignedCount = autoAssign ? eligible.length : selected.size

  const onConfirm = async () => {
    await api.setAssignment(capability.id, autoAssign, Array.from(selected))
    onClose()
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={!!capability} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Phone Numbers</DialogTitle>
          <DialogDescription>{CAPABILITY_LABELS[capability.type]}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <div>
            <Label htmlFor="auto-assign" className="font-medium">
              Auto-assign
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All eligible numbers will be assigned automatically
            </p>
          </div>
          <Switch id="auto-assign" checked={autoAssign} onCheckedChange={setAutoAssign} />
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Assign Manually</div>
          {autoAssign ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              All {eligible.length} eligible numbers are assigned
            </div>
          ) : eligible.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              No eligible numbers to assign
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {eligible.map((n) => (
                <label
                  key={n.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-muted/50"
                >
                  <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggle(n.id)} />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{n.number}</div>
                    {n.city && <div className="text-xs text-muted-foreground">{n.city}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {assignedCount} of {numbers.length} numbers assigned
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
