import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WizardFormState } from '../wizardState'
import type { AuthorizedRepData } from '@/types'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
  aiActive?: boolean
}

export function AuthorizedRepStep({ state, update, aiActive }: Props) {
  const rep = state.representative
  const set = (patch: Partial<AuthorizedRepData>) =>
    update({ representative: { ...rep, ...patch } })

  // The representative defaults to the signed-in user (known from registration).
  // We only ask for it when there's no known contact or they pick someone else.
  const hasKnownRep = !!(rep.firstName || rep.lastName || rep.email)
  const [editingIdentity, setEditingIdentity] = useState(!hasKnownRep)

  const fullName = [rep.firstName, rep.lastName].filter(Boolean).join(' ')
  const summary = [fullName, rep.email, rep.phone].filter(Boolean).join(' · ')

  return (
    <div className="space-y-4">
      {editingIdentity ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">First name</Label>
              <Input
                value={rep.firstName ?? ''}
                onChange={(e) => set({ firstName: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Last name</Label>
              <Input
                value={rep.lastName ?? ''}
                onChange={(e) => set({ lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input
              type="email"
              value={rep.email ?? ''}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="name@company.com"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Phone</Label>
            <Input
              type="tel"
              value={rep.phone ?? ''}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+1 415 555 0000"
            />
          </div>
          {hasKnownRep && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground"
              onClick={() => setEditingIdentity(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
          <div className="text-sm">{summary}</div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setEditingIdentity(true)}
          >
            Use someone else
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div
          id="field-title"
          className={cn(
            'scroll-mt-24',
            aiActive &&
              !rep.title &&
              'rounded-md ring-2 ring-amber-400/60 ring-offset-2 ring-offset-background -m-1 p-1'
          )}
        >
          <Label className="mb-1.5 block">Title</Label>
          <Input
            value={rep.title ?? ''}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="COO"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Position</Label>
          <Input
            value={rep.position ?? ''}
            onChange={(e) => set({ position: e.target.value })}
            placeholder="Authorized Representative"
          />
        </div>
      </div>
    </div>
  )
}
