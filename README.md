# 甄選入學成績倍率篩選系統

以 Next.js 建置的技專校院甄選入學倍率與成績分布模擬工具，支援 114、115 年度資料、Bootstrap 樣本補足及跨校倍率查詢。

## 本機執行

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 正式建置

```bash
npm run build
```

## 內建資料

Vercel 部署所需的年度資料位於 `public/`：

- `114全國一階篩選倍率.csv`
- `114_全國類群成績.csv`
- `115全國一階篩選倍率.csv`
- `115_全國類群成績.csv`

甄選成績由使用者在網頁中上傳，不納入儲存庫。

## Vercel 部署

將儲存庫連結至 Vercel 後，使用預設 Next.js 設定即可部署。推送到 Vercel 追蹤的 GitHub 分支會自動觸發更新。
