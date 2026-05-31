import { useState } from 'react'
import { api } from '@/api/client'
import { Button } from './ui/button'
import { Settings2 } from 'lucide-react'

export function DevToolbar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-64 rounded-lg border bg-background p-3 shadow-lg">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Demo controls</div>
          <div className="flex flex-col gap-1.5">
            <Button size="sm" variant="outline" onClick={() => api._reset()}>
              Reset to seeded state
            </Button>
            <Button size="sm" variant="outline" onClick={() => api._clear()}>
              Clear (zero state)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                // Approve the rejected Caller ID Name (demo of fixing a rejection)
                await api._simulateRequirementStatus('req_cnam', 'approved')
              }}
            >
              Approve rejected Caller ID Name
            </Button>
          </div>
        </div>
      )}
      <Button
        size="icon"
        variant="outline"
        className="rounded-full shadow-lg"
        onClick={() => setOpen(!open)}
        title="Demo controls"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
