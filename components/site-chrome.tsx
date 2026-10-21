import Link from 'next/link'

const nav = [
  { href: '#services', label: '服務' },
  { href: '#gallery', label: '影像' },
  { href: '#work', label: '案例' },
  { href: '#process', label: '流程' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          href="#top"
          className="flex items-baseline gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <span className="font-display text-base font-bold tracking-tight">
            Steven Wu
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
            AI Engineer
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="#contact"
          className="inline-flex h-9 items-center border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          談談你的需求
        </Link>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Steven Wu · AI Engineer · 台北
        </p>
        {/* <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
          hello@stevenwu.ai
        </p> */}
      </div>
    </footer>
  )
}
