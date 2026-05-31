import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Check, ChevronDown, Layers, Pencil, Phone, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/api/client'
import { useAgents, useEntities, useNumbers, usePools } from '@/api/useApi'
import {
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  SUPPORTED_COUNTRIES,
  US_STATES,
  type Agent,
  type CompositionRow,
  type CountryCode,
  type PhoneNumber,
  type Pool,
} from '@/types'

export function NumbersPage() {
  const { pools, loading: poolsLoading } = usePools()
  const { agents } = useAgents()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Default selection: first pool. Also recover if the selected pool disappears.
  useEffect(() => {
    if (pools.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !pools.find((p) => p.id === selectedId)) {
      setSelectedId(pools[0].id)
    }
  }, [pools, selectedId])

  if (poolsLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>
  }

  if (pools.length === 0) {
    return <EmptyState />
  }

  const pool = pools.find((p) => p.id === selectedId) ?? pools[0]

  const onCreatePool = async () => {
    const created = await api.createPool({
      legalEntityId: pool.legalEntityId,
      name: 'New pool',
      inboundAgentId: agents[0]?.id ?? null,
      outboundAgentIds: agents.map((a) => a.id),
      autoRotation: false,
    })
    setSelectedId(created.id)
  }

  return (
    <PoolDetail
      key={pool.id}
      pool={pool}
      pools={pools}
      onSelect={setSelectedId}
      onCreate={onCreatePool}
    />
  )
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

function PoolDetail({
  pool,
  pools,
  onSelect,
  onCreate,
}: {
  pool: Pool
  pools: Pool[]
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  const { agents } = useAgents()
  const { numbers: allNumbers } = useNumbers()
  const numbers = allNumbers.filter((n) => n.poolId === pool.id)

  const [provisionOpen, setProvisionOpen] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Numbers</h1>
        <PoolHeader pool={pool} pools={pools} onSelect={onSelect} onCreate={onCreate} />
      </div>

      <div className="mb-3">
        <AutoRotationCard pool={pool} numbers={numbers} />
      </div>

      <div className="grid grid-cols-[1fr_320px] items-start gap-6">
        <NumbersTable
          pool={pool}
          numbers={numbers}
          onProvisionClick={() => setProvisionOpen(true)}
          onReleaseClick={(n) => setReleaseTarget(n)}
        />

        <div className="space-y-3">
          <InboundCard pool={pool} agents={agents} />
          <OutboundCard pool={pool} agents={agents} />
        </div>
      </div>

      <ProvisionNumbersModal
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        pool={pool}
      />
      <ReleaseNumberModal
        number={releaseTarget}
        autoRotation={pool.autoRotation}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null)
        }}
      />
    </div>
  )
}

/* ── Pool header (selector + rename) ──────────────────────────────── */

