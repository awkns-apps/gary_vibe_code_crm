'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

/**
 * A work sample that only costs a poster image until it is actually on screen.
 *
 * `preload="none"` plus a poster means the initial page load pulls a ~50KB
 * still, not a megabyte of video; the clip is fetched and played once the tile
 * scrolls into view and paused the moment it leaves. Reduced-motion viewers get
 * the poster and an explicit play control instead.
 */
export function WorkVideo({
  src,
  poster,
  title,
  ratio,
}: {
  src: string
  poster: string
  title: string
  ratio: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries[0].isIntersecting
        if (inView) {
          video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
        } else {
          video.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [manual])

  function toggle() {
    const video = videoRef.current
    if (!video) return
    setManual(true)
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <div className={`relative ${ratio} w-full overflow-hidden bg-secondary`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={title}
        className="size-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `暫停：${title}` : `播放：${title}`}
        className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full border border-white/30 bg-ink/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-ink/75 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white group-hover:opacity-100 motion-reduce:opacity-100"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </div>
  )
}
