# 日本酒DB Web アプリ — 実装パッケージ

Claude design で作られた参照実装をベースに、**ビルド不要のPWA**として動作する状態に整理したもの。Google Apps Script（GAS）をバックエンドに、Cloudflare Pages または GitHub Pages で配信し、iPhone「ホーム画面に追加」でネイティブアプリのように使えます。

---

## ディレクトリ構成

```
webapp/
├── index.html              # エントリーポイント
├── manifest.webmanifest    # PWAマニフェスト
├── service-worker.js       # オフラインキャッシュ用SW
├── styles.css              # スタイル
├── data.js                 # 初期データ（GAS取得失敗時のフォールバック）
├── api.js                  # GAS Web App 呼び出しラッパー
├── components.jsx          # 共通コンポーネント
├── screens-home.jsx        # ホーム画面
├── sheets.jsx              # シート系UI（フィルタ/検索/トースト/ローディング/空状態）
├── detail.jsx              # 詳細モーダル
├── add.jsx                 # 追加・編集モーダル
├── browse.jsx              # ブラウズ画面
├── app.jsx                 # ルート
├── icons/                  # PWAアイコン一式
│   ├── icon.svg            # マスター
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── apple-touch-icon-180.png
│   └── favicon-32.png
└── gas/
    └── Code.gs             # Apps Script に貼り付けるバックエンド
```

---

## セットアップ手順

### Step 1. GAS バックエンドのデプロイ

1. スプレッドシート（DB / タグ管理 / 気分定義 の3シート構成）を開く
2. **拡張機能 → Apps Script** をクリック
3. デフォルトの `Code.gs` を全て削除し、`webapp/gas/Code.gs` の中身を貼り付け
4. 1行目の `SPREADSHEET_ID` を自分のスプレッドシートIDに書き換え（既に `1YKPMpVuAi3-hClVr-9sll24_ZgVrgW8xm7jJyISer2I` を埋め込み済み）
5. 右上 **デプロイ → 新しいデプロイ** → 種類「ウェブアプリ」
6. 実行ユーザー：**自分** / アクセスできるユーザー：**全員**
7. デプロイをクリック → 初回は権限承認（Drive・Sheets スコープを許可）
8. 発行された URL（`https://script.google.com/macros/s/XXX/exec`）をコピー

### Step 2. フロントエンドの設定

`api.js` の1行目を編集：

```js
const API_BASE = 'https://script.google.com/macros/s/XXX/exec';  // ← Step 1 のURL
```

### Step 3. デプロイ

#### A. Cloudflare Workers（wrangler CLI / 推奨）

WorkersのStatic Assets機能で配信します。`wrangler.toml` は同梱済み。

```bash
# 初回のみ（Node.js が必要）
npm install -g wrangler
wrangler login       # ブラウザで認証

# デプロイ
cd webapp
wrangler deploy
```

完了すると `https://sake-db.<your-subdomain>.workers.dev` が発行されます。
2回目以降の更新は `wrangler deploy` を再実行するだけ。

> 独自ドメインを設定する場合：Cloudflareダッシュボード → Workers & Pages → `sake-db` → Settings → Domains & Routes

#### B. Cloudflare Pages（ダッシュボードからアップロード）

Pagesが選択できる環境ならこちらが簡単：

1. dashboard → Workers & Pages → 「Create」→「Pages」
2. 「Upload assets」で `webapp/` フォルダの中身をドラッグ＆ドロップ
3. プロジェクト名 → Deploy

#### C. GitHub Pages（代替）

1. GitHub で新規リポジトリ作成（例: `sake-db`）
2. `webapp/` の中身をリポジトリのルートにプッシュ
3. リポジトリ → Settings → Pages → Source: `main` ブランチ / `/ (root)`
4. 発行された `https://{username}.github.io/sake-db/` を Safari で開く

### Step 4. iPhone「ホーム画面に追加」

1. iPhone Safari で公開URLを開く
2. 共有ボタン（□↑）をタップ
3. 「**ホーム画面に追加**」を選択
4. 名前を確認して「追加」
5. ホーム画面にアイコンが追加され、タップでスタンドアロン起動

> **PWAとして動作する条件**：
> - HTTPS で配信されていること（Cloudflare/GitHub Pages はデフォルトでHTTPS）
> - `manifest.webmanifest` と `service-worker.js` が読み込めること
> - `apple-touch-icon` が存在すること（180×180 PNG）
> - 全て満たしているので「ホーム画面に追加」が機能します

---

## ローカル動作確認

ビルド不要なので、簡易HTTPサーバで開けます：

```bash
cd webapp
python3 -m http.server 8080
# ブラウザで http://localhost:8080
```

ChromeのDevToolsで Application → Service Workers / Manifest を確認できます。

---

## 既知の注意点

### 描画パフォーマンス（重要）
長いリストの各カードに `backdrop-filter` を**重ねない**こと。レンダリングが崩れる既知バグがあります。`card-frost` クラス（半透明白の単色）で代用しています。詳細は `README` 原典のセクション §8 を参照。

### GAS の CORS
- POST は `Content-Type: text/plain;charset=utf-8` で送ることでプリフライトを回避（`api.js` 実装済み）
- どうしても安定しない場合は、SPA 自体を GAS の `HtmlService` から配信する代替案あり（`GAS_BACKEND.md` 参照）

### 画像アップロード
- iPhone で撮った画像はそのままだと数MBあるため、`api.js` 内の `downscaleToDataURL()` で長辺1280px / JPEG 0.85 にダウンスケールしてから送信
- GAS 側で Base64 デコード → `DriveApp.getFolderById('1HEO7kZgeRXUusgJ7tO1S_ecSu-2VgABh')` に保存 → 共有設定（リンクを知る全員が閲覧）→ URL を E列に記録

### 初回ロード
- GAS Web App は初回コールドスタートで2〜3秒遅い
- `localStorage` キャッシュがあるので体感は速い（裏で更新→次回反映）

---

## 受け入れチェック（QA）

- [ ] iPhone Safari で公開URLを開いて画面が崩れず表示される
- [ ] 「今日の気分」タップで並び替えが効く
- [ ] フィルタ（都道府県/タグ/評価）が AND で効く
- [ ] 詳細シートが下からスライドして開く
- [ ] 追加フォームで「メロン」「すっきり」など書くとタグ候補が出る（ひら/カタ同一視）
- [ ] 写真ピッカーで画像を選びプレビュー表示できる
- [ ] 保存後、Drive フォルダに画像が追加されシートのE列にURLが入る
- [ ] 「ホーム画面に追加」でアイコンが出てスタンドアロン起動する
- [ ] オフラインでも一覧（キャッシュ済み）が見られる

---

## 参考ドキュメント

- 原典README（Claude design 成果物）
- `DESIGN_TOKENS.md` — 色・タイポ・余白・ガラスのレシピ
- `DATA_MODEL.md` — Sheets スキーマ / API レスポンス形 / 同義語辞書
- `GAS_BACKEND.md` — GASバックエンドの詳細
- `MOOD_ICONS.md` — 気分8カテゴリのSVGアイコン定義
