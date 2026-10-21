import { Clock, Mail, MapPin } from 'lucide-react'
import { AgentPortrait } from '@/components/agent-face'
import { ContactForm } from '@/components/contact-form'
import { Section } from '@/components/section'

/* 換成你的真實聯絡資訊 */
const details = [
  // { icon: Mail, label: '直接寫信', value: 'hello@stevenwu.ai' },
  { icon: MapPin, label: '所在地', value: '台北 · 可遠端合作' },
  { icon: Clock, label: '回覆時間', value: '一個工作天內' },
]

export function Contact() {
  return (
    <Section
      id="contact"
      eyebrow="start here"
      title="先講一件事就好"
      lead="不用先想清楚要用什麼技術，也不用準備規格。挑一件現在最耗人的事描述給我，我看完會告訴你這件事能不能自動化、大概要多久。"
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_15rem] lg:gap-14">
        <div className="border border-border bg-card p-6 sm:p-9">
          <h3 className="sr-only">聯絡表單</h3>
          {/* 這不是文案技巧：表單真的會進 contact_messages，再由分析 agent 整理。 */}
          <div className="mb-7 flex items-start gap-4 border-b border-border pb-7">
            <AgentPortrait pose="greet" size={72} />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Desk agent
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">
                訊息送出後我會先讀一遍，整理成需求摘要再交給 Steven。
                所以寫得口語一點沒關係，把現在最卡的地方講出來就好。
              </p>
            </div>
          </div>
          <ContactForm />
        </div>

        <aside className="flex flex-col gap-7 lg:pt-2">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3.5">
              <Icon
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm">{value}</p>
              </div>
            </div>
          ))}
          <p className="border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
            第一次諮詢 60 分鐘、不收費，結束後你會拿到一份可行性判斷 —
            就算最後沒合作也帶得走。
          </p>
        </aside>
      </div>
    </Section>
  )
}
