import { Link, Outlet, useLocation } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { DevToolbar } from './DevToolbar'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/capabilities', label: 'Capabilities' },
  { to: '/numbers', label: 'Agents' },
]

export function Layout() {
  const location = useLocation()
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
                    'rounded-md px-3 py-1.5 font-medium transition-colors',
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
