import { Section } from '@/components/section'

/**
 * ⚠️ 佔位案例 — 內容與數字皆為示意，上線前務必換成真實案例。
 * 這一區最影響轉換，也最傷信任，不要留著假數字上線。
 */
const cases = [
  {
    client: '電商 · 家居用品',
    problem: '每上一檔新品，兩個人要花三天把商品圖去背、套版、輸出六種平台尺寸。',
    solution: '建了一條批次影像產線：上傳原圖後自動去背、統一打光、套品牌版型、輸出所有規格。',
    metrics: [
      { k: '單檔製圖時間', v: '3 天 → 40 分鐘' },
      { k: '每月省下人力', v: '約 120 小時' },
    ],
  },
  {
    client: '製造業 · 零件供應',
    problem: '客戶詢價信件散在三個信箱，業務手動抄進報價系統，常漏、常延遲。',
    solution: '自動讀信、抽出品號與數量、比對庫存與價目表，產出報價草稿並通知負責業務確認。',
    metrics: [
      { k: '平均回覆時間', v: '11 小時 → 25 分鐘' },
      { k: '漏單率', v: '降至 0.4%' },
    ],
  },
  {
    client: '專業服務 · 顧問公司',
    problem: '內部十年累積的文件沒人找得到，新人每次都要問資深同事。',
    solution: '把文件接進內部問答助理，直接在他們原本用的通訊軟體裡問，回答附上出處連結。',
    metrics: [
      { k: '每週查找時間', v: '減少 6.5 小時／人' },
      { k: '上線後三個月使用率', v: '82%' },
    ],
  },
]

export function Cases() {
  return (
    <Section
      id="work"
      tone="paper"
      eyebrow="case studies"
      title="做過什麼，省下多少"
      lead="每個案子都從同一個問題開始：這件事現在花掉多少時間？下面是幾個交付後的實際變化。"
    >
      <div className="flex flex-col">
        {cases.map((c) => (
          <article
            key={c.client}
            className="grid gap-6 border-t border-ink/15 py-9 first:border-t-0 first:pt-0 lg:grid-cols-[1fr_16rem] lg:gap-12"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
                {c.client}
              </p>
              <h3 className="mt-4 text-pretty font-display text-lg font-bold leading-snug tracking-tight">
                {c.problem}
              </h3>
              <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-ink/70">
                {c.solution}
              </p>
            </div>

            <dl className="flex flex-col gap-5 border-t border-ink/15 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
              {c.metrics.map((m) => (
                <div key={m.k}>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">
                    {m.k}
                  </dt>
                  <dd className="mt-1.5 text-pretty font-display text-xl font-bold leading-tight tabular-nums">
                    {m.v}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </Section>
  )
}
