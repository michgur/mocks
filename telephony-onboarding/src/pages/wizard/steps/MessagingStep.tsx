import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WizardFormState } from '../wizardState'
import type { MessagingData } from '@/types'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
}

export function MessagingStep({ state, update }: Props) {
  const set = (patch: Partial<MessagingData>) =>
    update({ messaging: { ...state.messaging, ...patch } })

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Text messaging</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        US carriers require that recipients have clear consent paths and access to your privacy
        terms before you can send A2P messages.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label className="mb-1.5 block">Privacy policy URL</Label>
          <Input
            type="url"
            value={state.messaging.privacyPolicyUrl ?? ''}
            onChange={(e) => set({ privacyPolicyUrl: e.target.value })}
            placeholder="https://your-site.com/privacy"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Must include language about how recipient phone numbers are handled.
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Terms of service URL</Label>
          <Input
            type="url"
            value={state.messaging.termsOfServiceUrl ?? ''}
            onChange={(e) => set({ termsOfServiceUrl: e.target.value })}
            placeholder="https://your-site.com/terms"
          />
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="font-medium">Sample messages</div>
        <div className="mt-1 text-muted-foreground">
          We'll attach a set of pre-approved template messages to your campaign registration.
          You can customize these later from the messaging settings.
        </div>
      </div>
    </div>
  )
}
