import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  SUPPORTED_COUNTRIES,
  allCapabilitiesForCountries,
  availableCapabilities,
  capabilityCountries,
  isCapabilityFuture,
  requirementsForCapability,
  requiresBundle,
  type CapabilityKind,
  type CountryCode,
} from '@/types'

// Capabilities surfaced in the wizard (passthrough + sender ID aren't shown).
const WIZARD_CAPABILITIES: CapabilityKind[] = ['calling', 'texting', 'branded_caller_id']
import { cn } from '@/lib/utils'
import type { WizardFormState } from '../wizardState'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
  lockCountry?: boolean
}

// The non-future capabilities turned on by default for a set of countries.
function defaultCapabilities(countries: CountryCode[]): CapabilityKind[] {
  const union = new Set<CapabilityKind>()
  for (const c of countries) {
    for (const k of availableCapabilities(c)) {
      if (WIZARD_CAPABILITIES.includes(k) && !isCapabilityFuture(k, c)) union.add(k)
    }
  }
  union.add('calling') // always on
  return Array.from(union)
}

export function ChannelsStep({ state, update, lockCountry }: Props) {
  const countries = state.countries
  const caps = allCapabilitiesForCountries(countries).filter((k) =>
    WIZARD_CAPABILITIES.includes(k)
  )

  // Coming-soon if it's future for every country it could apply to.
  const futureFor = (kind: CapabilityKind) => {
    const applicable = capabilityCountries(kind, countries)
    return applicable.length === 0 || applicable.every((c) => isCapabilityFuture(kind, c))
  }

  // The countries (among the company's) where a capability needs carrier
  // paperwork — drives the "Required for: 🇺🇸" flags.
  const requiredFor = (kind: CapabilityKind) =>
    countries.filter((c) => requirementsForCapability(kind, c).length > 0)

  // Number provisioning rides on the regulatory bundle, required in non-US
  // bundle countries (e.g. UK).
  const provisioningCountries = countries.filter((c) => requiresBundle(c))

  const toggle = (kind: CapabilityKind) => {
    if (kind === 'calling' || futureFor(kind)) return // always-on / unavailable
    const has = state.capabilities.includes(kind)
    update({
      capabilities: has
        ? state.capabilities.filter((c) => c !== kind)
        : [...state.capabilities, kind],
    })
  }

  const onCountriesChange = (next: CountryCode[]) => {
    const primary = next[0] ?? 'US'
    update({
      countries: next,
      country: primary,
      capabilities: defaultCapabilities(next),
      business: { ...state.business, country: primary },
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Where are your contacts located?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This determines which carrier requirements apply. You can add more countries later.
      </p>

      <div className="mt-6">
        {lockCountry ? (
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-sm"
              >
                <span>{COUNTRY_FLAGS[c]}</span>
                {COUNTRY_LABELS[c]}
              </span>
            ))}
          </div>
        ) : (
          <CountryMultiSelect selected={countries} onChange={onCountriesChange} />
        )}
      </div>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Capabilities</h1>

      <div className="mt-6 space-y-2">
        {provisioningCountries.length > 0 && (
          <CapabilityRow
            label="Number provisioning"
            description="We acquire and manage phone numbers for your agents."
            checked
            disabled
            requiredFor={provisioningCountries}
          />
        )}

        {caps.map((kind) => {
          const future = futureFor(kind)
          const forCountries = future ? [] : requiredFor(kind)
          // Hide rows that aren't required in any of the chosen countries.
          if (forCountries.length === 0) return null
          const alwaysOn = kind === 'calling' && !future
          const checked = alwaysOn || (state.capabilities.includes(kind) && !future)
          return (
            <CapabilityRow
              key={kind}
              label={CAPABILITY_LABELS[kind]}
              description={CAPABILITY_DESCRIPTIONS[kind]}
              checked={checked}
              disabled={future || alwaysOn}
              future={future}
              requiredFor={forCountries}
              onToggle={() => toggle(kind)}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Country multi-select ────────────────────────────────────────────── */

function CountryMultiSelect({
  selected,
  onChange,
}: {
  selected: CountryCode[]
  onChange: (next: CountryCode[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = (c: CountryCode) => {
    const has = selected.includes(c)
    // Never let the set go empty — keep at least one country.
    if (has && selected.length === 1) return
    onChange(has ? selected.filter((x) => x !== c) : [...selected, c])
  }

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <Label className="text-sm font-medium">Countries</Label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select countries</span>
          ) : (
            selected.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
              >
                <span>{COUNTRY_FLAGS[c]}</span>
                {COUNTRY_LABELS[c]}
              </span>
            ))
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {SUPPORTED_COUNTRIES.map((c) => {
            const checked = selected.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span>{COUNTRY_FLAGS[c]}</span>
                <span className="flex-1">{COUNTRY_LABELS[c]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Capability row ──────────────────────────────────────────────────── */

function CapabilityRow({
  label,
  description,
  checked,
  disabled,
  future,
  requiredFor,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  future?: boolean
  requiredFor: CountryCode[]
  onToggle?: () => void
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-background p-3 transition-colors',
        future
          ? 'cursor-not-allowed opacity-60'
          : disabled
            ? 'cursor-default'
            : 'cursor-pointer hover:border-primary/40'
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={() => onToggle?.()}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          {label}
          {future && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Coming soon
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
        {requiredFor.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Required for:</span>
            <span className="flex gap-1">
              {requiredFor.map((c) => (
                <span key={c} title={COUNTRY_LABELS[c]}>
                  {COUNTRY_FLAGS[c]}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </label>
  )
}
