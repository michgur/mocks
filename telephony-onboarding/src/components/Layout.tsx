import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, Phone } from 'lucide-react'
import { DevToolbar } from './DevToolbar'
import { useAlerts, useNotifications } from '@/api/useApi'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/capabilities', label: 'Telephony' },
  { to: '/numbers', label: 'Agents' },
]

export function Layout() {
  const location = useLocation()
  const { alerts } = useAlerts()
  const { notifications } = useNotifications()
  // The bell badge rolls up everything that wants attention: open alerts plus
  // unread notifications.
  const inboxCount =
    alerts.filter((a) => a.status === 'active').length +
    notifications.filter((n) => !n.read).length
  const isWizard = location.pathname.startsWith('/wizard')

  if (isWizard) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link to="/capabilities" className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Phone className="h-4 w-4" />
            </div>
            <span>Harmony</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link
              to="/alerts"
              aria-label="Notifications"
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                location.pathname.startsWith('/alerts')
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Bell className="h-4 w-4" />
              {inboxCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {inboxCount}
                </span>
              )}
            </Link>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
              JC
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
      <DevToolbar />
    </div>
  )
}
