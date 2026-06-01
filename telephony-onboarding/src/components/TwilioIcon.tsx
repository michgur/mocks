import { cn } from '@/lib/utils'

// The Twilio glyph lives in /public, so its real URL depends on the deploy base
// (local dev serves it at "/", the build serves it under "/mocks/telephony/").
// Resolve it against Vite's BASE_URL so a single component works everywhere —
// never hard-code the path.
const TWILIO_SRC = `${import.meta.env.BASE_URL}twilio.svg`

export function TwilioIcon({ className }: { className?: string }) {
  return <img src={TWILIO_SRC} alt="" className={cn('h-4 w-4', className)} />
}
