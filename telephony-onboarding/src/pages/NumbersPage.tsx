import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Info, Link2, Loader2, Phone, Plus, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/api/client'
import { useAgents, useConnections, useNumbers, useProvisions, useRequirements } from '@/api/useApi'
import { useCompanyContext } from '@/state/CompanyContext'
import { CompanySwitcher } from '@/components/CompanySwitcher'
import { GeoPicker, type GeoSelection } from '@/components/GeoPicker'
import { ImportNumbersModal } from '@/components/ImportNumbersModal'
import { ZeroState } from '@/components/ZeroState'
import {
  COUNTRY_LABELS,
  SUPPORTED_COUNTRIES,
  formatUsd,
  identityRequirementType,
  numberMonthlyPrice,
  type Agent,
  type Company,
  type CountryCode,
  type PhoneNumber,
  type Provision,
  type Requirement,
} from '@/types'

// A country is verified once its foundation (US → identity, others →
// country_bundle) is approved — that's what gates real provisioning.
function isCountryVerified(country: CountryCode, requirements: Requirement[]): boolean {
  const t = identityRequirementType(country)
  return requirements.some((r) => r.type === t && r.status === 'approved')
}

// Before any company exists nothing is verified, so the roster modal always
// runs in reserve mode and routes into onboarding on submit.
const NO_VERIFIED_COUNTRIES = new Set<CountryCode>()

export function NumbersPage() {
  const { currentCompany, setCurrentCompanyId, loading: companyLoading } = useCompanyContext()
  const { agents, loading: agentsLoading } = useAgents(currentCompany?.id)
  const [zeroAddOpen, setZeroAddOpen] = useState(false)

  if (companyLoading || agentsLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>
  }

  // We fake being inside a single agent's detail screen.
  const agent = agents[0]
  if (!agent) {
    return <div className="py-12 text-center text-muted-foreground">No agents yet.</div>
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {agent.name.slice(0, 2).toUpperCase()}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
      </div>

      <AgentTabs />

      {currentCompany ? (
        <AgentDetail key={agent.id} agent={agent} company={currentCompany} />
      ) : (
        <>
          <ZeroState onGetStarted={() => setZeroAddOpen(true)} />
          <AddNumbersModal
            open={zeroAddOpen}
            onOpenChange={setZeroAddOpen}
            agent={agent}
            verifiedCountries={NO_VERIFIED_COUNTRIES}
            firstRun
            onCompanyCreated={setCurrentCompanyId}
          />
        </>
      )}
    </div>
  )
}

/* ── Agent sub-navigation (faked — only Phone numbers is wired up) ────── */

const AGENT_TABS = ['Overview', 'Phone numbers', 'Prompt', 'Voice', 'Actions', 'Analytics']

