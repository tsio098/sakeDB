/* ───────────────────────────────────────────────────────────
   日本酒DB — GAS Web App API wrapper
   - Deploy 後の GAS Web App URL を API_BASE に設定
   - POST は text/plain で送信（プリフライト回避）
   - 画像はクライアント側でリサイズしてから送信
   ─────────────────────────────────────────────────────────── */

// 同一オリジンのプロキシエンドポイント（_worker.js が /api を GAS にプロキシ）
const API_BASE = '/api';

// ─── 内部ヘルパー ───
function _isConfigured() {
  return !!API_BASE;
}

async function _get(action) {
  if (!_isConfigured()) throw new Error('API_BASE not configured');
  const url = `${API_BASE}?action=${encodeURIComponent(action)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j;
}

async function _post(payload) {
  if (!_isConfigured()) throw new Error('API_BASE not configured');
  const r = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // ← プリフライト回避
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j;
}

// ─── 画像ダウンスケール（GAS送信前の必須前処理） ───
function downscaleToDataURL(file, max = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ─── 公開 API ───
window.API = {
  /** 全データ取得（GET）。配列を返す */
  async list() {
    const j = await _get('list');
    return j.data;
  },

  /** タグ＋気分定義の取得（GET） */
  async meta() {
    return _get('meta'); // { ok, tags, moods }
  },

  /**
   * 追加。formは { name, place, review, tags, rating, imageFile? } 形式
   * imageFile が File オブジェクトならクライアント側でダウンスケール→Base64化して送信
   * 返り値は最新の data 配列（refresh済み）
   */
  async add(form) {
    const payload = await _toPayload(form);
    const j = await _post({ action: 'add', data: payload });
    return j.data;
  },

  /** 更新。idは行番号（GAS側のtoRecord_でidに変換した値） */
  async update(id, form) {
    const payload = await _toPayload(form);
    return _post({ action: 'update', id, data: payload });
  },

  /** 削除 */
  async del(id) {
    return _post({ action: 'delete', id });
  },

  // 内部公開（テスト用）
  _downscale: downscaleToDataURL,
  _isConfigured,
};

async function _toPayload(form) {
  const out = {
    name: form.name || '',
    place: form.place || '',
    review: form.review || '',
    tags: form.tags || [],
    rating: form.rating || 0,
  };
  if (form.imageFile && form.imageFile instanceof File) {
    out.imageBase64 = await downscaleToDataURL(form.imageFile);
    out.imageMime = 'image/jpeg';
    out.imageName = (form.name ? form.name.replace(/[^\w぀-ヿ一-鿿]+/g, '_') : 'sake') + '.jpg';
  } else if (form.imageUrl) {
    out.imageUrl = form.imageUrl;
  } else if (form.imageBase64) {
    out.imageBase64 = form.imageBase64;
    out.imageMime = form.imageMime || 'image/jpeg';
    out.imageName = form.imageName || ((form.name || 'sake') + '.jpg');
  }
  return out;
}
