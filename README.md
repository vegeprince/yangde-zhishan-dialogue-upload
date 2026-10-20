# 暘德至善班｜班員對話成果上傳模組

獨立的 Vercel + Supabase 網站。班員免登入提交資料與對話截圖；管理者透過 Supabase Auth 登入後瀏覽、開啟私有圖片與刪除提交。

## 功能
- 預設班別：至善班
- 預設主題：同學交流與心得分享
- 姓名／暱稱、心得欄位
- 一次最多 8 張 JPG／PNG／WebP 圖片，每張 8 MB 內
- 圖片放在 Supabase **私有** Storage bucket，管理端使用短效簽名網址查看
- 管理端可搜尋、刷新、開啟圖片、刪除提交
- 不需要 Vercel 登入即可使用公開上傳頁；管理端使用 Supabase 管理帳號

## 一、建立 Supabase 資料庫與儲存空間
1. 在 Supabase 建立或選擇一個專用專案。
2. 打開 **SQL Editor**，執行 `supabase/schema.sql` 全部內容。
3. 在 **Project Settings → API**（或 API Keys）取得 Project URL 與 publishable/anon key。
4. 在 **Authentication → Sign In / Providers** 關閉公開註冊（Disable sign ups）。
5. 在 **Authentication → Users** 由管理者新增管理端 Email／密碼。不要把管理密碼放進前端程式碼。

### 權限說明
- 未登入訪客可以新增提交與上傳圖片，但不能讀取提交清單，也不能讀取私有圖片。
- 管理端登入後可以瀏覽、簽名開啟圖片及刪除資料。
- SQL 範本將「已登入」視為管理者；因此務必關閉公開註冊，且只由可信任管理者建立使用者。若你的專案已允許其他使用者登入，請先收緊 SQL policy，再部署。
- 前端的 MIME／檔案大小檢查是使用體驗措施；bucket 也設定 8 MB 與允許的圖片類型。若要防垃圾提交，正式公開前建議再加入 CAPTCHA／速率限制。

## 二、在本機設定
1. 安裝 Node.js 20 或更新的 LTS 版本。
2. 複製 `.env.example` 並命名為 `.env`。
3. 填入：
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```
   請使用 publishable/anon key；**絕不可使用 service_role/secret key**。
4. 執行：
   ```bash
   npm install
   npm run dev
   ```
5. 開啟終端機顯示的本機網址測試。

## 三、部署到 Vercel
### 方法 A：GitHub（建議）
1. 將本專案解壓縮，建立新的 GitHub repository，將檔案上傳。
2. 在 Vercel 選 **Add New → Project**，匯入這個新的 repository。
3. Framework Preset 選 **Vite**；Build Command `npm run build`；Output Directory `dist`。
4. 在 Vercel **Settings → Environment Variables** 新增：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 部署完成後重新部署一次（確保環境變數套用）。
6. 公開上傳頁是網站首頁；管理端網址是在網域後加 `#admin`，例如 `https://your-site.vercel.app/#admin`。

### 方法 B：Vercel CLI
在專案資料夾執行 `npm install`、`npm run build`，再用 Vercel CLI 匯入並部署；同樣要在 Vercel 設定上述環境變數。

## 四、部署前檢查
- [ ] SQL 已成功執行
- [ ] Supabase 已關閉公開註冊
- [ ] 管理員帳號已建立
- [ ] Vercel 環境變數已設定
- [ ] 用無痕視窗測試：訪客能提交，但不能讀取管理資料
- [ ] 用管理員帳號登入 `/#admin`，確認能看提交並開啟圖片
- [ ] 測試刪除前先使用測試資料

## 注意事項
- 本 ZIP 不包含你的 Supabase 專案金鑰，也尚未部署到任何 Vercel 網址。
- `VITE_` 開頭的環境變數會打包到瀏覽器，因此只能放公開 publishable/anon key；資料安全依賴 Supabase RLS 與 Storage policies。
- 若網站已經有真實個資，請設定適當的保存期限、隱私告知及資料刪除流程。
