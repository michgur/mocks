import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/api/client'
import { useAgents, usePools } from '@/api/useApi'
import {
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  SUPPORTED_COUNTRIES,
  US_STATES,
  type Agent,
  type CompositionRow,
  type CountryCode,
  type Pool,
} from '@/types'

export function NumbersPage() {
  const { pools, loading: poolsLoading } = usePools()

  if (poolsLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>
  }

  if (pools.length === 0) {
    return <EmptyState />
  }

  // For now show the first pool (99% single-pool case). Multi-pool switcher comes later.
  return <PoolDetail pool={pools[0]} />
}

function EmptyState() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Numbers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Phone numbers your agents use to make and receive calls.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Phone className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="max-w-sm">
          <div className="font-medium">No numbers yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us what numbers you need and what your business does — we'll handle the
            capabilities and acquire numbers for you.
          </p>
        </div>
        <Button asChild>
          <Link to="/wizard">
            <Plus className="h-4 w-4" />
            Get phone numbers
          </Link>
        </Button>
      </Card>
    </div>
  )
}

function PoolDetail({ pool }: { pool: Pool }) {
  const { agents } = useAgents()

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{pool.name}</h1>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        <NumbersTable />

        <div className="space-y-3">
          <CompositionCard pool={pool} />
          <InboundCard pool={pool} agents={agents} />
          <OutboundCard pool={pool} agents={agents} />
          <RotationCard pool={pool} />
        </div>
      </div>
    </div>
  )
}

/* ── Numbers table ──────────────────────────────── */

function NumbersTable() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="font-medium">Numbers</div>
        <div className="text-xs text-muted-foreground">Median health: —</div>
      </div>
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Phone className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="max-w-xs text-sm text-muted-foreground">
          Numbers will appear here once your capability applications are approved.
        </div>
      </div>
    </Card>
  )
}

/* ── Card section helper ──────────────────────────────── */

function CardSection({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className={`flex items-center justify-between ${children ? 'mb-2' : ''}`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

/* ── Composition (edit mode) ──────────────────────────────── */

function CompositionCard({ pool }: { pool: Pool }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CompositionRow[]>(pool.composition)
  const composition = editing ? draft : pool.composition
  const total = composition.reduce((s, r) => s + r.count, 0)

  const onEdit = () => {
    setDraft(pool.composition)
    setEditing(true)
  }
  const onCancel = () => setEditing(false)
  const onSave = async () => {
    await api.updatePool(pool.id, { composition: draft })
    setEditing(false)
  }

  const updateRow = (i: number, patch: Partial<CompositionRow>) =>
    setDraft(draft.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) => setDraft(draft.filter((_, idx) => idx !== i))
  const addRow = () =>
    setDraft([...draft, { country: 'US', region: 'Any state', count: 1 }])

  const saveDisabled = draft.length === 0 || draft.some((r) => r.count <= 0)

  return (
    <CardSection
      label="Composition"
      action={
        !editing && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-primary hover:underline"
          >
            Edit
          </button>
        )
      }
    >
      {!editing ? (
        <div className="space-y-1.5 text-sm">
          {pool.composition.map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-foreground">
                <span className="mr-1.5">{COUNTRY_FLAGS[row.country]}</span>
                {COUNTRY_LABELS[row.country]}
                {row.region && row.region !== 'Any state' && (
                  <span className="text-muted-foreground"> · {row.region}</span>
                )}
              </span>
              <span className="font-mono text-xs font-semibold">0 / {row.count}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>Total</span>
            <span className="font-mono font-semibold text-foreground">0 / {total}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {draft.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Select
                  value={row.country}
                  onValueChange={(v) => {
                    const country = v as CountryCode
                    updateRow(i, {
                      country,
                      region: country === 'US' ? row.region ?? 'Any state' : undefined,
                    })
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="mr-2">{COUNTRY_FLAGS[c]}</span>
                        {COUNTRY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {row.country === 'US' && (
                  <Select
                    value={row.region ?? 'Any state'}
                    onValueChange={(v) => updateRow(i, { region: v })}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="number"
                  min={1}
                  value={row.count}
                  onChange={(e) =>
                    updateRow(i, { count: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="h-8 w-14 text-center text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addRow}
              className="h-7 text-xs text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saveDisabled}>
              Save
            </Button>
          </div>
        </>
      )}
    </CardSection>
  )
}

/* ── Inbound — toggle in header + agent selector ──────────────────────────────── */

function InboundCard({ pool, agents }: { pool: Pool; agents: Agent[] }) {
  const [allow, setAllow] = useState(pool.inboundAgentId !== null)
  const [agentId, setAgentId] = useState<string>(
    pool.inboundAgentId ?? agents[0]?.id ?? ''
  )

  const persist = async (nextAllow: boolean, nextAgent: string) => {
    await api.updatePool(pool.id, {
      inboundAgentId: nextAllow ? nextAgent : null,
    })
  }

  const onToggle = (v: boolean) => {
    setAllow(v)
    persist(v, agentId)
  }
  const onSelectAgent = (v: string) => {
    setAgentId(v)
    persist(allow, v)
  }

  return (
    <CardSection
      label="Incoming calls"
      action={<Switch checked={allow} onCheckedChange={onToggle} />}
    >
      {allow && (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">Route to</div>
          <Select value={agentId} onValueChange={onSelectAgent}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Pick an agent…" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </CardSection>
  )
}

/* ── Outbound — always-on checkboxes ──────────────────────────────── */

function OutboundCard({ pool, agents }: { pool: Pool; agents: Agent[] }) {
  const [selected, setSelected] = useState<string[]>(pool.outboundAgentIds)

  const toggle = async (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    setSelected(next)
    await api.updatePool(pool.id, { outboundAgentIds: next })
  }

  return (
    <CardSection label="Outbound agents">
      <div className="space-y-1">
        {agents.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted/40"
          >
            <Checkbox
              checked={selected.includes(a.id)}
              onCheckedChange={() => toggle(a.id)}
            />
            <AgentAvatar name={a.name} />
            <span>{a.name}</span>
          </label>
        ))}
      </div>
    </CardSection>
  )
}

function AgentAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

/* ── Rotation — toggle in header ──────────────────────────────── */

function RotationCard({ pool }: { pool: Pool }) {
  const [on, setOn] = useState(pool.autoRotation)

  const onToggle = async (v: boolean) => {
    setOn(v)
    await api.updatePool(pool.id, { autoRotation: v })
  }

  return (
    <CardSection
      label="Auto-rotation"
      action={<Switch checked={on} onCheckedChange={onToggle} />}
    />
  )
}
