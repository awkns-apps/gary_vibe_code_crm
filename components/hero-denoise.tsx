'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = 24
const STEP_MS = 90

/**
 * 顯影序列：畫面從雜訊逐步解析成成品。
 * 這是整頁唯一的大動作 — 影像生成與流程自動化共用的那個動作：從混亂收斂。
 *
 * 目標圖片預設用 /hero-generated.jpg（程式產生的佔位圖），換成你自己的作品即可。
 */
export function HeroDenoise({ src = '/hero-generated.jpg' }: { src?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const W = 720
    const H = 900
    canvas.width = W
    canvas.height = H

    // 離屏畫布負責低解析度取樣，放大回主畫布時產生「尚未解析」的塊狀感
    const off = document.createElement('canvas')
    const offCtx = off.getContext('2d')
    if (!offCtx) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    let raf = 0
    let cancelled = false

    const drawAt = (progress: number) => {
      // progress 0 → 1
      const eased = progress * progress * (3 - 2 * progress)
      // 取樣解析度從 6px 塊逐步逼近原尺寸
      const scale = Math.max(0.012, eased * eased)
      const w = Math.max(3, Math.round(W * scale))
      const h = Math.max(4, Math.round(H * scale))
      off.width = w
      off.height = h
      offCtx.imageSmoothingEnabled = true
      offCtx.drawImage(img, 0, 0, w, h)

      ctx.imageSmoothingEnabled = progress > 0.85
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(off, 0, 0, w, h, 0, 0, W, H)

      // 藍圖 duotone：保留原圖明度，色相全部收斂到藍。
      // 這一段是 hero 與 gallery 的分野 — 這裡是圖紙，gallery 才是成品。
      ctx.globalCompositeOperation = 'color'
      ctx.globalAlpha = 0.86 // 留一點原圖的層次，全滿會變成一片色塊
      ctx.fillStyle = '#3a49b8'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      // 殘餘雜訊：隨進度衰減
      const noise = Math.max(0, 1 - eased)
      if (noise > 0.01) {
        const cell = 6
        ctx.globalAlpha = noise * 0.55
        for (let y = 0; y < H; y += cell) {
          for (let x = 0; x < W; x += cell) {
            const v = Math.random()
            if (v > 0.5) continue
            // Blueprint noise: ink specks over paper wash, not black over grey.
            ctx.fillStyle = v > 0.25 ? '#a1b1e5' : '#2f3db0'
            ctx.fillRect(x, y, cell, cell)
          }
        }
        ctx.globalAlpha = 1
      }
    }

    img.onload = () => {
      if (cancelled) return

      if (reduced) {
        drawAt(1)
        setStep(STEPS)
        setElapsed(STEPS * STEP_MS)
        return
      }

      const start = performance.now()
      const total = STEPS * STEP_MS

      const tick = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - start) / total)
        drawAt(t)
        setStep(Math.round(t * STEPS))
        setElapsed(Math.round(t * total))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    img.src = src

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [src])

  const done = step >= STEPS

  return (
    <figure className="relative m-0">
      <div className="relative overflow-hidden border border-border bg-secondary">
        <canvas
          ref={canvasRef}
          className="block aspect-4/5 w-full"
          role="img"
          aria-label="AI 生成影像從雜訊逐步顯影成成品的過程"
        />
        {/* 參數面板：真實的執行狀態，不是裝飾 */}
        <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-border/80 bg-background/85 px-3 py-2 font-mono text-[11px] tracking-tight text-muted-foreground backdrop-blur-sm">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block size-1.5 ${done ? 'bg-primary' : 'bg-signal animate-pulse'}`}
            />
            {done ? 'render complete' : 'denoising'}
          </span>
          <span className="tabular-nums">
            step {String(step).padStart(2, '0')}/{STEPS}
          </span>
          <span className="tabular-nums">{(elapsed / 1000).toFixed(2)}s</span>
        </figcaption>
      </div>
    </figure>
  )
}
