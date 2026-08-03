# 促销后台原型（买1送N / 第N件优惠 / 满减折 / 会员价）

Vite + React + TypeScript 商家后台原型，本地可完整预览；线上建议用 Cloudflare Pages 托管。

## 本地启动

```bash
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 `http://localhost:5173`）。

端口冲突时可指定：

```bash
npx vite --port 5174 --strictPort
```

生产构建预览：

```bash
npm run build
npm run preview
```

## Cloudflare Pages 部署

仓库推送到 GitHub 后，在 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**，选择本仓库。

| 配置项 | 值 |
|--------|-----|
| Framework preset | Vite（或 None） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/`（默认） |
| Node.js version | `20`（Environment variables / Builds 中设置也可） |

SPA 回退已放在 `public/_redirects`（构建后进入 `dist`），刷新子路由不会 404。

部署成功后会得到 `https://<项目名>.pages.dev` 长期在线链接；后续每次 `git push` 会自动重新部署。
