import Image from 'next/image'
import { Section } from '@/components/section'
import { WorkVideo } from '@/components/work-video'

/**
 * 案例研究 — 產品動態影片的鏡頭規格系統。
 *
 * 素材：8 支生成影片，原始 1920×1080 / 24fps。網頁版壓到 1280 寬、去音軌、
 * CRF 30，每支 0.6–1.5MB；開頭淡入、結尾淡出與規格卡都依實際亮度曲線裁掉，
 * 所以每一支都能直接循環。
 *
 * TODO(steven): 下面的「成果」數字與客戶名稱是這個案子唯一還缺的東西。
 * 我不會替你編 —— 補上真實的交付時間與比較基準，這一段的說服力會再翻一倍。
 */
const shots = [
  { name: 'watch-hourglass', scene: 'SCENE 05', title: '敘事構圖 · 夕陽與沙漏', note: '雙主體同框，景深與水面反射一次到位' },
  { name: 'watch-bokeh', scene: 'SCENE 02', title: '散景背景 · 雨滴粒子', note: '前景銳利、背景散景，粒子不搶主體' },
  { name: 'watch-macro', scene: 'SCENE 03', title: '錶盤特寫 · 淺景深', note: '微距推進，指針與刻度維持臨界對焦' },
  { name: 'watch-desert', scene: 'SCENE 04', title: '戶外情境 · 沙丘場景', note: '自然光模擬，沙面紋理與陰影方向一致' },
  { name: 'watch-emerald', scene: 'SCENE 01', title: '環繞運鏡 · 純黑背景', note: '金屬高光隨鏡頭連續變化，不跳幀' },
  { name: 'watch-marble', scene: 'SCENE 06', title: '材質對比 · 大理石檯面', note: '金屬、綠面盤與石材三種質感同框' },
  { name: 'watch-studio', scene: 'SCENE 07', title: '棚拍展示 · 絨布打光', note: '單一主光加輪廓光，還原棚拍配置' },
  { name: 'watch-chrono', scene: 'SCENE 08', title: '金屬質感 · 微距推進', note: '兩顆鏡頭銜接，質感與全貌各一' },
]

const facts = [
  { k: '產出鏡頭', v: '8 支' },
  { k: '實拍素材', v: '0' },
  { k: '產品系列', v: '2 款' },
  { k: '場景變化', v: '6 種' },
]

export function Gallery() {
  return (
    <Section
      id="gallery"
      eyebrow="case study"
      title="產品動態：先寫規格，再生成"
      lead="難的從來不是生出一支好看的影片，是生出十支風格一致的。這個案子的做法是把它當成拍片來管：每一顆鏡頭先寫成規格表，再交給模型執行。"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="min-w-0">
          <div className="overflow-hidden border border-border">
            <Image
              src="/work/prompt-spec.jpg"
              alt="鏡頭規格表：場景與鏡次編號、動作、鏡頭與運鏡、打光與情緒、對焦與景深、鏡位細節、聲音、目的與秒數"
              width={1112}
              height={834}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="h-auto w-full"
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            每一顆鏡頭都有一張這樣的規格表：場景與鏡次編號、鏡頭動作、焦段與運鏡方式、
            打光與情緒、對焦點與景深、聲音設計、以及這顆鏡頭存在的目的與秒數。
            這是製片組會用的東西，不是提示詞技巧 —— 而它正是八支影片看起來像同一個團隊拍的原因。
          </p>
        </div>

        <aside className="flex flex-col gap-7 lg:pt-2">
          <div>
            <h3 className="text-base font-medium">為什麼要這樣做</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              直接下提示詞可以得到一支漂亮的影片，但第二支就會跑掉 ——
              打光變了、材質變了、鏡頭語言也變了。客戶要的是一整組能放在同一支廣告裡的素材，
              不是八支各自好看的片。
            </p>
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-base font-medium">可以複製到哪裡</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              規格表換掉產品欄位就能重跑。同一套鏡頭語言可以套到別的品項，
              或同一個產品換十種場景 —— 兩件事的成本差不多。
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6">
            {facts.map(({ k, v }) => (
              <div key={k}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {k}
                </dt>
                <dd className="mt-1.5 font-display text-2xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <h3 className="mt-16 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Shot list · 依規格產出的八顆鏡頭
      </h3>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shots.map((s) => (
          <figure key={s.name} className="group m-0 overflow-hidden border border-border bg-card">
            <WorkVideo
              src={`/work/${s.name}.mp4`}
              poster={`/work/${s.name}.jpg`}
              title={s.title}
              ratio="aspect-video"
            />
            <figcaption className="border-t border-border px-4 py-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                {s.scene}
              </p>
              <p className="mt-1.5 text-sm font-medium">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-7 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
        全部為生成影像 · 原始 1920×1080 24fps · 網頁版已壓縮並靜音
      </p>
    </Section>
  )
}
