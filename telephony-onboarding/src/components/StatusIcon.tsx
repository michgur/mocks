import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  CircleSlash,
  CircleDashed,
  PauseCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequirementStatus } from '@/types'

const CONFIG: Record<RequirementStatus, { Icon: typeof CheckCircle2; color: string }> = {
  approved: { Icon: CheckCircle2, color: 'text-success' },
  rejected: { Icon: AlertTriangle, color: 'text-destructive' },
  in_review: { Icon: Clock, color: 'text-warning' },
  waiting: { Icon: PauseCircle, color: 'text-muted-foreground' },
  draft: { Icon: CircleDashed, color: 'text-muted-foreground' },
  error: { Icon: AlertTriangle, color: 'text-destructive' },
  not_started: { Icon: CircleSlash, color: 'text-muted-foreground/60' },
}

export function StatusIcon({ status, className }: { status: RequirementStatus; className?: string }) {
  const { Icon, color } = CONFIG[status]
  return <Icon className={cn('h-5 w-5', color, className)} />
}
