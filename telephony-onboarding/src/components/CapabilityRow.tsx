import { Link } from 'react-router-dom'
import { Button } from './ui/button'
import { StatusIcon } from './StatusIcon'
import {
  CAPABILITY_LABELS,
  CAPABILITY_DESCRIPTIONS,
  COUNTRY_FLAGS,
  isSupportOnly,
  type Capability,
  type CapabilityType,
} from '@/types'
import { formatDate } from '@/lib/utils'
import { Mail } from 'lucide-react'

interface RowProps {
  capability: Capability
  onAssign: (c: Capability) => void
}

export function CapabilityRow({ capability, onAssign }: RowProps) {
  const label = CAPABILITY_LABELS[capability.type]
  const country = capability.countries[0]
  const subline = getSubline(capability)

  return (
    <div className="flex items-start gap-4 border-b px-5 py-4 last:border-0 hover:bg-muted/40 transition-colors">
      <div className="pt-0.5">
        <StatusIcon status={capability.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-medium">
          {label}
          {country && <span className="text-base leading-none">{COUNTRY_FLAGS[country]}</span>}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{subline}</div>
        {capability.rejection && (
          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <div className="font-medium">Rejection: {capability.rejection.message}</div>
            {capability.rejection.explanation && (
              <div className="mt-1 text-destructive/80 text-xs">{capability.rejection.explanation}</div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {capability.status === 'approved' && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onAssign(capability)}
          >
            {capability.autoAssign
              ? '✓ Auto assign'
              : `${capability.assignedNumberIds.length} numbers assigned`}
          </button>
        )}
        <PrimaryAction capability={capability} />
      </div>
    </div>
  )
}

interface NotConfiguredRowProps {
  type: CapabilityType
  supportOnly?: boolean
  future?: boolean
}

export function CapabilityRowNotConfigured({ type, supportOnly, future }: NotConfiguredRowProps) {
  const label = CAPABILITY_LABELS[type]
  const desc = CAPABILITY_DESCRIPTIONS[type]
  return (
    <div className="flex items-start gap-4 border-b px-5 py-4 last:border-0">
      <div className="pt-0.5">
        <StatusIcon status="not_configured" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-medium text-muted-foreground">
          {label}
          {future && (
            <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5">
              Coming soon
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
      <div className="pt-0.5">
        {supportOnly ? (
          <Button variant="outline" size="sm" disabled>
            <Mail className="h-3.5 w-3.5" />
            Contact support
          </Button>
        ) : future ? (
          <Button variant="ghost" size="sm" disabled>
            Notify me
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/wizard?add=${type}`}>Add</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function PrimaryAction({ capability }: { capability: Capability }) {
  if (isSupportOnly(capability.type)) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Mail className="h-3.5 w-3.5" />
        Contact support
      </Button>
    )
  }
  if (capability.status === 'rejected') {
    return (
      <Button variant="default" size="sm" asChild>
        <Link to={`/wizard/${capability.id}`}>Fix</Link>
      </Button>
    )
  }
  if (capability.status === 'draft') {
    return (
      <Button variant="default" size="sm" asChild>
        <Link to={`/wizard/${capability.id}`}>Continue</Link>
      </Button>
    )
  }
  if (capability.status === 'error') {
    return (
      <Button variant="outline" size="sm">
        Retry
      </Button>
    )
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to={`/wizard/${capability.id}`}>Edit</Link>
    </Button>
  )
}

function getSubline(c: Capability): string {
  const date = formatDate(c.updatedAt)
  switch (c.status) {
    case 'approved':
      return `Approved ${date}`
    case 'rejected':
      return `Rejected ${date}`
    case 'in_review':
      return `Submitted ${date} · In review · Usually 2–3 business days`
    case 'waiting':
      return `Waiting on dependency`
    case 'draft':
      return `Draft saved ${date}`
    case 'error':
      return `Error · ${date}`
    case 'not_configured':
      return ''
  }
}
