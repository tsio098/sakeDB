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

// レコード正規化：thumbnailUrl/imageUrl → image にマップしてUIコンポーネントから使えるように
function _normalizeRecord(r) {
  return {
    ...r,
    image: r.thumbnailUrl || r.imageUrl || r.image || '',
  };
}

// ─── 公開 API ───
window.API = {
  /** 全データ取得（GET）。配列を返す */
  async list() {
    const j = await _get('list');
    return (j.data || []).map(_normalizeRecord);
  },

  /** タグ＋気分定義の取得（GET） */
  async meta() {
    return _get('meta'); // { ok, tags, moods }
  },

  /**
   * 追加。formは { name, place, review, tags, rating, image?, imageName?, imageFile? } 形式
   * - image: "data:image/jpeg;base64,..." 形式の data URL（add.jsxからの入力）
   * - imageFile: File オブジェクト（クライアント側でダウンスケール→Base64化）
   * - imageUrl: 既存のDrive URL（無変更で渡す）
   * 返り値は最新の data 配列（refresh済み）
   */
  async add(form) {
    const payload = await _toPayload(form);
    const j = await _post({ action: 'add', data: payload });
    return (j.data || []).map(_normalizeRecord);
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

  // 優先順位: File（再ダウンスケール）→ image data URL → imageBase64 → imageUrl(既存) → なし
  if (form.imageFile && form.imageFile instanceof File) {
    out.imageBase64 = await downscaleToDataURL(form.imageFile);
    out.imageMime = 'image/jpeg';
    out.imageName = _safeFilename(form.name) + '.jpg';
  } else if (typeof form.image === 'string' && form.image.startsWith('data:')) {
    // add.jsx が FileReader で読んだ base64 data URL をそのまま入れている
    // 大きすぎるとGASがタイムアウトするのでcanvasで縮小
    out.imageBase64 = await _resizeDataUrl(form.image, 1280, 0.85);
    out.imageMime = 'image/jpeg';
    out.imageName = _safeFilename(form.name || form.imageName || 'sake') + '.jpg';
  } else if (form.imageBase64) {
    out.imageBase64 = form.imageBase64;
    out.imageMime = form.imageMime || 'image/jpeg';
    out.imageName = form.imageName || (_safeFilename(form.name || 'sake') + '.jpg');
  } else if (form.imageUrl) {
    out.imageUrl = form.imageUrl;
  } else if (typeof form.image === 'string' && /^https?:\/\//.test(form.image)) {
    // すでにDrive URLなどがimageに入っている場合
    out.imageUrl = form.image;
  }
  return out;
}

function _safeFilename(s) {
  return (s || 'sake').replace(/[^\wぁ-ゖァ-ヺ一-鿿]+/g, '_').replace(/^_|_$/g, '') || 'sake';
}

// data URL を canvas で縮小して新しい data URL を返す
function _resizeDataUrl(dataUrl, max, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality || 0.85));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
