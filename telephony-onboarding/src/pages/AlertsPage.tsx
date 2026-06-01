import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TwilioIcon } from '@/components/TwilioIcon'
import { api } from '@/api/client'
import { useAlerts, useNotifications } from '@/api/useApi'
import { cn } from '@/lib/utils'
import type { Alert, AlertSeverity, Notification, NotificationKind } from '@/types'

export function AlertsPage() {
  const { alerts, loading: alertsLoading } = useAlerts()
  const { notifications, loading: notifsLoading } = useNotifications()
  const active = alerts.filter((a) => a.status === 'active')
  const resolved = alerts.filter((a) => a.status === 'resolved')
  const unread = notifications.filter((n) => !n.read).length

  const loading = alertsLoading || notifsLoading
  const empty = !loading && alerts.length === 0 && notifications.length === 0

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open alerts and lifecycle events across all your sources. Alerts aggregate per source
            and capability and resolve where the problem lives; events log approvals, rejections,
            and rotations as they happen.
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => api.markNotificationsRead()}
          >
            Mark all read
          </Button>
        )}
      </div>

      {empty && (
        <Card className="px-5 py-12 text-center text-sm text-muted-foreground">
          You're all caught up. Delivery failures and lifecycle events across your sources will
          show up here.
        </Card>
      )}

      {active.length > 0 && (
        <>
          <SectionLabel>Needs attention</SectionLabel>
          <div className="space-y-2">
            {active.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </>
      )}

      {notifications.length > 0 && (
        <>
          <SectionLabel className={active.length > 0 ? 'mt-8' : undefined}>Activity</SectionLabel>
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <SectionLabel className="mt-8">Resolved</SectionLabel>
          <div className="space-y-2">
            {resolved.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  )
}

const NOTIFICATION_ICON: Record<NotificationKind, React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4 text-success" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
  rotated: <RefreshCw className="h-4 w-4 text-muted-foreground" />,
  info: <Info className="h-4 w-4 text-muted-foreground" />,
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { read } = notification
  return (
    <Card className={cn('overflow-hidden', read && 'opacity-70')}>
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="mt-0.5">{NOTIFICATION_ICON[notification.kind]}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              {!read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              {notification.title}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{notification.timeAgo}</div>
          </div>

          <div className="mt-1 text-sm text-muted-foreground">{notification.detail}</div>

          <div className="mt-2.5">
            <SourceChip name={notification.sourceName} byo={notification.sourceMode === 'byo'} />
          </div>
        </div>

        {notification.cta && (
          <div className="shrink-0 self-center">
            <Button asChild size="sm" variant="outline">
              <Link to={notification.cta.to}>{notification.cta.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

const SEVERITY: Record<AlertSeverity, { icon: React.ReactNode; ring: string }> = {
  error: {
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    ring: 'border-destructive/30',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    ring: 'border-warning/30',
  },
  info: { icon: <Info className="h-4 w-4 text-muted-foreground" />, ring: 'border-border' },
}

function AlertRow({ alert }: { alert: Alert }) {
  const resolved = alert.status === 'resolved'
  const sev = SEVERITY[alert.severity]

  return (
    <Card className={cn('overflow-hidden', resolved ? 'opacity-60' : sev.ring)}>
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="mt-0.5">
          {resolved ? <CheckCircle2 className="h-4 w-4 text-success" /> : sev.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">{alert.title}</div>
            <div className="shrink-0 text-xs text-muted-foreground">{alert.timeAgo}</div>
          </div>

          <div className="mt-1 text-sm text-muted-foreground">{alert.detail}</div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <SourceChip name={alert.sourceName} byo={alert.sourceMode === 'byo'} />
            {alert.capability && <MetaChip>{alert.capability}</MetaChip>}
            {alert.code && <MetaChip>Error {alert.code}</MetaChip>}
          </div>
        </div>

        {!resolved && alert.cta.label && (
          <div className="shrink-0 self-center">
            <AlertCta cta={alert.cta} />
          </div>
        )}
      </div>
    </Card>
  )
}

function AlertCta({ cta }: { cta: Alert['cta'] }) {
  if (cta.kind === 'twilio') {
    return (
      <a
        href={cta.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
      >
        <TwilioIcon className="h-3.5 w-3.5" />
        {cta.label}
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </a>
    )
  }
  // managed: a Harmony-side fix flow (fix the requirement / replace the number)
  const to = cta.kind === 'replace' ? '/numbers' : '/capabilities'
  return (
    <Button asChild size="sm" variant="outline">
      <Link to={to}>{cta.label}</Link>
    </Button>
  )
}

function SourceChip({ name, byo }: { name: string; byo: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
      {byo ? (
        <TwilioIcon className="h-3 w-3" />
      ) : (
        <Building2 className="h-3 w-3 text-muted-foreground" />
      )}
      {name}
    </span>
  )
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  )
}
