import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const BRIDGE_DIR = path.resolve(rootDir, '../../.demo-sync')
const BRIDGE_FILE = path.join(BRIDGE_DIR, 'bogo-bridge.json')

function ensureDir() {
  if (!fs.existsSync(BRIDGE_DIR)) fs.mkdirSync(BRIDGE_DIR, { recursive: true })
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * 本地 Demo 桥接：商家端 ↔ 消费者端共享买A送B活动配置
 * GET/POST /api/demo-bogo-bridge
 */
export function demoBogoBridgePlugin(): Plugin {
  return {
    name: 'demo-bogo-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/demo-bogo-bridge') return next()

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          ensureDir()
          if (req.method === 'GET') {
            if (!fs.existsSync(BRIDGE_FILE)) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ version: 1, empty: true }))
              return
            }
            const raw = fs.readFileSync(BRIDGE_FILE, 'utf8')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(raw)
            return
          }

          if (req.method === 'POST') {
            const body = await readBody(req)
            JSON.parse(body) // validate
            fs.writeFileSync(BRIDGE_FILE, body, 'utf8')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true }))
            return
          }

          res.statusCode = 405
          res.end('Method Not Allowed')
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}
