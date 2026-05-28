import { Link } from 'react-router-dom'
import { Phone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function NumbersPage() {
  // Stub: empty state for now. Pools/numbers list will live here once data is wired up.
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
            Tell us what numbers you need and what your business does — we'll handle carrier
            registrations and acquire numbers for you.
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
