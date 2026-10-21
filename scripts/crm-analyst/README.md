# CRM Inquiry Analyst — 自動化諮詢分析

每天 1–2 次，由 Hermes cron 驅動、Claude 產出分析，結果直接寫入現有 CRM 資料表，
admin UI（`/admin/agent-runs`、`/admin/analyses`、`/admin/clients`）即時可見。

## 完整迴路

```
聯絡表單 → contact_messages
  ↓ fetch-unanalyzed.mjs + Claude + save-analysis.mjs
crm_clients(lead) + crm_analyses(needs / needs_review)
  ↓ 你在 admin 按「核准」            ← app 端：lib/crm-approval.ts
crm_deals(stage=analysis) + client→qualified + crm_agent_runs(queued, pricing_analysis)
  ↓ fetch-queued-runs.mjs + Claude + save-pricing-analysis.mjs
crm_analyses(pricing / needs_review)
  ↓ 你在 admin 按「核准」
crm_deals(stage=proposal, value=recommended_price)
```

## 檔案

- `fetch-unanalyzed.mjs` — **唯讀**。撈出尚未被分析的 `contact_messages`。
- `save-analysis.mjs` — **交易式寫入**。把需求分析原子性寫入
  `crm_clients` / `crm_analyses` / `crm_activities` / `crm_agent_runs`。
- `fetch-queued-runs.mjs` — **唯讀**。撈出 `status='queued'` 的 agent run
  （核准需求分析時由 app 排入），附帶 client / 需求分析 / deal 全文。
- `save-pricing-analysis.mjs` — **交易式寫入**。寫入報價分析並把 queued run
  結案成 `completed`（或 `failed`）。

四支都會自動從專案根目錄的 `.env.local` 讀 `DATABASE_URL`，不需外部 AI key。

## 「已分析」如何判定

不改 schema。一筆諮詢視為已分析 ⇔ 存在一個 `status='completed'` 的
`crm_agent_runs`，其 `source_refs` 含
`{ "kind": "contact_message", "id": "<訊息id>" }`。
`save-analysis.mjs` 寫入時會 pin 這個 ref，`fetch-unanalyzed.mjs` 據此排除。

## 人工把關（重要）

AI 不直接產出「已確認客戶」，也不直接產出商機或報價。它建立的一律是待審狀態：
- `crm_clients.status = 'lead'`、`source = 'contact_form'`（未經人工確認）
- `crm_analyses.status = 'needs_review'`（等你在 admin 審）

**核准是唯一會推進管線的動作，而且只有人（或持 `CRM_AGENT_API_TOKEN` 的呼叫方）能做。**
你在 admin 核准需求分析後，app 會自動：
1. 建立 `crm_deals`（stage `analysis`）並回填 `crm_analyses.deal_id`
2. 把該客戶從 `lead` 升級為 `qualified`
3. 排入一筆 `queued` 的 `pricing_analysis` run

核准報價分析後，app 會把商機推到 `proposal`，並把 `recommended_price`
finding 解析成 `crm_deals.value`。

`reviewed_by` / `reviewed_at` 一律由 server 依實際憑證判定（cookie → `admin`、
bearer token → `agent`），request body 傳什麼都會被忽略。

## 冪等性

- `save-analysis.mjs` 對每筆 message 有重複守衛（已有 completed run 就 skip）。
- `idempotency_key = inquiry-needs-<messageId>`，重跑同一個 cron tick 安全。

## 手動執行（測試用）

```bash
# 1. 看有哪些還沒分析
node scripts/crm-analyst/fetch-unanalyzed.mjs --limit 25

# 2. 分析後寫入（payload 見下方 schema）
echo '<json>' | node scripts/crm-analyst/save-analysis.mjs

# 3. 看有哪些核准後排入的報價工作
node scripts/crm-analyst/fetch-queued-runs.mjs --limit 10

# 4. 報價分析後寫入
echo '<json>' | node scripts/crm-analyst/save-pricing-analysis.mjs
```

## save-analysis 輸入 schema

