import { Section } from '@/components/section'

const services = [
  {
    tag: 'automation',
    name: 'AI 流程自動化',
    summary: '把每天有人在做、但其實不該有人做的事交給機器。',
    items: [
      '資料在系統之間搬移，中途自動判斷與整理',
      '自動讀信、抽出單據與表單欄位、寫回你的系統',
      '定時產出報表，並通知該知道的人',
      '過去只能人工判讀的文字，交給模型分類與摘要',
    ],
  },
  {
    tag: 'imaging',
    name: '影像與圖片生成',
    summary: '要的量很大、風格要一致、改版要快 — 這是生成模型最划算的地方。',
    items: [
      '產品情境圖與廣告素材，一次產出數十種版本',
      '電商去背、換背景、統一打光',
      '角色與品牌風格固定的系列圖',
      '批次改尺寸、改文案、輸出各平台規格',
    ],
  },
  {
    tag: 'integration',
    name: '客製 AI 系統',
    summary: '接進你現在在用的工具，不要求你換一套。',
    items: [
      '讀你自己文件的內部問答助理',
      '客服回覆草稿與工單分流',
      '用講的就能查的資料查詢介面',
      '串接現有 ERP、CRM、試算表與通訊軟體',
    ],
  },
]

export function Services() {
  return (
    <Section
      id="services"
      eyebrow="services"
      title="我能接手的三種工作"
      lead="不賣工具，交付的是跑得動的東西。你描述現在怎麼做，我告訴你哪一段可以不用人。"
    >
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article
            key={s.tag}
            className="group bg-background p-7 transition-colors duration-300 hover:bg-secondary"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {s.tag}
            </p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight">
              {s.name}
            </h3>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
              {s.summary}
            </p>
            <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              {s.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2 block size-1 shrink-0 bg-primary"
                  />
                  <span className="text-foreground/85">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}
