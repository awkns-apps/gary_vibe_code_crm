import Link from 'next/link'
import { ArrowDown } from 'lucide-react'
import { AgentPortrait } from '@/components/agent-face'
import { HeroDenoise } from '@/components/hero-denoise'

/* 佔位數字 — 上線前請換成你的真實數據 */
const facts = [
  { k: '導入週期', v: '2–6 週' },
  { k: '已交付流程', v: '40+' },
  { k: '生成影像', v: '12,000+' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1fr_20rem] lg:gap-16 lg:pb-28 xl:grid-cols-[1fr_23rem]">
          <div className="reveal">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              AI Engineer · 台灣
            </p>

            <h1 className="mt-6 font-display text-[2rem] font-bold leading-[1.18] tracking-tight sm:text-4xl lg:text-5xl">
              <span className="block">把公司裡最耗人的那件事，</span>
              <span className="block">
                變成一條<span className="text-primary">自動跑的產線</span>。
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              我是 Steven Wu。我用 AI
              把重複、耗時、需要有人一直盯著的工作接成穩定運行的流程；也產出大量、風格一致的影像素材。從第一次談話到上線，通常兩到六週。
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#contact"
                className="inline-flex h-12 items-center gap-2 bg-primary px-6 font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                說說你的狀況
                <ArrowDown className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#work"
                className="inline-flex h-12 items-center border border-line px-6 font-medium text-foreground transition-colors duration-200 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                先看做過什麼
              </Link>
            </div>

            <dl className="mt-14 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
              {facts.map(({ k, v }) => (
                <div key={k}>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-1.5 font-display text-2xl font-bold tabular-nums">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="reveal [animation-delay:180ms] lg:pt-4">
            <HeroDenoise />
            {/* 96px：原圖原生裁切約 288px，2x 螢幕下這是還能保持銳利的上限附近。 */}
            <div className="mt-6 flex items-start gap-4 border-t border-border pt-6">
              <AgentPortrait pose="hello" size={96} />
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Desk agent
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  我負責先接住你的訊息、整理成需求摘要，
                  Steven 看到的是整理過的版本。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
