import { Cases } from '@/components/sections/cases'
import { Contact } from '@/components/sections/contact'
import { Gallery } from '@/components/sections/gallery'
import { Hero } from '@/components/sections/hero'
import { Process } from '@/components/sections/process'
import { Services } from '@/components/sections/services'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'

export default function Page() {
  return (
    <>
      <a
        href="#contact"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        跳到聯絡表單
      </a>
      <SiteHeader />
      <main id="top">
        <Hero />
        <Services />
        <Gallery />
        <Cases />
        <Process />
        <Contact />
      </main>
      <SiteFooter />
    </>
  )
}