function AgentTabs() {
  return (
    <div className="mb-6 border-b">
      <div className="flex items-center gap-6 text-sm">
        {AGENT_TABS.map((tab) => {
          const active = tab === 'Phone numbers'
          return (
            <div
              key={tab}
              className={cn(
                '-mb-px border-b-2 py-2.5 font-medium transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'cursor-default border-transparent text-muted-foreground'
              )}
            >
              {tab}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Agent detail ────────────────────────────────────────────────────── */

function AgentDetail({ agent, company }: { agent: Agent; company: Company }) {
  const navigate = useNavigate()
  const { numbers } = useNumbers(agent.id)
  const { provisions } = useProvisions(agent.id)
  const { requirements } = useRequirements(agent.companyId)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)

  const byo = company.mode === 'byo'

  const verifiedCountries = useMemo(
    () => new Set(SUPPORTED_COUNTRIES.filter((c) => isCountryVerified(c, requirements))),
    [requirements]
  )

  // Managed company with any country not yet verified (e.g. the user skipped to
  // grab US numbers). The modal stays quiet after the zero state, but the Phone
  // numbers tab keeps nudging them to verify — calling works, texting/CNAM don't.
  const unverified = !byo && company.countries.some((c) => !verifiedCountries.has(c))

  // Verification submitted but not yet approved — the foundation requirement is
  // in review (or waiting on a prerequisite). We show a status banner instead of
  // nudging the user to start verification they've already started.
  const inReview = useMemo(
    () =>
      !byo &&
      company.countries.some((c) => {
        const t = identityRequirementType(c)
        return requirements.some(
          (r) => r.type === t && (r.status === 'in_review' || r.status === 'waiting')
        )
      }),
    [byo, company.countries, requirements]
  )

  return (
    <div className="space-y-3">
      {unverified &&
        (inReview ? (
            <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 px-5 py-3.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Verifying your business</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  We're reviewing your details with carriers. Calls work now; texting and caller ID
                  turn on once you're approved.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigate('/capabilities')}
              >
                View status
              </Button>
            </Card>
          ) : (
            <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 px-5 py-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Your business isn't verified yet</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Calls work now but may be flagged as spam. Texting and caller ID stay off until
                  your business is verified.
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => navigate('/wizard?return=/numbers')}
              >
                Verify business
              </Button>
            </Card>
          ))}
      {provisions.map((p) => (
        <ProvisionRow key={p.id} provision={p} />
      ))}
      {byo && <TwilioAccountCard companyId={company.id} />}
      <NumbersTable
        numbers={numbers}
        byo={byo}
        agent={agent}
        onAddClick={() => (byo ? setImportOpen(true) : setAddOpen(true))}
        onReleaseClick={(n) => setReleaseTarget(n)}
      />

      {byo ? (
        <ImportNumbersModal
          open={importOpen}
          onOpenChange={setImportOpen}
          agent={agent}
          companyId={company.id}
        />
      ) : (
        <AddNumbersModal
          open={addOpen}
          onOpenChange={setAddOpen}
          agent={agent}
          verifiedCountries={verifiedCountries}
        />
      )}
      <ReleaseNumberModal
        number={releaseTarget}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null)
        }}
      />
    </div>
  )
}

/* ── BYO Twilio account info ──────────────────────────────────────────── */

function TwilioAccountCard({ companyId }: { companyId: string }) {
  const { connections } = useConnections(companyId)
  const accountSid = connections[0]?.accountSid
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Link2 className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          Twilio account
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            BYO
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Numbers and registrations are managed in your own Twilio account.
        </div>
        {accountSid && (
          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{accountSid}</div>
        )}
      </div>
    </Card>
  )
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  const [on, setOn] = useState(checked)
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch
        checked={disabled ? false : on}
        disabled={disabled}
        onCheckedChange={(v) => {
          setOn(v)
          onChange(v)
        }}
      />
    </div>
  )
}

/* ── Provision (in-flight) row ───────────────────────────────────────── */

