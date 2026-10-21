import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 全頁共用的節點軸線版面。
 * 左側細線貫穿，每個區塊在線上掛一個節點 — 軸線承載的是頁面的順序，不是裝飾。
 */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = 'dark',
  className,
}: {
  id?: string
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  children: ReactNode
  tone?: 'dark' | 'paper'
  className?: string
}) {
  const paper = tone === 'paper'

  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-16 border-t',
        paper
          ? 'border-paper bg-paper text-ink'
          : 'border-border bg-background text-foreground',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 py-20 sm:py-28 lg:grid-cols-[10rem_1fr] lg:gap-12">
          {/* 軸線與節點 */}
          <div className="relative lg:pl-px">
            <div
              aria-hidden="true"
              className={cn(
                'absolute -top-20 bottom-[-5rem] left-0 hidden w-px lg:block',
                paper ? 'bg-ink/15' : 'bg-line/60',
              )}
            />
            <div className="relative flex items-center gap-3 lg:block">
              <span
                aria-hidden="true"
                className={cn(
                  'block size-1.5 lg:absolute lg:-left-[3px] lg:top-[0.45rem]',
                  paper ? 'bg-ink' : 'bg-primary',
                )}
              />
              <span
                className={cn(
                  'font-mono text-[11px] uppercase tracking-[0.18em] lg:block lg:pl-5',
                  paper ? 'text-ink/55' : 'text-muted-foreground',
                )}
              >
                {eyebrow}
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-2xl text-balance font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">
              {title}
            </h2>
            {lead && (
              <p
                className={cn(
                  'mt-5 max-w-xl text-pretty text-base leading-relaxed sm:text-lg',
                  paper ? 'text-ink/70' : 'text-muted-foreground',
                )}
              >
                {lead}
              </p>
            )}
            <div className="mt-12">{children}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
