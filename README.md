# 職業安全衛生學習與測驗平台

依「一般安全衛生教育訓練」教材整理的五階段學習網站與線上測驗。手機優先，前端部署在 GitHub Pages，成績存放在 Supabase。

## 功能

- 五階段教材：學習目標、核心觀念、名詞、真實案例、重點整理、原始教材頁碼
- 線上測驗：每階段 20 題、共 100 題，一次一題，80 分通過，可重新測驗
- 答案解析：提交後才能查看，可切換全部題目或只看錯題
- 成績管理：管理者登入後可搜尋、篩選、看統計與作答明細，並匯出 CSV
- 分享：網址、QR Code、LINE、Email
- PDF A：教材與 100 題題庫，不含答案，公開下載
- PDF B：100 題答案解析，只放在管理者可讀的私有空間

## 安全設計

| 項目 | 做法 |
| --- | --- |
| 正式答案 | 只存在 Supabase 的 `question_keys`，學員端無法讀取；不提交到本 Repository |
| 評分 | 由資料庫函式 `submit_attempt` 依正式答案計算，前端只送出選項 |
| 學員寫入 | 只能透過 Edge Function，含輸入驗證、每 IP 限流、一次性測驗憑證 |
| 重複提交 | 同一次測驗只能提交一次，紀錄於交易中鎖定 |
| 管理者 | Supabase Auth 登入，且必須列在 `admins` 表；權限由 RLS 判斷，不靠前端隱藏 |
| 金鑰 | 前端只有公開的 anon key；service role key 只存在 Supabase |
| 示範模式 | 未設定 Supabase 時使用另外的 15 題示範題，網站內沒有任何正式答案 |

## 專案結構

```
src/
  content/                 五階段教材、示範題、外部查證來源
  pages/                   學員端頁面
  admin/                   管理者後台，另外打包，學員不會下載
  lib/                     測驗 API、評分、CSV、設定
supabase/
  migrations/              資料表、RLS、測驗與評分函式、私有 Storage
  functions/               start-attempt、submit-attempt、get-review
  tests/                   資料庫與 Edge Function 測試
  create-admin.sql         設定管理者
  approve-questions.sql    題庫審核通過後開放測驗
scripts/
  build-questions.mjs      由題庫原稿產生正式題庫與 seed SQL
  validate-questions.mjs   題庫檢查：題數、題型、答案分布、重複題、頁碼
  build_pdfs.py            產生 PDF A 與 PDF B
  build_review_sheet.py    產生題庫審核表
public/downloads/          PDF A
content-private/           含答案的檔案，已列入 .gitignore
```

## 本機開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev
```

`npm run dev` 不會讀取 `.env.production`，因此本機開發預設為示範模式；要連接 Supabase，複製 `.env.example` 為 `.env.local` 並填入。

常用指令：

```bash
npm test                                   # 單元測試
node scripts/validate-questions.mjs        # 檢查示範題
node scripts/validate-questions.mjs --private  # 另外檢查正式題庫
npm run build                              # 建置
```

## 目前部署狀態

| 項目 | 狀態 |
| --- | --- |
| Supabase 專案 | `osh-learning-platform`，ref `xydhdekmzjxhokliwiwt`，東京區域 |
| 資料庫結構、RLS、私有 Storage | 已套用 |
| 100 題題庫 | 已匯入並全部開放（approved），校驗碼與本機題庫一致；尚未經人工逐題審核 |
| Edge Functions | start-attempt、submit-attempt、get-review 已部署 |
| 前端連線設定 | `.env.production` |
| 管理者帳號 | johnsonjunior37@gmail.com |
| PDF B | 已上傳至 private-docs |
| GitHub Pages | 已上線：https://johnsonjunior37.github.io/osh-learning-platform/ |

要暫停單一題目：`update public.question_keys set review_status = 'draft' where question_id = 'S1-01';`，該階段可用題數少於 20 題時會自動停止開放。

Edge Function 預設只接受 `https://johnsonjunior37.github.io` 的請求；如需其他網域，在 Supabase 設定 `ALLOWED_ORIGINS` secret。限流用的鹽值未另外設定時，以伺服端金鑰代替。

## 上線步驟

以下為從零建立的完整步驟，供日後重建或搬移時參考。

### 1. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立專案，區域建議選 Northeast Asia (Tokyo)。
2. Authentication → Sign In / Providers，關閉 **Allow new users to sign up**，避免任何人自行註冊。
3. 在 Project Settings → API 記下 **Project URL** 與 **anon / publishable key**。

