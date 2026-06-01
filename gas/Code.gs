/* ───────────────────────────────────────────────────────────
   日本酒DB — Google Apps Script Web App
   セットアップ:
   1. 対象スプレッドシート（DB / タグ管理 / 気分定義 の3シート）を開く
   2. 拡張機能 → Apps Script で新規プロジェクト作成
   3. このファイルを貼り付け、SPREADSHEET_ID を埋める（コンテナバインドなら getActiveSpreadsheet() でも可）
   4. デプロイ → ウェブアプリ → 実行ユーザー「自分」/ アクセス「全員」
   5. 発行された /exec URL をフロントの api.js の API_BASE に設定
   ─────────────────────────────────────────────────────────── */

const SPREADSHEET_ID = '1YKPMpVuAi3-hClVr-9sll24_ZgVrgW8xm7jJyISer2I';
const DRIVE_FOLDER_ID = '1HEO7kZgeRXUusgJ7tO1S_ecSu-2VgABh';
const SHEET_DB   = 'DB';
const SHEET_TAGS = 'タグ管理';
const SHEET_MOOD = '気分定義';

function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- GET: list / meta ----
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'list';
  try {
    if (action === 'meta') return json_({ ok: true, ...readMeta_() });
    return json_({ ok: true, data: readAll_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- POST: add / update / delete ----
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    if (action === 'add')    return json_(addRecord_(body.data));
    if (action === 'update') return json_(updateRecord_(body.id, body.data));
    if (action === 'delete') return json_(deleteRecord_(body.id));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- read ----
function readAll_() {
  const sh = ss_().getSheetByName(SHEET_DB);
  const rows = sh.getDataRange().getValues();
  rows.shift(); // header
  return rows
    .map((r, i) => toRecord_(r, i + 2))
    .filter(r => r.name);
}

function toRecord_(r, rowNumber) {
  const imageUrl = String(r[4] || '');
  return {
    id: rowNumber,                                  // 行番号を id に
    name: String(r[0] || ''),
    place: String(r[1] || ''),
    review: String(r[2] || ''),
    tags: String(r[3] || '').split(',').map(s => s.trim()).filter(Boolean),
    rating: Number(r[5] || 0),
    imageUrl,
    thumbnailUrl: toThumb_(imageUrl),
  };
}

function toThumb_(url) {
  const m = url.match(/\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400' : '';
}

function readMeta_() {
  const tagSh = ss_().getSheetByName(SHEET_TAGS);
  const tg = tagSh.getDataRange().getValues();
  tg.shift();
  const col = (i) => tg.map(r => String(r[i] || '').trim()).filter(Boolean);
  const tags = { prefecture: col(0), kind: col(1), flavor: col(2) };

  const moodSh = ss_().getSheetByName(SHEET_MOOD);
  const md = moodSh.getDataRange().getValues();
  md.shift();
  const byCat = {};
  md.forEach(r => {
    const cat = String(r[0] || '').trim(); if (!cat) return;
    const desc = String(r[1] || '').trim();
    const tag = String(r[2] || '').trim();
    const w = Number(r[3] || 0);
    byCat[cat] = byCat[cat] || { label: cat, desc, core: [], sub: [] };
    if (!byCat[cat].desc && desc) byCat[cat].desc = desc;
    (w >= 2 ? byCat[cat].core : byCat[cat].sub).push(tag);
  });
  return { tags, moods: Object.values(byCat) };
}

// ---- write ----
function addRecord_(data) {
  const imageUrl = data.imageBase64
    ? saveImageToDrive_(data.imageBase64, data.imageMime, data.imageName, data.name)
    : (data.imageUrl || '');
  ss_().getSheetByName(SHEET_DB).appendRow([
    data.name || '', data.place || '', data.review || '',
    (data.tags || []).join(', '), imageUrl, data.rating || '',
  ]);
  return { ok: true, data: readAll_() };
}

function updateRecord_(id, data) {
  const sh = ss_().getSheetByName(SHEET_DB);
  const row = Number(id);
  let imageUrl = data.imageUrl || sh.getRange(row, 5).getValue();
  if (data.imageBase64) imageUrl = saveImageToDrive_(data.imageBase64, data.imageMime, data.imageName, data.name);
  sh.getRange(row, 1, 1, 6).setValues([[
    data.name || '', data.place || '', data.review || '',
    (data.tags || []).join(', '), imageUrl, data.rating || '',
  ]]);
  return { ok: true };
}

function deleteRecord_(id) {
  ss_().getSheetByName(SHEET_DB).deleteRow(Number(id));
  return { ok: true };
}

// ---- image → Drive ----
function saveImageToDrive_(base64, mime, filename, sakeName) {
  const comma = base64.indexOf(',');
  const raw = comma > -1 ? base64.slice(comma + 1) : base64;
  const contentType = mime || 'image/jpeg';
  // タイムスタンプ_品名.jpg 形式（衝突回避）
  const ts = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
  const safeName = (sakeName || 'sake').replace(/[^\w぀-ヿ一-鿿]+/g, '_');
  const name = filename || `${ts}_${safeName}.jpg`;
  const blob = Utilities.newBlob(Utilities.base64Decode(raw), contentType, name);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=drive_link';
}
