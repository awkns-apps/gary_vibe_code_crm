# Analysis payload schemas

All analyses share `clientId`, optional `dealId`, `type`, `title`, `summary`,
`findings`, `recommendations`, `evidence`, `confidence` and `createdBy`.

## Needs analysis finding labels

`current_process`, `pain_point`, `volume`, `tools`, `inputs`, `outputs`,
`constraint`, `success_metric`, `risk`, `open_question`.

## Market analysis finding labels

`market_definition`, `target_segment`, `market_size`, `trend`, `competitor`,
`alternative`, `price_range`, `opportunity`, `threat`, `valid_until`.

## Pricing analysis finding labels

`scope`, `exclusion`, `effort`, `base_cost`, `third_party_cost`,
`risk_reserve`, `target_margin`, `recommended_price`, `floor_price`,
`payment_terms`, `maintenance`, `valid_until`, `assumption`.

Example:

```json
{
  "clientId": 12,
  "type": "needs",
  "title": "客服工單自動分類需求分析",
  "status": "needs_review",
  "summary": "每日約 300 張工單，目前由兩人手動分類。",
  "findings": [
    { "label": "pain_point", "detail": "分類耗時且標準不一致" }
  ],
  "recommendations": ["先以三個月歷史工單建立離線原型"],
  "evidence": [
    { "title": "訪談紀錄 2026-07-20", "note": "營運主管確認" }
  ],
  "confidence": 82,
  "createdBy": "needs-analysis-agent"
}
```
