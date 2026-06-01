import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronRight, Plus, Waypoints } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ConnectTwilioModal } from '@/components/ConnectTwilioModal'
import { useCompanyContext } from '@/state/CompanyContext'
import { cn } from '@/lib/utils'
import { COUNTRY_FLAGS, type Company } from '@/types'

export function SourcesPage() {
  const { companies, currentCompany, setCurrentCompanyId, loading } = useCompanyContext()
  const [connectOpen, setConnectOpen] = useState(false)
  const navigate = useNavigate()

  const select = (id: string) => {
    setCurrentCompanyId(id)
    navigate('/capabilities')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every place your agents' numbers come from — managed registrations and connected providers.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => (
            <SourceRow
              key={c.id}
              company={c}
              current={currentCompany?.id === c.id}
              onSelect={() => select(c.id)}
            />
          ))}
        </div>
      )}

      <Card className="mt-6">
        <div className="border-b px-5 py-3 text-sm font-medium">Add a source</div>
        <div className="divide-y">
          <AddRow
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
            label="Register company"
            hint="Verify a legal entity through Harmony managed telephony"
            onClick={() => navigate('/wizard?new_company=1')}
          />
          <AddRow
            icon={<img src="/twilio.svg" alt="" className="h-4 w-4" />}
            label="BYO Twilio"
            hint="Connect your own Twilio account and import its numbers"
            onClick={() => setConnectOpen(true)}
          />
          <AddRow
            icon={<Waypoints className="h-4 w-4 text-muted-foreground" />}
            label="SIP Trunking"
            hint="Connect your own carrier or PBX over a SIP trunk"
            onClick={() => {
              /* SIP trunking flow — not built yet */
            }}
          />
        </div>
      </Card>

      <ConnectTwilioModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}

function SourceRow({
  company,
  current,
  onSelect,
}: {
  company: Company
  current: boolean
  onSelect: () => void
}) {
  const isByo = company.mode === 'byo'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent',
        current && 'border-primary/40 ring-1 ring-primary/20'
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
        {isByo ? (
          <img src="/twilio.svg" alt="" className="h-4 w-4" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium">
          <span className="truncate">{company.name}</span>
          {current && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Check className="h-2.5 w-2.5" />
              Current
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isByo ? 'BYO Twilio' : 'Managed'}</span>
          <span>·</span>
          <span>{company.countries.map((c) => COUNTRY_FLAGS[c]).join(' ')}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

function AddRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
