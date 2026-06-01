import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, AlertTriangle, CircleDashed, Plus, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanySwitcher } from '@/components/CompanySwitcher'
import { TwilioIcon } from '@/components/TwilioIcon'
import { ZeroState } from '@/components/ZeroState'
import { api } from '@/api/client'
import { useCapabilityViews, useRequirements } from '@/api/useApi'
import { useCompanyContext } from '@/state/CompanyContext'
import { StatusIcon } from '@/components/StatusIcon'
import { cn } from '@/lib/utils'
import {
  availableCapabilities,
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  SUPPORTED_COUNTRIES,
  identityRequirementType,
  isCapabilityFuture,
  type CapabilityAvailability,
  type CapabilityKind,
  type CapabilityView,
  type Company,
  type Requirement,
  type RequirementStatus,
  type RequirementType,
} from '@/types'

export function CapabilitiesPage() {
  const { currentCompany, loading: companyLoading } = useCompanyContext()
  const { capabilities, loading: capsLoading } = useCapabilityViews(currentCompany?.id)
  const { requirements, loading: reqsLoading } = useRequirements(currentCompany?.id)

  if (companyLoading || capsLoading || reqsLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>
  }

  if (!currentCompany) {
    return (
      <div>
        <TelephonyHeader showActions={false} />
        <ZeroState />
      </div>
    )
  }

  // BYO companies skip our regulatory layer entirely — registrations live in
  // the customer's own Twilio console.
  if (currentCompany.mode === 'byo') {
    return <ByoCapabilities company={currentCompany} />
  }

  const reqOf = (type: RequirementType) => requirements.find((r) => r.type === type)

  return (
    <div>
      <TelephonyHeader />

      <CompanyInfoCard company={currentCompany} requirements={requirements} />

      <div className="mt-6 space-y-3">
        {capabilities.map((cap) => (
          <CapabilityCard
            key={cap.kind}
            cap={cap}
            company={currentCompany}
            requirements={cap.requirementTypes.map(reqOf)}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Shared top row: page title + Source picker ──────────────────────── */

function TelephonyHeader({ showActions = true }: { showActions?: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
        <span className="text-muted-foreground">Settings</span>
        <span className="text-muted-foreground/50">/</span>
        <span>Telephony</span>
      </h1>
      {showActions && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/sources">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              See all sources
            </Link>
          </Button>
          <CompanySwitcher />
        </div>
      )}
    </div>
  )
}

/* ── BYO Twilio: regulatory layer lives in the customer's account ────── */

// For a BYO source the regulatory work lives in the customer's own Twilio
// account, so each capability links straight into the relevant Console section
// instead of carrying a verify/Set up flow.
const BYO_TWILIO_LINKS: Record<CapabilityKind, { label: string; url: string }> = {
  calling: { label: 'Voice', url: 'https://console.twilio.com/us1/develop/voice/manage' },
  texting: {
    label: 'A2P 10DLC',
    url: 'https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-10dlc',
  },
  branded_caller_id: {
    label: 'Trust Hub',
    url: 'https://console.twilio.com/us1/develop/trust-hub/overview',
  },
  caller_id_passthrough: {
    label: 'Phone Numbers',
    url: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming',
  },
  alphanumeric_sender_id: {
    label: 'Messaging Senders',
    url: 'https://console.twilio.com/us1/develop/sms/senders/alpha-sender',
  },
}

// We can read the connected Twilio account to detect what's already set up.
// (Mocked here — in reality this is a read against their account.)
const BYO_DETECTED: Partial<Record<CapabilityKind, boolean>> = {
  calling: true,
  texting: true,
  caller_id_passthrough: true,
  branded_caller_id: false,
}

function ByoCapabilities({ company }: { company: Company }) {
  const caps = availableCapabilities(company.country)
  return (
    <div>
      <TelephonyHeader />

      <Card>
        <div className="border-b px-5 py-4 text-sm font-medium">Company info</div>
        <div className="px-5 py-4">
          <div className="text-sm font-medium">{company.name}</div>
          <div className="mt-1.5 text-xs text-muted-foreground">BYO Twilio</div>
        </div>
      </Card>

      <div className="mt-6 rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Capabilities for a BYO source live in your own Twilio account — there's nothing to verify
        here. We detect what's already configured and link you straight to it in the Twilio Console.
      </div>

      <div className="mt-3 space-y-3">
        {caps.map((kind) => (
          <ByoCapabilityCard key={kind} kind={kind} />
        ))}
      </div>
    </div>
  )
}

function ByoCapabilityCard({ kind }: { kind: CapabilityKind }) {
  const link = BYO_TWILIO_LINKS[kind]
  const detected = BYO_DETECTED[kind]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{CAPABILITY_LABELS[kind]}</div>
          <div className="mt-1 text-sm text-muted-foreground">{CAPABILITY_DESCRIPTIONS[kind]}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ByoDetectedBadge detected={detected} />
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
          >
            <TwilioIcon className="h-3.5 w-3.5" />
            Open {link.label}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>
    </Card>
  )
}

function ByoDetectedBadge({ detected }: { detected?: boolean }) {
  if (detected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <Check className="h-3 w-3" />
        Configured
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <CircleDashed className="h-3 w-3" />
      Not detected
    </span>
  )
}

/* ── Company Info (the identity / foundation) ────────────────────────── */

function CompanyInfoCard({ company, requirements }: { company: Company; requirements: Requirement[] }) {
  const idType = identityRequirementType(company.country)
  const identity = requirements.find((r) => r.type === idType)

  return (
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="text-sm font-medium">Company info</div>
        {identity && <RequirementStatusBadge status={identity.status} />}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{company.name}</div>
            {company.mode === 'byo' && (
              <div className="mt-1.5 text-xs text-muted-foreground">BYO Twilio</div>
            )}
            {!identity && (
              <div className="mt-2 text-xs text-muted-foreground">
                Verify your business to unlock regulated capabilities.
              </div>
            )}
          </div>
          {identity ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/wizard/${identity.id}`}>
                {identity.status === 'rejected' ? 'Fix' : 'Edit'}
              </Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/wizard">Verify business</Link>
            </Button>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-muted-foreground">Countries</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {company.countries.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
              >
                <span>{COUNTRY_FLAGS[c]}</span>
                {COUNTRY_LABELS[c]}
              </span>
            ))}
            <AddCountryButton company={company} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function AddCountryButton({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const remaining = SUPPORTED_COUNTRIES.filter((c) => !company.countries.includes(c))
  if (remaining.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
      >
        <Plus className="h-3 w-3" />
        Add country
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
          {remaining.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                api.addCompanyCountry(company.id, c)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
            >
              <span>{COUNTRY_FLAGS[c]}</span>
              <span>{COUNTRY_LABELS[c]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Capability card ─────────────────────────────────────────────────── */

function CapabilityCard({
  cap,
  company,
  requirements,
}: {
  cap: CapabilityView
  company: Company
  requirements: (Requirement | undefined)[]
}) {
  const future = isCapabilityFuture(cap.kind, company.country)
  const rejected = requirements.find((r) => r?.status === 'rejected')

  return (
    <Card className={cn('overflow-hidden', future && 'opacity-70')}>
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-medium">
            {CAPABILITY_LABELS[cap.kind]}
            {future && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                Coming soon
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {CAPABILITY_DESCRIPTIONS[cap.kind]}
          </div>

          {rejected?.rejection && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <div className="font-medium">{rejected.rejection.message}</div>
              {rejected.rejection.explanation && (
                <div className="mt-1 text-xs text-destructive/80">{rejected.rejection.explanation}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {!future && <AvailabilityBadge availability={cap.availability} />}
          <CapabilityAction cap={cap} rejected={rejected} future={future} />
        </div>
      </div>
    </Card>
  )
}

function CapabilityAction({
  cap,
  rejected,
  future,
}: {
  cap: CapabilityView
  rejected?: Requirement
  future: boolean
}) {
  if (future) {
    return null
  }
  if (rejected) {
    return (
      <Button size="sm" asChild>
        <Link to={`/wizard/${rejected.id}`}>Fix</Link>
      </Button>
    )
  }
  if (cap.availability === 'not_started') {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to={`/wizard?capability=${cap.kind}`}>Set up</Link>
      </Button>
    )
  }
  return null
}

/* ── Badges & chips ──────────────────────────────────────────────────── */

function AvailabilityBadge({ availability }: { availability: CapabilityAvailability }) {
  const map: Record<CapabilityAvailability, { label: string; cls: string; icon: React.ReactNode }> = {
    available: {
      label: 'Available',
      cls: 'border-success/30 bg-success/10 text-success',
      icon: <Check className="h-3 w-3" />,
    },
    pending: {
      label: 'In progress',
      cls: 'border-warning/30 bg-warning/10 text-warning',
      icon: <Clock className="h-3 w-3" />,
    },
    action_needed: {
      label: 'Action needed',
      cls: 'border-destructive/30 bg-destructive/10 text-destructive',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    not_started: {
      label: 'Not set up',
      cls: 'border-border bg-muted text-muted-foreground',
      icon: <CircleDashed className="h-3 w-3" />,
    },
  }
  const { label, cls, icon } = map[availability]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', cls)}>
      {icon}
      {label}
    </span>
  )
}

function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const label: Record<RequirementStatus, string> = {
    approved: 'Verified',
    in_review: 'In review',
    waiting: 'Waiting',
    draft: 'Draft',
    rejected: 'Rejected',
    error: 'Error',
    not_started: 'Not started',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <StatusIcon status={status} className="h-4 w-4" />
      <span className="text-muted-foreground">{label[status]}</span>
    </span>
  )
}