```jsonc
{
  "agentName": "crm-inquiry-analyst",
  "model": "claude-opus-4",
  "promptVersion": "needs-v1",
  "items": [
    {
      "messageId": 16,
      "client": {
        "name": "獨立遊戲工作室（羅心妍）",
        "clientType": "company",
        "industry": "遊戲",
        "website": null,
        "summary": "獨立遊戲團隊，需固定風格的批次角色/場景美術。",
        "tags": ["影像生成", "批次生成"]
      },
      "analysis": {
        "title": "獨立遊戲美術批次生成需求分析",
        "summary": "團隊無全職美術，需一套固定風格一次產出十二張同系列角色圖。",
        "findings": [
          { "label": "pain_point", "detail": "無預算養全職美術" },
          { "label": "outputs", "detail": "一次十二張同系列角色立繪＋場景概念圖" },
          { "label": "constraint", "detail": "需維持跨圖風格一致性" },
          { "label": "open_question", "detail": "現有美術規格／參考風格為何？" }
        ],
        "recommendations": ["先用參考圖建立 LoRA/風格基準，產一組 12 張驗證一致性"],
        "evidence": [{ "title": "網站諮詢 #16", "note": "羅心妍 2026-07-27 來訊" }],
        "confidence": 74
      },
      "activity": {
        "subject": "網站諮詢：影像生成",
        "content": "原始訊息全文…"
      }
    }
  ]
}
```

finding label 字典見 `docs/crm/analysis-schemas.md`（needs 類）。

## save-pricing-analysis 輸入 schema

```jsonc
{
  "model": "claude-opus-4",
  "promptVersion": "pricing-v1",
  "items": [
    {
      "runId": 42,
      "analysis": {
        "title": "獨立遊戲美術批次生成報價分析",
        "summary": "一次性建立風格基準 ＋ 12 張產出，含兩輪修改。",
        "findings": [
          { "label": "scope", "detail": "LoRA 風格基準建立、12 張角色立繪、兩輪修改" },
          { "label": "exclusion", "detail": "不含角色設定撰寫與商用授權談判" },
          { "label": "effort", "detail": "約 18 人時" },
          { "label": "base_cost", "detail": "NT$ 90,000" },
          { "label": "risk_reserve", "detail": "NT$ 15,000（風格一致性未驗證）" },
          { "label": "recommended_price", "detail": "NT$ 180,000" },
          { "label": "floor_price", "detail": "NT$ 140,000" },
          { "label": "payment_terms", "detail": "簽約 50%、交付 50%" }
        ],
        "recommendations": ["先收 30% 訂金做風格驗證，通過再進入批次產出"],
        "evidence": [{ "title": "需求分析 #12", "note": "confidence 74" }],
        "confidence": 71
      }
    }
  ]
}
```

`recommended_price` 是唯一會被 app 解析成 `crm_deals.value` 的 finding
（核准報價分析時），金額寫成什麼格式都可以，會抓第一個數字。
無法報價時改傳 `{ "runId": 42, "error": "原因" }`，run 會標成 `failed`
並顯示在 `/admin/agent-runs`。

finding label 字典見 `docs/crm/analysis-schemas.md`（pricing 類）。

## Cron 執行時 Claude 要做的事（prompt 大綱）

### Pass 1 — 新諮詢的需求分析

1. 執行 `node scripts/crm-analyst/fetch-unanalyzed.mjs --limit 25`。
2. 若 `count === 0` → 回報「本次無新諮詢」，跳到 Pass 2（不寫入）。
3. 對每筆諮詢做**繁體中文**需求分析：
   - 判斷需求類型、痛點、輸入/輸出、限制、成功指標、未解問題。
   - client 名稱用「公司/團隊（聯絡人）」格式；industry/tags 從訊息推斷。
   - confidence 反映訊息資訊量（模糊的給低分）。
4. 組出 `items[]`，`echo '<json>' | node scripts/crm-analyst/save-analysis.mjs`。

### Pass 2 — 已核准需求的報價分析

5. 執行 `node scripts/crm-analyst/fetch-queued-runs.mjs --limit 10`。
6. 若 `count === 0` → 回報「本次無待報價工作」，結束。
7. 對每筆 run，根據 `needsAnalysis`（已經人工核准過）與 `client` 做**繁體中文**報價分析：
   - 先界定 scope / exclusion，再估 effort，最後才出價。
   - 需求分析 confidence 低或 `open_question` 多時，報價 confidence 也要跟著低，
     並在 `assumption` finding 寫清楚前提。
   - 一定要給 `recommended_price`，否則商機金額不會更新。
8. 組出 `items[]`，`echo '<json>' | node scripts/crm-analyst/save-pricing-analysis.mjs`。
9. 回報：分析了幾筆、報價幾筆、skip/failed 幾筆、有無錯誤。
