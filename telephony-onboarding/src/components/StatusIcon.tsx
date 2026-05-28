import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  CircleSlash,
  CircleDashed,
  PauseCircle,
} from 'lucide-react'
import type { CapabilityStatus } from '@/types'

export function StatusIcon({ status, className }: { status: CapabilityStatus; className?: string }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className={className ?? 'h-5 w-5 text-success'} />
    case 'rejected':
      return <AlertTriangle className={className ?? 'h-5 w-5 text-destructive'} />
    case 'in_review':
      return <Clock className={className ?? 'h-5 w-5 text-warning'} />
    case 'waiting':
      return <PauseCircle className={className ?? 'h-5 w-5 text-muted-foreground'} />
    case 'draft':
      return <CircleDashed className={className ?? 'h-5 w-5 text-muted-foreground'} />
    case 'error':
      return <AlertTriangle className={className ?? 'h-5 w-5 text-destructive'} />
    case 'not_configured':
      return <CircleSlash className={className ?? 'h-5 w-5 text-muted-foreground/60'} />
  }
}
