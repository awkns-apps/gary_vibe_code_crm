"use client"

import { createContext, useCallback, useContext, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

type Navigate = (href: string) => void

const NavigateContext = createContext<Navigate>(() => {})

export function useDeskNavigate() {
  return useContext(NavigateContext)
}

/**
 * Drives route changes through the View Transitions API so the desk agent can
 * morph between its home portrait and the top-bar avatar instead of the two
 * cross-fading.
 *
 * App Router's `router.push` resolves before the new route paints, so the
 * transition is held open by a promise that a pathname effect settles — with a
 * timeout, because a transition that never finishes freezes the page.
 */
export function DeskTransitions({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const pending = useRef<(() => void) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settle = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (pending.current) { pending.current(); pending.current = null }
  }, [])

  // The new route has painted — let the transition finish.
  useEffect(() => { settle() }, [pathname, settle])

  const navigate = useCallback<Navigate>((href) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || typeof document.startViewTransition !== "function") {
      router.push(href)
      return
    }
    // Going deeper and coming back are not the same move: content rises on the
    // way in and falls back on the way out, so the desk feels like one surface
    // you step into rather than a stack of unrelated screens.
    const target = href.split("?")[0]
    document.documentElement.dataset.nav =
      target === "/admin" ? "back" : window.location.pathname === "/admin" ? "forward" : "lateral"

    settle()
    const transition = document.startViewTransition(() =>
      new Promise<void>((resolve) => {
        pending.current = resolve
        timer.current = setTimeout(settle, 900)
        router.push(href)
      }),
    )
    /*
     * Starting a transition while one is still running aborts the old one, and
     * an aborted transition rejects `finished` / `ready` / `updateCallbackDone`.
     * Nothing awaits them, so without these the abort surfaces as an unhandled
     * "InvalidStateError: Transition was aborted" in the console.
     */
    transition.finished.catch(() => {})
    transition.ready.catch(() => {})
    transition.updateCallbackDone.catch(() => {})
  }, [router, settle])

  // Browser back/forward always reads as coming back out.
  useEffect(() => {
    function onPopState() { document.documentElement.dataset.nav = "back" }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  /*
   * Every in-app admin link gets the transition without being rewritten.
   *
   * This must run in the CAPTURE phase: next/link handles clicks on the React
   * root and calls preventDefault there, so a bubble-phase listener would only
   * ever see an already-handled event and skip the transition entirely.
   */
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as HTMLElement | null)?.closest("a")
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (!url.pathname.startsWith("/admin")) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      // Take the navigation over completely so next/link does not also run it.
      event.preventDefault()
      event.stopPropagation()
      navigate(url.pathname + url.search)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [navigate])

  return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>
}
