import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { readFile } from "node:fs/promises"

const isProd = process.env["NODE_ENV"] === "production"

let html = await readFile(isProd ? "dist/index.html" : "index.html", "utf8")

if (!isProd) {
  // 將 Vite client 代碼注入到 HTML 可參考 https://cn.vite.dev/guide/backend-integration.html
  html = html.replace("</head>", `
    <script type="module">
        import RefreshRuntime from "/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/@vite/client"></script>
  </head>`)
}

const app = new Hono()
  .use("/assets/*", serveStatic({ root: isProd ? "dist/" : "./" })) // 路徑必須以 '/' 結尾
  .get("/*", c => c.html(html))

export default app

if (isProd) {
  serve({ ...app, port: 4000 }, info => {
    console.log(`Listening on http://localhost:${info.port}`);
  })
}