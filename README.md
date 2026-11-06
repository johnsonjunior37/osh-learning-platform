# 職業安全衛生學習與測驗平台

依「一般安全衛生教育訓練」教材整理的五階段學習網站與線上測驗。手機優先，部署於 GitHub Pages，成績資料存於 Supabase。

## 開發進度

| Phase | 內容 | 狀態 |
| --- | --- | --- |
| 1 | 資料分析與系統規劃 | 完成 |
| 2 | 首頁、五階段教材、分享與 QR Code | 完成 |
| 3 | 100 題測驗系統 | 未開始 |
| 4 | Supabase 成績管理 | 未開始 |
| 5 | 測試、PDF 與 GitHub Pages 部署 | 未開始 |

## 本機開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev
```

開啟終端機顯示的網址，路徑為 `/osh-learning-platform/`。

## 專案結構

```
src/
  content/       五階段教材內容，每段標示原始教材頁碼
    sources.ts   外部查證來源與查證日期
  components/    版面與內容區塊元件
  pages/         各頁面
  lib/           設定與本機閱讀進度
```

## 示範模式

未設定 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY` 時，網站以示範模式運作，頂端顯示「示範模式：測驗成績不會儲存」。

## 安全原則

- 正式答案與解析只存放在 Supabase，不提交到本 Repository
- Supabase service role key 只存放在 Supabase Edge Function Secrets
- 原始教材 PDF 在確認公開授權前不放入 Repository

## 內容依據

教材內容以原始教材為準。可能已過時的法規、罰則、訓練時數與急救內容，網站上以「需確認現行規範」標示，並附官方或公開來源與查證日期。
