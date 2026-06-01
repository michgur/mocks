import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Waypoints } from 'lucide-react'
import { Button } from './ui/button'
import { ConnectTwilioModal } from './ConnectTwilioModal'
import { TwilioIcon } from './TwilioIcon'

export function ZeroState({ onGetStarted }: { onGetStarted?: () => void } = {}) {
  const [connectOpen, setConnectOpen] = useState(false)
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Phone className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Get a phone number</h1>
      <p className="mt-3 text-muted-foreground">
        Before your agents can make calls and send messages, we need to verify your business.
        This is a one-time process required by phone carriers.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        {onGetStarted ? (
          <Button size="lg" onClick={onGetStarted}>
            Get started
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/wizard">Get started</Link>
          </Button>
        )}
        <div className="text-xs text-muted-foreground">
          Takes 5 minutes • Approval usually in 1–7 days
        </div>
      </div>
      <div className="mt-12 space-y-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Or bring your own
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-center gap-2.5"
          onClick={() => setConnectOpen(true)}
        >
          <TwilioIcon className="h-5 w-5" />
          Use your Twilio account
        </Button>
        <Button variant="outline" size="lg" className="w-full justify-center gap-2.5">
          <Waypoints className="h-5 w-5" />
          Set up SIP trunking
        </Button>
      </div>

      <ConnectTwilioModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}
