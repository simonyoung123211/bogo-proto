# 促销后台原型（买1送N / 第N件优惠 / 满减折 / 会员价）

Vite + React + TypeScript 商家后台原型。本地可完整预览，线上通过 Cloudflare Workers 静态资源托管。

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

## Cloudflare Workers 部署

项目使用 `wrangler.jsonc` 中的 `bogo-merchant` Worker，构建产物目录为 `dist`，未命中的路径回退至单页应用。部署前确认 Wrangler 已登录到目标 Cloudflare 账号，然后运行：

```bash
npm run deploy
```

线上演示地址：[促销活动管理](https://promo.yangyaojun-demo.cn/)。Git 推送与 Wrangler 部署分别执行，推送本身不会替代线上发布。
