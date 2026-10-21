import { DeskTransitions } from '@/components/desk-transitions'

/**
 * Wraps the resting desk, the dashboard and login alike, so a move between any
 * two admin routes animates — including the one that matters most, the agent
 * shrinking out of the home screen into the top bar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DeskTransitions>{children}</DeskTransitions>
}
