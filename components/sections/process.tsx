import { Section } from '@/components/section'

/* 這裡的編號有意義：合作真的是照這個順序走的。 */
const steps = [
  {
    n: '01',
    when: '第 1 週',
    name: '盤點',
    body: '我們談 60 分鐘。你描述現在的做法，我問時間花在哪、誰在做、卡在哪。結束時你會拿到一份可不可行的判斷與範圍建議 — 這一步不收費。',
  },
  {
    n: '02',
    when: '第 1–2 週',
    name: '原型',
    body: '先做最耗人的那一段給你看。用你真實的資料跑，跑得出來才往下走。這一步結束你就知道值不值得做完。',
  },
  {
    n: '03',
    when: '第 2–5 週',
    name: '上線',
    body: '接進你正在用的系統，設好排程、錯誤通知與失敗重跑。跑一週實際流量確認穩定，才算上線。',
  },
  {
    n: '04',
    when: '之後',
    name: '交接與維運',
    body: '給你操作說明與後台，你的人能自己改參數。可以只在出問題時找我，也可以按月維運。',
  },
]

export function Process() {
  return (
    <Section
      id="process"
      eyebrow="how we work"
      title="合作是這樣走的"
      lead="第一次談話不收費，也不需要你先想清楚要用什麼技術。你只要能描述現在怎麼做就夠了。"
    >
      <ol className="flex flex-col">
        {steps.map((s) => (
          <li
            key={s.n}
            className="group grid gap-4 border-t border-border py-8 first:border-t-0 first:pt-0 sm:grid-cols-[4rem_1fr] sm:gap-8 lg:grid-cols-[4rem_10rem_1fr]"
          >
            <span className="font-mono text-sm tabular-nums text-primary">
              {s.n}
            </span>
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight">
                {s.name}
              </h3>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {s.when}
              </p>
            </div>
            <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