### 2. 建立資料庫

在 Supabase 後台 SQL Editor 依序執行：

1. `supabase/migrations/20261106000001_init.sql`
2. `supabase/migrations/20261106000002_storage.sql`
3. `content-private/seed.private.sql`，匯入 100 題題庫，此檔由管理者另外保管

也可以使用 Supabase CLI：

```bash
npx supabase login
npx supabase link --project-ref 你的專案代碼
npx supabase db push
psql "$(npx supabase db url)" -f content-private/seed.private.sql
```

### 3. 部署 Edge Functions

需要在電腦上使用 Supabase CLI。兩個 secret 為選擇性設定：

```bash
npx supabase secrets set RATE_LIMIT_SALT=$(openssl rand -hex 32)
npx supabase secrets set ALLOWED_ORIGINS=https://johnsonjunior37.github.io
npx supabase functions deploy start-attempt --no-verify-jwt
npx supabase functions deploy submit-attempt --no-verify-jwt
npx supabase functions deploy get-review --no-verify-jwt
```

`ALLOWED_ORIGINS` 只填網域，不含路徑；多個網域以逗號分隔。

### 4. 設定管理者

1. Authentication → Users → Add user，建立管理者的 Email 與密碼。
2. 將 `supabase/create-admin.sql` 中的 Email 換成該帳號，在 SQL Editor 執行。

### 5. 上傳私有文件

Storage → `private-docs`，上傳：

- `pdf-b-answers.pdf`：PDF B 答案解析
- `original-course.pdf`：原始教材，選擇性

檔名需完全相同，管理者後台的下載按鈕才找得到。

### 6. 審核題庫並開放測驗

1. 用 `content-private/question-review.private.xlsx` 逐題審核。
2. 修改題目時，編輯 `content-private/questions.source.private.json`，執行 `node scripts/build-questions.mjs` 重新產生 seed，再到 SQL Editor 執行新的 seed。
3. 審核完成後執行 `supabase/approve-questions.sql`。

每階段至少 20 題設為 approved，該階段的正式測驗才會開放；尚未開放時學員會看到「此階段題庫尚未開放」。

### 7. 部署 GitHub Pages

1. 將 Supabase 的 Project URL 與 publishable key 填入 `.env.production`。
2. Settings → Pages → Source 選 **GitHub Actions**。
3. 推送到 `main` 或在 Actions 頁手動執行，完成後網址為 `https://johnsonjunior37.github.io/osh-learning-platform/`。

網站使用 HashRouter，網址形如 `/#/learn/1`，重新整理不會出現 404。

## 修改內容

- 教材：`src/content/stage1.ts` 到 `stage5.ts`，每段都要標頁碼
- 外部查證來源：`src/content/sources.ts`，需附網址與查證日期
- 示範題：`src/content/demo-questions.json`，不可與正式題目相同
- 修改教材或題庫後重新產生 PDF：

```bash
pip install weasyprint openpyxl
npx tsx scripts/export-content.ts pdf-build/content.json
python3 scripts/build_pdfs.py
```

PDF 使用 Noto Sans CJK TC 字型，執行前請先安裝。

## 測試

| 測試 | 指令 | 內容 |
| --- | --- | --- |
| 單元測試 | `npm test` | 評分規則、示範題、CSV 公式注入防護 |
| 資料庫 | `scripts/test-db.sh` | 30 項：RLS、答案不外流、評分、重複提交、逾時、管理者權限、限流 |
| Edge Function | `deno test -A --config supabase/tests/deno.json supabase/tests/functions.test.ts` | CORS、輸入驗證、完整流程、限流 |

資料庫與 Edge Function 測試需要本機 PostgreSQL 16，詳見各測試檔開頭說明。

## 內容依據與限制

- 教材內容以原始教材為準；可能過時的法規、罰則、健檢頻率與急救內容，網站與 PDF 都標示「需確認現行規範」，並附來源與查證日期。
- 職業安全衛生法已於 2025 年 12 月修正，題庫不考罰則金額與條號。
- 勞動部 2026 年 4 月預告修正健康檢查頻率，題庫不考健檢頻率。
- 階段五的真實案例取自臺中市勞動檢查處與臺北市政府公開資料。
- 學員不需帳號，姓名無法驗證真實身分，每次測驗會建立一筆獨立的學員資料。
