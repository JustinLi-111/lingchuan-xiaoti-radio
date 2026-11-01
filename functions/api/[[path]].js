// Cloudflare Pages Function：把 /api/* 同源代理到 Supabase，避免移动网络直连 *.supabase.co 被干扰
const SUPABASE_ORIGIN = 'https://jibwaouruuokngeaqyhp.supabase.co'

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers':
    'apikey, authorization, content-type, x-client-info, x-upsert, prefer, accept, accept-profile, content-profile, range, x-supabase-api-version',
  'access-control-expose-headers':
    'content-range, content-length, accept-ranges, etag, last-modified, x-supabase-api-version',
  'access-control-max-age': '86400',
}

const DROP_REQUEST_HEADERS = [
  'host',
  'origin',
  'referer',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'cdn-loop',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]

const DROP_RESPONSE_HEADERS = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]

export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(request.url)
  const targetPath = url.pathname.replace(/^\/api/, '') || '/'
  const target = SUPABASE_ORIGIN + targetPath + url.search

  // WebSocket（Supabase Realtime）走透传：必须把上游的 webSocket 配对到客户端
  if ((request.headers.get('upgrade') || '').toLowerCase() === 'websocket') {
    const wsHeaders = new Headers(request.headers)
    ;['host', 'origin', 'referer', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-for', 'x-forwarded-proto', 'cdn-loop'].forEach(
      (name) => wsHeaders.delete(name),
    )

    const upstream = await fetch(target, { method: 'GET', headers: wsHeaders })
    // 直接把 101 响应原样返回时，客户端的 socket 并没有和上游配对，会立刻断开；
    // 必须自己构造一个带 webSocket 的 101 响应，运行时才会把两端接起来。
    if (upstream.webSocket) {
      try {
        return new Response(null, { status: 101, webSocket: upstream.webSocket })
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'WebSocket pairing failed', detail: String(err) }),
          { status: 502, headers: { 'content-type': 'application/json', ...CORS_HEADERS } }
        )
      }
    }
    return upstream
  }

  const headers = new Headers(request.headers)
  DROP_REQUEST_HEADERS.forEach((name) => headers.delete(name))

  const init = { method: request.method, headers, redirect: 'follow' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  let upstream
  try {
    upstream = await fetch(target, init)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json', ...CORS_HEADERS } }
    )
  }

  const responseHeaders = new Headers(upstream.headers)
  DROP_RESPONSE_HEADERS.forEach((name) => responseHeaders.delete(name))
  Object.entries(CORS_HEADERS).forEach(([name, value]) => responseHeaders.set(name, value))

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
