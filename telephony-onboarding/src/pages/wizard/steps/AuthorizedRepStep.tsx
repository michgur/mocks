import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WizardFormState } from '../wizardState'
import type { AuthorizedRepData } from '@/types'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
}

export function AuthorizedRepStep({ state, update }: Props) {
  const set = (patch: Partial<AuthorizedRepData>) =>
    update({ representative: { ...state.representative, ...patch } })

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Authorized representative</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Someone at your business who can confirm registration details if a carrier reaches out.
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">First name</Label>
            <Input
              value={state.representative.firstName ?? ''}
              onChange={(e) => set({ firstName: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Last name</Label>
            <Input
              value={state.representative.lastName ?? ''}
              onChange={(e) => set({ lastName: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input
            type="email"
            value={state.representative.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="name@company.com"
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Phone</Label>
          <Input
            type="tel"
            value={state.representative.phone ?? ''}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="+1 415 555 0000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Title</Label>
            <Input
              value={state.representative.title ?? ''}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="COO"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Position</Label>
            <Input
              value={state.representative.position ?? ''}
              onChange={(e) => set({ position: e.target.value })}
              placeholder="Authorized Representative"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