function PoolHeader({
  pool,
  pools,
  onSelect,
  onCreate,
}: {
  pool: Pool
  pools: Pool[]
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(pool.name)
  const [saving, setSaving] = useState(false)

  const startRename = () => {
    setDraft(pool.name)
    setRenaming(true)
  }

  const onSave = async () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== pool.name) {
      setSaving(true)
      try {
        await api.updatePool(pool.id, { name: trimmed })
      } finally {
        setSaving(false)
      }
    }
    setRenaming(false)
  }

  const onCancel = () => {
    setDraft(pool.name)
    setRenaming(false)
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          className="h-9 w-56 text-sm"
        />
        <Button size="sm" onClick={onSave} disabled={saving || !draft.trim()}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <PoolSelector current={pool} pools={pools} onSelect={onSelect} onCreate={onCreate} />
      <Button
        variant="ghost"
        size="sm"
        onClick={startRename}
        className="h-9 w-9 p-0 text-muted-foreground"
        title="Rename pool"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function PoolSelector({
  current,
  pools,
  onSelect,
  onCreate,
}: {
  current: Pool
  pools: Pool[]
  onSelect: (id: string) => void
  onCreate: () => void
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
          open && 'bg-accent'
        )}
      >
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[180px] truncate">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-popover p-1 shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pools</div>
          {pools.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                <Layers className="h-3 w-3" />
              </div>
              <span className="flex-1 truncate">{p.name}</span>
              {current.id === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              onCreate()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            New pool
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Numbers table ──────────────────────────────── */

function NumbersTable({
  pool,
  numbers,
  onProvisionClick,
  onReleaseClick,
}: {
  pool: Pool
  numbers: PhoneNumber[]
  onProvisionClick: () => void
  onReleaseClick: (n: PhoneNumber) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="font-medium">Numbers</div>
        {!pool.autoRotation && (
          <Button size="sm" onClick={onProvisionClick}>
            <Plus className="h-4 w-4" />
            Provision numbers
          </Button>
        )}
      </div>
      {numbers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="max-w-xs text-sm text-muted-foreground">
            {pool.autoRotation
              ? 'Auto-rotation will keep this pool in sync with your target.'
              : 'No numbers yet. Click "Provision numbers" to add some.'}
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
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n) => (
              <tr key={n.id} className="border-b last:border-b-0">
                <td className="px-5 py-3 font-mono text-foreground">{n.number}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {n.country}
                  {n.region && ` · ${n.region}`}
                </td>
                <td className="px-5 py-3">
                  <HealthCell value={n.health} />
                </td>
                <td className="px-5 py-3 text-muted-foreground">{n.callsLast30d.toLocaleString()}</td>
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
    </Card>
  )
}

function HealthCell({ value }: { value: number }) {
  const tone = value >= 80 ? 'text-success' : value >= 60 ? 'text-warning' : 'text-destructive'
  return <span className={cn('font-medium tabular-nums', tone)}>{value}%</span>
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

/* ── Auto-rotation (toggle in header, composition body when on) ──────────────────────────────── */

function AutoRotationCard({ pool, numbers }: { pool: Pool; numbers: PhoneNumber[] }) {
  const [on, setOn] = useState(pool.autoRotation)

  const onToggle = async (v: boolean) => {
    setOn(v)
    if (v) {
      // Enabling: infer target composition from current roster so the pool starts "in sync".
      const target = inferCompositionFromRoster(numbers)
      await api.updatePool(pool.id, { autoRotation: true, targetComposition: target })
    } else {
      // Disabling: drop target. Roster stays as-is.
      await api.updatePool(pool.id, { autoRotation: false, targetComposition: undefined })
    }
  }

  return (
    <CardSection
      label="Auto-rotation"
      action={<Switch checked={on} onCheckedChange={onToggle} />}
    >
      {on && <CompositionBody pool={pool} numbers={numbers} />}
    </CardSection>
  )
}

function CompositionBody({ pool, numbers }: { pool: Pool; numbers: PhoneNumber[] }) {
  const target = pool.targetComposition ?? []
  const actualGrouped = groupRoster(numbers)
  const totalTarget = target.reduce((s, r) => s + r.count, 0)
  const totalActual = numbers.length

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CompositionRow[]>(target)

  const onEdit = () => {
    setDraft(target)
    setEditing(true)
  }
  const onCancel = () => setEditing(false)
  const onSave = async () => {
    await api.updatePool(pool.id, { targetComposition: draft })
    setEditing(false)
  }

  const updateRow = (i: number, patch: Partial<CompositionRow>) =>
    setDraft(draft.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) => setDraft(draft.filter((_, idx) => idx !== i))
  const addRow = () =>
    setDraft([...draft, { country: 'US', region: 'Any state', count: 1 }])

  const saveDisabled = draft.some((r) => r.count <= 0)

  if (editing) {
    return (
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
        <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saveDisabled}>
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 text-sm">
      {target.length === 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">No target set.</span>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
      ) : (
        <>
          {target.map((row, i) => {
            const actual = actualCountForRow(row, actualGrouped)
            const mismatch = actual !== row.count
            return (
              <div key={i} className="flex items-center justify-between">
                <span className="text-foreground">
                  <span className="mr-1.5">{COUNTRY_FLAGS[row.country]}</span>
                  {COUNTRY_LABELS[row.country]}
                  {row.region && row.region !== 'Any state' && (
                    <span className="text-muted-foreground"> · {row.region}</span>
                  )}
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    mismatch ? 'text-warning' : 'text-foreground'
                  }`}
                >
                  {actual} / {row.count}
                </span>
              </div>
            )
          })}
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>Total</span>
            <span
              className={`font-mono font-semibold ${
                totalActual !== totalTarget ? 'text-warning' : 'text-foreground'
              }`}
            >
              {totalActual} / {totalTarget}
            </span>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function groupRoster(numbers: PhoneNumber[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const n of numbers) {
    const key = `${n.country}|${n.region ?? ''}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

function actualCountForRow(row: CompositionRow, grouped: Map<string, number>): number {
  const normalized = row.region && row.region !== 'Any state' ? row.region : ''
  return grouped.get(`${row.country}|${normalized}`) ?? 0
}

function inferCompositionFromRoster(numbers: PhoneNumber[]): CompositionRow[] {
  const grouped = groupRoster(numbers)
  const rows: CompositionRow[] = []
  for (const [key, count] of grouped) {
    const [country, region] = key.split('|') as [CountryCode, string]
    rows.push({
      country,
      region: region || undefined,
      count,
    })
  }
  return rows
}

/* ── Inbound ──────────────────────────────── */

const ROUTE_LAST_OUTGOING = '__last_outgoing__'

function InboundCard({ pool, agents }: { pool: Pool; agents: Agent[] }) {
  const [allow, setAllow] = useState(pool.inboundAgentId !== null)
  const [routeValue, setRouteValue] = useState<string>(
    pool.inboundLastOutgoing
      ? ROUTE_LAST_OUTGOING
      : pool.inboundAgentId ?? agents[0]?.id ?? ''
  )
  const [fallback, setFallback] = useState<string>(
    pool.inboundLastOutgoing
      ? pool.inboundAgentId ?? agents[0]?.id ?? ''
      : agents[0]?.id ?? ''
  )

  const persist = async (nextAllow: boolean, nextRoute: string, nextFallback: string) => {
    const lastOutgoing = nextRoute === ROUTE_LAST_OUTGOING
    const agentId = nextAllow ? (lastOutgoing ? nextFallback : nextRoute) : null
    await api.updatePool(pool.id, {
      inboundAgentId: agentId,
      inboundLastOutgoing: lastOutgoing,
    })
  }

  const onToggle = (v: boolean) => {
    setAllow(v)
    persist(v, routeValue, fallback)
  }
  const onRouteChange = (v: string) => {
    setRouteValue(v)
    // When switching to last-outgoing, make sure fallback has a sensible default.
    if (v === ROUTE_LAST_OUTGOING && !fallback) {
      const f = agents[0]?.id ?? ''
      setFallback(f)
      persist(allow, v, f)
    } else {
      persist(allow, v, fallback)
    }
  }
  const onFallbackChange = (v: string) => {
    setFallback(v)
    persist(allow, routeValue, v)
  }

  const isLastOutgoing = routeValue === ROUTE_LAST_OUTGOING

  return (
    <CardSection
      label="Incoming calls"
      action={<Switch checked={allow} onCheckedChange={onToggle} />}
    >
      {allow && (
        <div className="space-y-2">
          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">Route to</div>
            <Select value={routeValue} onValueChange={onRouteChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pick an agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
                <SelectItem value={ROUTE_LAST_OUTGOING}>
                  ⚡ Last agent who called the contact
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLastOutgoing && (
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">Fallback to</div>
              <Select value={fallback} onValueChange={onFallbackChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick a fallback agent…" />
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
        </div>
      )}
    </CardSection>
  )
}

/* ── Outbound ──────────────────────────────── */

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

/* ── Provision numbers modal ──────────────────────────────── */

function ProvisionNumbersModal({
  open,
  onOpenChange,
  pool,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pool: Pool
}) {
  const [draft, setDraft] = useState<CompositionRow[]>([
    { country: 'US', region: 'Any state', count: 1 },
  ])
  const [submitting, setSubmitting] = useState(false)

  const total = draft.reduce((s, r) => s + r.count, 0)
  const disabled = submitting || draft.length === 0 || draft.some((r) => r.count <= 0)

  const updateRow = (i: number, patch: Partial<CompositionRow>) =>
    setDraft(draft.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) => setDraft(draft.filter((_, idx) => idx !== i))
  const addRow = () =>
    setDraft([...draft, { country: 'US', region: 'Any state', count: 1 }])

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      await api.provisionNumbers(pool.id, draft)
      setDraft([{ country: 'US', region: 'Any state', count: 1 }])
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision numbers</DialogTitle>
          <DialogDescription>
            Add numbers to <strong>{pool.name}</strong>. We'll scan for spam reputation and only
            acquire healthy ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {draft.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
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
                <SelectTrigger className="h-9 flex-1 text-sm">
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
                  <SelectTrigger className="h-9 flex-1 text-sm">
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
                className="h-9 w-16 text-center text-sm"
              />
              {draft.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add row
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {submitting ? 'Provisioning…' : `Provision ${total} ${total === 1 ? 'number' : 'numbers'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Release number modal ──────────────────────────────── */

function ReleaseNumberModal({
  number,
  autoRotation,
  onOpenChange,
}: {
  number: PhoneNumber | null
  autoRotation: boolean
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

  const onRelease = async () => {
    setBusy(true)
    try {
      await api.releaseNumber(number.id)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const onReplace = async () => {
    setBusy(true)
    try {
      await api.releaseAndReplace(number.id)
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
            Release <span className="font-mono">{number.number}</span>?
          </DialogTitle>
          <DialogDescription>
            {autoRotation
              ? 'Auto-rotation is on. Choose how to handle this release.'
              : 'This number will be released back to Twilio.'}
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

        {autoRotation ? (
          <DialogFooter className="!justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRelease} disabled={busy}>
                Release without replacing
              </Button>
              <Button onClick={onReplace} disabled={busy}>
                {busy ? 'Replacing…' : 'Release and replace'}
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onRelease} disabled={busy}>
              {busy ? 'Releasing…' : 'Release'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
