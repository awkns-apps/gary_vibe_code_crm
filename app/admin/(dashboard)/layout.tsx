import { requireAdmin } from '@/lib/admin-auth'
import { AdminNav } from '@/components/admin-nav'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import { AgentAvatar } from '@/components/agent-avatar'
import { AdminCommandPalette, CommandPaletteTrigger } from '@/components/admin-command-palette'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <a href="#admin-main" tabIndex={0} className="fixed left-3 top-3 z-50 -translate-y-20 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        跳到主要內容
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
        {/* The agent sits above the menu and speaks first. */}
        <div className="mx-auto flex w-full max-w-[1320px] items-center gap-4 px-4 py-3 sm:px-7 lg:px-10">
          <AgentAvatar />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block sm:w-56 lg:w-72">
              <CommandPaletteTrigger />
            </div>
            <div className="sm:hidden">
              <CommandPaletteTrigger compact />
            </div>
            <AdminLogoutButton />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-7 lg:px-10">
          <AdminNav />
        </div>
      </header>

      <main id="admin-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1320px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
        {children}
      </main>

      <AdminCommandPalette />
    </div>
  )
}