function ProvisionRow({ provision }: { provision: Provision }) {
  const waiting = provision.status === 'waiting_on_verification'
  const total = provision.spec.count
  const acquired = provision.acquiredNumberIds.length
  const pct = total > 0 ? Math.round((acquired / total) * 100) : 0
  const geo = provision.spec.region
    ? `${provision.spec.country ?? 'US'} • ${provision.spec.region}`
    : COUNTRY_LABELS[provision.spec.country ?? 'US']
  const showProgress = !waiting && total > 1

  return (
    <Card className="border-warning/30 bg-warning/5 px-5 py-3 text-sm">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-warning" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              Acquiring {total} {total === 1 ? 'number' : 'numbers'}
              {geo && ` · ${geo}`}
            </span>
            {showProgress && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {acquired} of {total}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {waiting
              ? 'Waiting on verification — resolves automatically once your business is verified.'
              : 'Scanning candidates for spam reputation…'}
          </div>
          {showProgress && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-warning/15">
              <div
                className="h-full rounded-full bg-warning transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ── Numbers table ───────────────────────────────────────────────────── */

function NumbersTable({
  numbers,
  byo,
  agent,
  onAddClick,
  onReleaseClick,
}: {
  numbers: PhoneNumber[]
  byo: boolean
  agent: Agent
  onAddClick: () => void
  onReleaseClick: (n: PhoneNumber) => void
}) {
  const addLabel = byo ? 'Import numbers' : 'Add numbers'
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="font-medium">Numbers</div>
          <CompanySwitcher />
        </div>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      {numbers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="max-w-xs text-sm text-muted-foreground">
            {byo
              ? 'No numbers yet. Click "Import numbers" to link some from your Twilio account.'
              : 'No numbers yet. Click "Add numbers" to acquire some.'}
          </div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">Number</th>
              <th className="px-5 py-2.5 text-left font-semibold">Region</th>
              <th className="px-5 py-2.5 text-left font-semibold">Health</th>
              <th className="px-5 py-2.5 text-left font-semibold">Calls (30d)</th>
              <th className="px-5 py-2.5 text-left font-semibold">Cost</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n) => (
              <tr key={n.id} className="border-b last:border-b-0">
                <td className="px-5 py-3 font-mono text-foreground">
                  {n.number}
                  {n.source === 'byo' && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      BYO
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {n.country}
                  {n.region && ` · ${n.region}`}
                </td>
                <td className="px-5 py-3">
                  <HealthCell number={n} />
                </td>
                <td className="px-5 py-3 text-muted-foreground">{n.callsLast30d.toLocaleString()}</td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                  {n.source === 'byo' ? (
                    <span className="text-xs">Billed by Twilio</span>
                  ) : (
                    `${formatUsd(numberMonthlyPrice(n.country))}/mo`
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onReleaseClick(n)}>
                    Release
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="border-t">
        <SettingRow
          label="Auto-rotate"
          hint={
            byo
              ? 'Unavailable for BYO numbers — replacements would be bought on your behalf.'
              : 'Replace spam-labeled numbers automatically with healthy ones in the same region.'
          }
          checked={byo ? false : agent.autoRotate}
          disabled={byo}
          onChange={(v) => api.updateAgent(agent.id, { autoRotate: v })}
        />
      </div>
    </Card>
  )
}

function HealthCell({ number }: { number: PhoneNumber }) {
  if (number.spamScreenshotUrl) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Spam labeled
        <SpamEvidence url={number.spamScreenshotUrl} />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Good
    </span>
  )
}

// (i) icon; hovering loads the carrier spam screenshot.
function SpamEvidence({ url }: { url: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 cursor-help text-destructive" />
      <span className="pointer-events-none absolute left-1/2 top-6 z-50 hidden -translate-x-1/2 group-hover:block">
        <span className="block rounded-md border bg-popover p-1.5 shadow-lg">
          <img src={url} alt="Carrier spam label screenshot" className="h-64 w-auto rounded" />
          <span className="mt-1 block text-center text-[10px] text-muted-foreground">
            Detected by calling from multiple carriers
          </span>
        </span>
      </span>
    </span>
  )
}


/* ── Add numbers modal ───────────────────────────────────────────────── */

function AddNumbersModal({
  open,
  onOpenChange,
  agent,
  verifiedCountries,
  firstRun,
  onCompanyCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  agent: Agent
  verifiedCountries: Set<CountryCode>
  // Zero state: no company exists yet, so US-only picks can skip straight into
  // an unverified company instead of being forced through onboarding.
  firstRun?: boolean
  onCompanyCreated?: (id: string) => void
}) {
  const navigate = useNavigate()
  const [selections, setSelections] = useState<GeoSelection[]>([])
  const [submitting, setSubmitting] = useState(false)

  const total = selections.reduce((sum, s) => sum + s.count, 0)
  const noun = total === 1 ? 'number' : 'numbers'

  // Non-US bundle countries are a hard provisioning gate; US numbers are not.
  const hasUnverifiedNonUs =
    total > 0 && selections.some((s) => s.geo.country !== 'US' && !verifiedCountries.has(s.geo.country))
  const usOnly = total > 0 && selections.every((s) => s.geo.country === 'US')
  const usOnlyUnverified = usOnly && !selections.every((s) => verifiedCountries.has(s.geo.country))

  // Zero state + US-only: offer a skip (add now, unverified) beside Verify.
  const canSkip = !!firstRun && usOnlyUnverified
  // A non-US unverified region forces verification first (the bundle is required).
  const mustVerify = hasUnverifiedNonUs
  // Everything else (verified, or US-only after the first run) just adds directly —
  // the user already made their choice; don't nag them about verification again.

  const run = async (mode: 'add' | 'skip' | 'verify') => {
    setSubmitting(true)
    try {
      const countries = Array.from(new Set(selections.map((s) => s.geo.country)))

      if (mode === 'skip') {
        // Stand up an unverified US company, attach the numbers to its default
        // agent, and switch into it. Calling works; texting/caller ID stay off.
        const created = await api.createCompany({
          name: 'New company',
          country: 'US',
          countries: ['US'],
        })
        const ags = await api.listAgents(created.id)
        const target = ags[0] ?? agent
        for (const { geo, count } of selections) {
          await api.addNumbers(target.id, { count, country: geo.country, region: geo.region })
        }
        setSelections([])
        onOpenChange(false)
        onCompanyCreated?.(created.id)
        return
      }

      if (mode === 'verify') {
        // Reserve the picked numbers against the company, then route into
        // onboarding. In the zero state there's no company yet, so stand one up
        // first: US numbers are issued pre-verification and should show up right
        // away instead of being dropped on the way into the wizard.
        let target = agent
        if (firstRun) {
          const primary = countries.includes('US') ? 'US' : countries[0]
          const created = await api.createCompany({ name: 'New company', country: primary, countries })
          const ags = await api.listAgents(created.id)
          target = ags[0] ?? agent
          onCompanyCreated?.(created.id)
        }
        for (const { geo, count } of selections) {
          await api.addNumbers(target.id, { count, country: geo.country, region: geo.region })
        }
        setSelections([])
        onOpenChange(false)
        navigate(`/wizard?countries=${countries.join(',')}&return=/numbers`)
        return
      }

      // mode === 'add'
      for (const { geo, count } of selections) {
        await api.addNumbers(agent.id, { count, country: geo.country, region: geo.region })
      }
      setSelections([])
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add numbers</DialogTitle>
          <DialogDescription>
            Acquire numbers for <strong>{agent.name}</strong>. We'll scan for spam reputation and
            only acquire healthy ones. Capabilities attach automatically.
          </DialogDescription>
        </DialogHeader>

        <GeoPicker value={selections} onChange={setSelections} />

        {mustVerify && (
          <div className="flex gap-2.5 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Carriers require a verified business before issuing numbers outside the US. We'll hold
              this request and start acquiring the moment you're verified — next we'll collect the
              business details needed to get you approved.
            </span>
          </div>
        )}

        {canSkip && (
          <div className="flex gap-2.5 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              US numbers are available right away. Calls will work, but may be flagged as spam, and
              texting and caller ID stay off until you verify your business. You can verify anytime.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          {canSkip ? (
            <>
              <Button variant="ghost" onClick={() => run('skip')} disabled={submitting}>
                {submitting ? 'Adding…' : `Skip & add ${total} ${noun}`}
              </Button>
              <Button onClick={() => run('verify')} disabled={submitting}>
                Verify business
              </Button>
            </>
          ) : mustVerify ? (
            <Button onClick={() => run('verify')} disabled={submitting || total === 0}>
              {submitting ? 'Reserving…' : 'Verify business'}
            </Button>
          ) : (
            <Button onClick={() => run('add')} disabled={submitting || total === 0}>
              {submitting ? 'Adding…' : `Add ${total} ${noun}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Release modal ───────────────────────────────────────────────────── */

function ReleaseNumberModal({
  number,
  onOpenChange,
}: {
  number: PhoneNumber | null
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = useState(false)

  if (!number) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    )
  }

  const isByo = number.source === 'byo'

  const release = async (replace: boolean) => {
    setBusy(true)
    try {
      await api.releaseNumber(number.id, replace)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!number} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isByo ? 'Unlink' : 'Release'} <span className="font-mono">{number.number}</span>?
          </DialogTitle>
          <DialogDescription>
            {isByo
              ? 'This number is on your own Twilio account. We\'ll stop using it — it stays in your account.'
              : 'Choose whether to keep this agent\'s capacity stable.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {number.country}
            {number.region && ` · ${number.region}`}
          </span>
          {' · '}
          {number.callsLast30d.toLocaleString()} calls in last 30 days
        </div>

        {isByo ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => release(false)} disabled={busy}>
              {busy ? 'Unlinking…' : 'Unlink'}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="!justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => release(false)} disabled={busy}>
                Release &amp; shrink
              </Button>
              <Button onClick={() => release(true)} disabled={busy}>
                <RefreshCw className="h-3.5 w-3.5" />
                {busy ? 'Working…' : 'Release &amp; replace'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
