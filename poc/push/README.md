# Future Alert Push PoC（フェーズ0）

iPhoneのホーム画面に追加したPWAへ、アプリを閉じた状態・画面ロック中でもWeb Push通知が届くかを検証するための最小構成です。
**本番コードではありません。** フェーズ1のUIや監視エンジンは含みません。

- フロント: `index.html` / `app.js` / `style.css` / `manifest.json` / `sw.js` / `apple-touch-icon.png`（＋`icon-192.png`, `icon-512.png`）
- 管理画面: `admin.html` / `admin.js`（`/admin` で配信）
- バックエンド: `server.js`（Node.js + Express + [web-push](https://www.npmjs.com/package/web-push)）
- 購読の保存先: `subscriptions.json`（起動時に無ければ自動作成。Gitには含めない）

アイコンはPoC用の仮画像です（紺背景にオレンジの丸と「!」をスクリプトで生成）。

---

## エンドポイント

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/` | 不要 | PoCページ（通知許可・購読ボタン） |
| GET | `/sw.js` | 不要 | Service Worker（ルート直下、`Cache-Control: no-cache`） |
| GET | `/admin` | 不要（送信操作にADMIN_TOKENが必要） | 管理画面 |
| GET | `/vapid-public-key` | 不要 | VAPID公開鍵（購読時にフロントが使用） |
| POST | `/subscribe` | 不要 | Push Subscriptionを保存（同じendpointは上書き、最大50件） |
| POST | `/unsubscribe` | 不要 | 購読解除ボタン用 |
| POST | `/send-test` | **ADMIN_TOKEN** | 即時テスト通知。不一致なら **401** |
| POST | `/send-delayed` | **ADMIN_TOKEN** | 60〜600秒後に通知（**短時間テスト専用**）。不一致なら **401** |
| GET | `/status` | 不要 | `serverStatus`, `subscriptionCount` など |

- ADMIN_TOKEN は `Authorization: Bearer <token>` または `X-Admin-Token: <token>` ヘッダーで渡します。
- `ADMIN_TOKEN` が未設定のサーバーでは `/send-test` `/send-delayed` は常に401です。
- 送信時にPushサービスが **404 / 410** を返した購読は `subscriptions.json` から自動削除し、`[store] removed expired subscription ...` とログに出します。
- `server.js` や `.env`、`subscriptions.json` は配信しません（静的ファイルは許可リスト方式）。

### 送信ボディ（`/send-test` と `/send-delayed` 共通、すべて任意）

```json
{
  "title": "Future Alert テスト通知",
  "body": "本文",
  "url": "/?from=push",
  "tag": "任意の重複まとめ用タグ",
  "subscription": { "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } },
  "delaySeconds": 300
}
```

- `url` は同一オリジンのパス（`/` 始まり）のみ有効です。それ以外は `/?from=push` になります。
- `subscription` を指定すると、保存済みの購読ではなく**その購読だけ**に送ります（下記「Render無料プランの注意」参照）。
- `delaySeconds` は `/send-delayed` のみ。60〜600の整数。省略時300。

---

## ローカル起動（任意）

ローカル（http://localhost）ではiPhone実機検証はできません。サーバーが起動するかの確認用です。

```bash
cd poc/push
npm install
npx web-push generate-vapid-keys   # 表示された Public Key / Private Key を控える
cp .env.example .env               # 値を記入（.env はGitに入りません）
set -a; source .env; set +a        # .env を環境変数として読み込む
npm start                          # http://localhost:3000
```

`server.js` は `.env` ファイルを自動では読みません（依存を増やさないため）。環境変数として渡してください。

---

## Renderへのデプロイ

HTTPSが必要なので、実機検証はRenderにデプロイして行います。
（2026-09-26 に Render 公式ドキュメントで確認: [Web Services](https://render.com/docs/web-services) / [Monorepo Support](https://render.com/docs/monorepo-support) / [Free instances](https://render.com/docs/free) / [Node version](https://render.com/docs/node-version)）

### 1. 事前準備（パソコン）

1. このリポジトリをGitHubにpushする（`.env` と `subscriptions.json` が含まれていないことを `git status` で確認）。
2. VAPID鍵を作る: `npx web-push generate-vapid-keys`
3. ADMIN_TOKEN を作る: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. GitHubからRenderへ接続

1. https://dashboard.render.com で **New > Web Service** を選ぶ。
2. Git Provider で GitHub を接続し、このリポジトリを選ぶ。
3. 作成フォームを次のように埋める。

| 項目 | 値 |
|---|---|
| Name | 任意（例 `future-alert-push-poc`。`onrender.com` のサブドメインになる） |
| Region | 任意（Singapore など日本に近いリージョンを推奨。可用リージョンは画面で確認） |
| Branch | `main` |
| **Root Directory** | `poc/push` |
| Language | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| Instance Type | Free |

- Root Directory はフォームの「Root Directory」欄、作成後は **Settings > Build & Deploy > Root Directory** で変更できます。設定するとBuild/Start Commandは `poc/push` からの相対で実行されます。
- Node.js のバージョンは `package.json` の `engines`（`22.x`）で指定しています。

### 3. Environment Variables

作成フォームの **Advanced**（作成後は **Environment** タブ）で設定します。

| Key | 値 |
|---|---|
| `VAPID_PUBLIC_KEY` | 手順1で作った Public Key |
| `VAPID_PRIVATE_KEY` | 手順1で作った Private Key |
| `VAPID_SUBJECT` | `mailto:あなたのメールアドレス`（または https のURL） |
| `ADMIN_TOKEN` | 手順1で作ったランダム文字列 |

`PORT` はRenderが自動で設定するので不要です（既定 `10000`）。

### 4. 公開URLの確認

1. **Create Web Service** を押すとデプロイが始まります。Logsに `[server] listening on :10000` が出れば起動済みです。
2. サービス画面上部に表示される `https://<Name>.onrender.com` が公開URLです。
3. パソコンで `https://<Name>.onrender.com/status` を開き、`"vapidConfigured": true` と `"adminTokenConfigured": true` を確認します。

---

## curl での送信

```bash
BASE=https://<Name>.onrender.com
TOKEN=<ADMIN_TOKEN>

# 購読件数
curl -s $BASE/status

# 即時テスト通知
curl -s -X POST $BASE/send-test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Future Alert","body":"テスト通知","url":"/?from=curl"}'

# 5分後の遅延通知（60〜600秒）
curl -s -X POST $BASE/send-delayed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delaySeconds":300,"body":"5分後の遅延通知"}'

# 認証エラーの確認（401が返ること）
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/send-test -H "Authorization: Bearer wrong"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/send-delayed -H "Authorization: Bearer wrong"

# 控えておいた購読情報に直接送る（サーバー再起動で subscriptions.json が消えた後の数時間後テスト用）
curl -s -X POST $BASE/send-test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscription\": $(cat my-subscription.json)}"
```

---

## Render無料プランの注意

Render公式ドキュメント（[Free instances](https://render.com/docs/free)、2026-09-26確認）より:

- 15分間リクエストが無いとスピンダウンし、次のリクエストで起動まで約1分かかる。
- **スピンダウン・再起動・再デプロイのたびにローカルファイルの変更は失われる。**

このため次の2点に注意してください。

1. **`/send-delayed` は5〜10分の短時間テスト専用です。** タイマーはメモリ上にあり、再起動で消えます。数時間後の予約には使いません（サーバー側で600秒を上限にしています）。
2. **`subscriptions.json` はスピンダウンで消えます。** 数時間放置するとサーバー側の購読が0件になるため、仕様書の「数時間後に `/send-test`」テストはそのままでは送り先がありません。対策として:
   - iPhoneのPoC画面の「Push Subscription」欄の内容をコピーし、パソコンに控えておく（例 `my-subscription.json`）。
   - 数時間後、管理画面の「購読情報JSON」欄に貼るか、上記curlの `subscription` 指定で送る。
   - これで「サーバーが保存しているか」ではなく「数時間後もiPhone側の購読が有効か」を検証できます。

---

## iPhone実機テスト手順（概要）

詳細なチェックリストは [`docs/TECH_VALIDATION.md`](../../docs/TECH_VALIDATION.md) にあります。

1. iPhoneのSafariで公開URLを開く。「環境」欄の表示を記録し、「通知を許可する」を押して許可できないこと（Safariタブでは通知できないこと）を確認する。
2. 共有ボタン →「ホーム画面に追加」。
3. ホーム画面の「FA PoC」アイコンから起動。「ホーム画面から起動: はい」を確認。
4. 「1. 通知を許可する」→ 許可。
5. 「2. 通知を購読する」→ ログに `サーバーに登録: HTTP 201` と `push service: web.push.apple.com` などが出る。
6. 「Push Subscription」の内容をコピーしてパソコンに控える。
7. パソコンで `/admin` を開き、ADMIN_TOKENを入れて「今すぐ送信」→ 届くか（起動中 / アプリを閉じた状態 / 画面ロック中）。
8. 「遅延通知を予約」（300秒）→ ロックして待つ。
9. 通知をタップして `/?from=push` が開き、ログに「通知タップで開かれました」が出るか。
10. 数時間後、控えた購読情報を使って「今すぐ送信」。
