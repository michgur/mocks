import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WizardFormState } from '../wizardState'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
  rejectionMessage?: string
  rejectionField?: string
}

export function CnamStep({ state, update, rejectionMessage, rejectionField }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Caller ID name</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The brand name carriers will display on outbound calls. Max 15 characters. Must closely
        match your registered business name.
      </p>

      {rejectionMessage && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <div className="font-medium text-destructive">Rejected by carrier</div>
          <div className="mt-1 text-destructive/90">{rejectionMessage}</div>
        </div>
      )}

      <div className="mt-6">
        <div
          className={
            rejectionField === 'displayName'
              ? 'rounded-md ring-2 ring-destructive/40 ring-offset-2 ring-offset-background -m-1 p-1'
              : ''
          }
        >
          <Label className="mb-1.5 block">Display name</Label>
          <Input
            value={state.cnam.displayName ?? ''}
            onChange={(e) => update({ cnam: { displayName: e.target.value } })}
            maxLength={15}
            autoFocus={rejectionField === 'displayName'}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            {(state.cnam.displayName ?? '').length}/15 characters
          </div>
        </div>
      </div>
    </div>
  )
}
