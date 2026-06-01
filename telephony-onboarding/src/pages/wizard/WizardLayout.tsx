import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Phone, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEP_TITLES, type WizardStepId } from './wizardState'

interface Props {
  steps: WizardStepId[]
  current: WizardStepId
  onBack?: () => void
  onCancel: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  children: React.ReactNode
}

export function WizardLayout({ steps, current, onBack, onCancel, onNext, nextLabel = 'Next', nextDisabled, children }: Props) {
  const currentIndex = steps.indexOf(current)
  const totalSteps = steps.length

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="shrink-0 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Phone className="h-4 w-4" />
            </div>
            <span>Harmony</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
            Save & close
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b bg-background">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Step {currentIndex + 1} of {totalSteps} · {STEP_TITLES[current]}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i < currentIndex && 'bg-primary',
                  i === currentIndex && 'bg-primary',
                  i > currentIndex && 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
      </main>

      <footer className="shrink-0 border-t bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack} disabled={!onBack}>
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onNext} disabled={nextDisabled}>
              {nextLabel}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
