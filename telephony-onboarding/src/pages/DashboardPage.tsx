import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useCapabilities } from '@/api/useApi'
import { useEntityContext } from '@/state/EntityContext'
import { CapabilityRow, CapabilityRowNotConfigured } from '@/components/CapabilityRow'
import { AssignmentDialog } from '@/components/AssignmentDialog'
import { ZeroState } from '@/components/ZeroState'
import { EntitySwitcher } from '@/components/EntitySwitcher'
import type { Capability, CapabilityType } from '@/types'

const ALL_CAPABILITY_TYPES: CapabilityType[] = [
  'business_profile',
  'stir_shaken',
  'a2p_messaging',
  'cnam',
  'country_bundle',
  'alphanumeric_sender_id',
  'caller_id_passthrough',
  'branded_calls',
]

export function DashboardPage() {
  const { currentEntity, loading: entityLoading } = useEntityContext()
  const { capabilities, loading } = useCapabilities(currentEntity?.id)
  const [assigning, setAssigning] = useState<Capability | null>(null)

  if (entityLoading || loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>
  }

  if (!currentEntity || capabilities.length === 0) {
    return <ZeroState />
  }

  const statusOrder = ['rejected', 'draft', 'in_review', 'waiting', 'approved'] as const
  const sorted = [...capabilities].sort((a, b) => {
    const ai = statusOrder.indexOf(a.status as never)
    const bi = statusOrder.indexOf(b.status as never)
    if (ai === bi) return a.type.localeCompare(b.type)
    return ai - bi
  })

  const approved = capabilities.filter((c) => c.status === 'approved').length
  const rejected = capabilities.filter((c) => c.status === 'rejected').length
  const inReview = capabilities.filter((c) => c.status === 'in_review').length
  const total = capabilities.length

  const configuredTypes = new Set(capabilities.map((c) => c.type))
  const unconfigured = ALL_CAPABILITY_TYPES.filter(
    (t) =>
      !configuredTypes.has(t) ||
      t === 'caller_id_passthrough' ||
      t === 'alphanumeric_sender_id' ||
      t === 'branded_calls'
  )

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your registered business and the capabilities it's been approved for.
          </p>
        </div>
        <EntitySwitcher />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="font-medium">Capabilities</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {approved} of {total} approved
              {inReview > 0 && ` · ${inReview} in review`}
              {rejected > 0 && ` · ${rejected} rejected`}
            </div>
          </div>
          <Button asChild>
            <Link to="/wizard?mode=capability">
              <Plus className="h-4 w-4" />
              Add capability
            </Link>
          </Button>
        </div>

        <div>
          {sorted.map((c) => (
            <CapabilityRow key={c.id} capability={c} onAssign={(cap) => setAssigning(cap)} />
          ))}
          {unconfigured.map((t) => (
            <CapabilityRowNotConfigured
              key={t}
              type={t}
              supportOnly={t === 'caller_id_passthrough'}
              future={t === 'alphanumeric_sender_id' || t === 'branded_calls'}
            />
          ))}
        </div>
      </Card>

      <AssignmentDialog capability={assigning} onClose={() => setAssigning(null)} />
    </div>
  )
}
