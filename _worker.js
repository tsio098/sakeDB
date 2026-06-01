/* Cloudflare Worker — sake-db
   - `/api` および `/api?...` を Google Apps Script Web App にプロキシ（CORS回避）
   - それ以外は静的アセット（webapp/ 配下）を配信
*/

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzslz1QWMUvvM1sb8Zde4LvMohqKns4WN4FZLfBPPq7reAIo7z_NFht0YLOAJcJlVPi/exec';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API プロキシ ──
    if (url.pathname === '/api' || url.pathname === '/api/') {
      const target = GAS_URL + (url.search || '');
      const init = {
        method: request.method,
        redirect: 'follow',
        headers: {},
      };

      if (request.method === 'POST') {
        init.body = await request.text();
        init.headers['Content-Type'] = 'text/plain;charset=utf-8';
      }

      try {
        const upstream = await fetch(target, init);
        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ── 静的アセット ──
    return env.ASSETS.fetch(request);
  },
};
