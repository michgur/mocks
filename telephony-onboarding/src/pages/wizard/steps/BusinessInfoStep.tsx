import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WizardFormState } from '../wizardState'
import type { BusinessProfileData, CountryCode } from '@/types'
import { COUNTRY_LABELS, SUPPORTED_COUNTRIES } from '@/types'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
  focusedField?: string
  rejectionField?: string
  rejectionMessage?: string
}

export function BusinessInfoStep({ state, update, focusedField, rejectionField, rejectionMessage }: Props) {
  const set = (patch: Partial<BusinessProfileData>) =>
    update({ business: { ...state.business, ...patch } })

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Business information</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Carrier registration requires details about your registered business entity.
      </p>

      {rejectionMessage && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <div className="font-medium text-destructive">Rejected by carrier</div>
          <div className="mt-1 text-destructive/90">{rejectionMessage}</div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <Field
          label="Legal business name"
          hint="Exact name as it appears on official registration documents"
          autoFocus={focusedField === 'legalName'}
          highlighted={rejectionField === 'legalName'}
        >
          <Input
            value={state.business.legalName ?? ''}
            onChange={(e) => set({ legalName: e.target.value })}
            placeholder="Acme Inc."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration type" highlighted={rejectionField === 'registrationType'}>
            <Select
              value={state.business.registrationType ?? ''}
              onValueChange={(v) => set({ registrationType: v as BusinessProfileData['registrationType'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EIN">EIN</SelectItem>
                <SelectItem value="DUNS">DUNS</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Registration number" highlighted={rejectionField === 'registrationNumber'}>
            <Input
              value={state.business.registrationNumber ?? ''}
              onChange={(e) => set({ registrationNumber: e.target.value })}
              placeholder="12-3456789"
            />
          </Field>
        </div>

        <Field label="Address line 1">
          <Input
            value={state.business.addressLine1 ?? ''}
            onChange={(e) => set({ addressLine1: e.target.value })}
            placeholder="123 Market St"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <Input
              value={state.business.city ?? ''}
              onChange={(e) => set({ city: e.target.value })}
              placeholder="San Francisco"
            />
          </Field>
          <Field label="State / region">
            <Input
              value={state.business.state ?? ''}
              onChange={(e) => set({ state: e.target.value })}
              placeholder="CA"
            />
          </Field>
          <Field label="Postal code">
            <Input
              value={state.business.postalCode ?? ''}
              onChange={(e) => set({ postalCode: e.target.value })}
              placeholder="94103"
            />
          </Field>
        </div>

        <Field label="Country">
          <Select
            value={state.business.country ?? ''}
            onValueChange={(v) => set({ country: v as CountryCode })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company type">
            <Select
              value={state.business.companyType ?? ''}
              onValueChange={(v) => set({ companyType: v as BusinessProfileData['companyType'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LLC">LLC</SelectItem>
                <SelectItem value="Corporation">Corporation</SelectItem>
                <SelectItem value="Non-profit">Non-profit</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Industry">
            <Select
              value={state.business.industry ?? ''}
              onValueChange={(v) => set({ industry: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Financial Services">Financial Services</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Website">
          <Input
            value={state.business.website ?? ''}
            onChange={(e) => set({ website: e.target.value })}
            placeholder="https://acme.example"
          />
        </Field>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
  autoFocus,
  highlighted,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  autoFocus?: boolean
  highlighted?: boolean
}) {
  return (
    <div
      className={highlighted ? 'rounded-md ring-2 ring-destructive/40 ring-offset-2 ring-offset-background -m-1 p-1' : ''}
      ref={(el) => {
        if (autoFocus && el) {
          const input = el.querySelector<HTMLInputElement>('input, [role="combobox"]')
          input?.focus()
        }
      }}
    >
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
