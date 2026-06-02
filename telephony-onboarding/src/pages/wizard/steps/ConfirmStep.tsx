import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  missingRequiredFields,
  requiredBundleDocuments,
  showCnam,
  showMessaging,
  type WizardFormState,
} from '../wizardState'
import { BusinessInfoStep } from './BusinessInfoStep'
import { AuthorizedRepStep } from './AuthorizedRepStep'
import { MessagingStep } from './MessagingStep'
import { CnamStep } from './CnamStep'
import { DocumentsStep } from './DocumentsStep'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
  showIdentity: boolean
  aiActive: boolean
  onClearAi: () => void
  onUndoAi: () => void
  businessRejectionField?: string
  businessRejectionMessage?: string
  cnamRejectionField?: string
  cnamRejectionMessage?: string
}

// Maps each required field key to a label + the anchor the "needs you" callout
// links to. Most jump to their section; the two fields AI can't fill (EIN,
// representative title) get their own in-form anchors.
const FIELD_META: Record<string, { label: string; anchor: string }> = {
  legalName: { label: 'Legal business name', anchor: 'section-business' },
  registrationType: { label: 'Registration type', anchor: 'section-business' },
  registrationNumber: { label: 'Registration / EIN number', anchor: 'field-registrationNumber' },
  addressLine1: { label: 'Address', anchor: 'section-business' },
  city: { label: 'City', anchor: 'section-business' },
  postalCode: { label: 'Postal code', anchor: 'section-business' },
  country: { label: 'Country', anchor: 'section-business' },
  companyType: { label: 'Company type', anchor: 'section-business' },
  industry: { label: 'Industry', anchor: 'section-business' },
  firstName: { label: 'First name', anchor: 'section-rep' },
  lastName: { label: 'Last name', anchor: 'section-rep' },
  email: { label: 'Email', anchor: 'section-rep' },
  phone: { label: 'Phone', anchor: 'section-rep' },
  title: { label: 'Representative title', anchor: 'field-title' },
  privacyPolicyUrl: { label: 'Privacy policy URL', anchor: 'section-messaging' },
  termsOfServiceUrl: { label: 'Terms of service URL', anchor: 'section-messaging' },
  displayName: { label: 'Caller ID name', anchor: 'section-cnam' },
  doc_identity: { label: 'Proof of identity', anchor: 'section-documents' },
  doc_address: { label: 'Proof of address', anchor: 'section-documents' },
}

export function ConfirmStep({
  state,
  update,
  showIdentity,
  aiActive,
  onClearAi,
  onUndoAi,
  businessRejectionField,
  businessRejectionMessage,
  cnamRejectionField,
  cnamRejectionMessage,
}: Props) {
  const missing = missingRequiredFields(state, { needIdentity: showIdentity })
    .map((key) => ({ key, ...FIELD_META[key] }))
    .filter((m) => m.label)

  const showDocuments = showIdentity && requiredBundleDocuments(state).length > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company info</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Carriers require these details before they'll register your business for calling and
          texting. We filled in what we could — just check it over.
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            {aiActive ? (
              <span>
                Filled in by <span className="font-medium">Sienna</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                AI suggestions cleared — entering manually.
              </span>
            )}
          </div>
          {aiActive ? (
            <Button variant="ghost" size="sm" onClick={onClearAi} className="shrink-0">
              Clear
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onUndoAi} className="shrink-0">
              Undo
            </Button>
          )}
        </div>

        {aiActive && missing.length > 0 && (
          <div className="mt-3 border-t border-primary/20 pt-3">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {missing.length} {missing.length === 1 ? 'thing needs' : 'things need'} you
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((m) => (
                <span
                  key={m.key}
                  className="cursor-default rounded-full border border-amber-400/50 bg-background px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {showIdentity && (
          <Section
            id="section-business"
            title="Business information"
            help="Your registered legal entity, exactly as carriers will see it."
          >
            <BusinessInfoStep
              state={state}
              update={update}
              aiActive={aiActive}
              rejectionField={businessRejectionField}
              rejectionMessage={businessRejectionMessage}
            />
          </Section>
        )}

        {showIdentity && (
          <Section
            id="section-rep"
            title="Authorized representative"
            help="Someone who can confirm registration details if a carrier reaches out."
          >
            <AuthorizedRepStep state={state} update={update} aiActive={aiActive} />
          </Section>
        )}

        {showMessaging(state) && (
          <Section
            id="section-messaging"
            title="Text messaging"
            help="Consent and policy URLs US carriers require for A2P messaging."
          >
            <MessagingStep state={state} update={update} />
          </Section>
        )}

        {showCnam(state) && (
          <Section
            id="section-cnam"
            title="Caller ID name"
            help="The brand name shown on outbound calls. Max 15 characters."
          >
            <CnamStep
              state={state}
              update={update}
              rejectionField={cnamRejectionField}
              rejectionMessage={cnamRejectionMessage}
            />
          </Section>
        )}

        {showDocuments && (
          <Section
            id="section-documents"
            title="Supporting documents"
            help="We can't look these up — add them to verify your business with the carrier."
          >
            <DocumentsStep state={state} update={update} />
          </Section>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="font-medium">What happens next</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>We register your business identity, then each capability, with the carriers.</li>
          <li>Most approvals take 1–7 business days. You'll get an email as each one updates.</li>
          <li>You can add numbers now — capabilities turn on automatically as approvals land.</li>
        </ul>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  help,
  children,
}: {
  id: string
  title: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border bg-background">
      <div className="border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {help && <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}
