import { Button } from '@/components/ui/button'
import { COUNTRY_LABELS } from '@/types'
import { type WizardFormState, type WizardStepId } from '../wizardState'

interface Props {
  state: WizardFormState
  goToStep: (s: WizardStepId) => void
  showIdentity: boolean
}

export function ReviewStep({ state, goToStep, showIdentity }: Props) {
  const showMessaging = state.capabilities.includes('texting') && state.countries.includes('US')
  const showCnam = state.capabilities.includes('branded_caller_id')

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Review &amp; submit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirm your details before we send them to carriers for approval.
      </p>

      <div className="mt-6 space-y-3">
        {showIdentity && (
          <ReviewCard title="Business information" onEdit={() => goToStep('business')}>
            <Row label="Legal name" value={state.business.legalName} />
            <Row
              label="Registration"
              value={`${state.business.registrationType ?? ''} ${state.business.registrationNumber ?? ''}`.trim()}
            />
            <Row
              label="Address"
              value={[
                state.business.addressLine1,
                [state.business.city, state.business.state, state.business.postalCode]
                  .filter(Boolean)
                  .join(', '),
                state.business.country && COUNTRY_LABELS[state.business.country],
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            <Row label="Company type" value={state.business.companyType} />
            <Row label="Industry" value={state.business.industry} />
            <Row label="Website" value={state.business.website} />
          </ReviewCard>
        )}

        {showIdentity && (
          <ReviewCard title="Authorized representative" onEdit={() => goToStep('representative')}>
            <Row
              label="Name"
              value={`${state.representative.firstName ?? ''} ${state.representative.lastName ?? ''}`.trim()}
            />
            <Row label="Email" value={state.representative.email} />
            <Row label="Phone" value={state.representative.phone} />
            <Row label="Title" value={state.representative.title} />
          </ReviewCard>
        )}

        {showMessaging && (
          <ReviewCard title="Text messaging" onEdit={() => goToStep('messaging')}>
            <Row label="Privacy policy" value={state.messaging.privacyPolicyUrl} />
            <Row label="Terms of service" value={state.messaging.termsOfServiceUrl} />
          </ReviewCard>
        )}

        {showCnam && (
          <ReviewCard title="Caller ID name" onEdit={() => goToStep('cnam')}>
            <Row label="Display name" value={state.cnam.displayName} />
          </ReviewCard>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="font-medium">What happens next</div>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
          <li>We register your business identity, then each capability, with the carriers.</li>
          <li>Most approvals take 1–7 business days. You'll get an email as each one updates.</li>
          <li>You can add numbers now — capabilities turn on automatically as approvals land.</li>
        </ul>
      </div>
    </div>
  )
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="font-medium">{title}</div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="px-4 py-3 space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <div className="w-36 shrink-0 text-muted-foreground">{label}</div>
      <div className="flex-1 font-medium">
        {value || <span className="text-muted-foreground italic">Not provided</span>}
      </div>
    </div>
  )
}
