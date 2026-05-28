import { Button } from '@/components/ui/button'
import {
  CAPABILITY_LABELS,
  COUNTRY_LABELS,
  type CapabilityType,
} from '@/types'
import { compositionCountries, derivePlannedCapabilities, type WizardFormState, type WizardStepId } from '../wizardState'

interface Props {
  state: WizardFormState
  goToStep: (s: WizardStepId) => void
}

export function ReviewStep({ state, goToStep }: Props) {
  const planned = derivePlannedCapabilities(state)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Review &amp; submit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirm your details before we send them to carriers for approval.
      </p>

      <div className="mt-6 space-y-3">
        <ReviewCard title="Capabilities" onEdit={() => goToStep('requirements')}>
          <ul className="space-y-1">
            {planned.map((t) => (
              <li key={t} className="text-sm">
                <span className="font-medium">{CAPABILITY_LABELS[t]}</span>
                {pluralCountriesForType(t, state) && (
                  <span className="text-muted-foreground"> · {pluralCountriesForType(t, state)}</span>
                )}
              </li>
            ))}
          </ul>
        </ReviewCard>

        {needsStep(planned, ['business_profile', 'cnam', 'a2p_messaging', 'stir_shaken', 'country_bundle']) && (
          <ReviewCard title="Business information" onEdit={() => goToStep('business')}>
            <Row label="Legal name" value={state.business.legalName} />
            <Row label="Registration" value={`${state.business.registrationType ?? ''} ${state.business.registrationNumber ?? ''}`.trim()} />
            <Row
              label="Address"
              value={[
                state.business.addressLine1,
                [state.business.city, state.business.state, state.business.postalCode].filter(Boolean).join(', '),
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

        {needsStep(planned, ['business_profile', 'country_bundle']) && (
          <ReviewCard title="Authorized representative" onEdit={() => goToStep('representative')}>
            <Row label="Name" value={`${state.representative.firstName ?? ''} ${state.representative.lastName ?? ''}`.trim()} />
            <Row label="Email" value={state.representative.email} />
            <Row label="Phone" value={state.representative.phone} />
            <Row label="Title" value={state.representative.title} />
          </ReviewCard>
        )}

        {planned.includes('a2p_messaging') && (
          <ReviewCard title="Messaging" onEdit={() => goToStep('messaging')}>
            <Row label="Privacy policy" value={state.messaging.privacyPolicyUrl} />
            <Row label="Terms of service" value={state.messaging.termsOfServiceUrl} />
          </ReviewCard>
        )}

        {planned.includes('cnam') && (
          <ReviewCard title="Caller ID name" onEdit={() => goToStep('cnam')}>
            <Row label="Display name" value={state.cnam.displayName} />
          </ReviewCard>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="font-medium">What happens next</div>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
          <li>We submit your registrations to carriers and Twilio.</li>
          <li>Most approvals take 1–7 business days. You'll get an email when each one updates.</li>
          <li>You can buy numbers now — approved capabilities auto-assign as they come in.</li>
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
      <div className="flex-1 font-medium">{value || <span className="text-muted-foreground italic">Not provided</span>}</div>
    </div>
  )
}

function needsStep(planned: CapabilityType[], any: CapabilityType[]) {
  return any.some((t) => planned.includes(t))
}

function pluralCountriesForType(t: CapabilityType, s: WizardFormState): string {
  if (t === 'country_bundle') {
    return compositionCountries(s.composition)
      .filter((c) => c !== 'US' && c !== 'IL')
      .map((c) => COUNTRY_LABELS[c])
      .join(', ')
  }
  if (t === 'cnam' || t === 'a2p_messaging' || t === 'stir_shaken') return 'United States'
  return ''
}
