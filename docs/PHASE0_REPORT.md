# Future Alert フェーズ0 完了報告

作成日: 2026-09-26。フェーズ1（UI実装）には進んでいません。外部データAPIへの本番接続もしていません。

---

## 1. 作成したファイル一覧

プロジェクトルート: `/mnt/project-files/future-alert/`（`git init` 済み、ローカルに1コミット。GitHubへのpushはしていません）

| パス | 内容 |
|---|---|
| `CLAUDE.md` | プロジェクト・コンセプト・設計原則16項目・作業ルール |
| `.gitignore` | `.env`、`subscriptions.json`、`node_modules/` など |
| `poc/push/server.js` | Express + web-push のPoCサーバー |
| `poc/push/index.html` / `app.js` / `style.css` | 通知許可・購読ボタンのあるPoCページ |
| `poc/push/manifest.json` | `display: "standalone"` |
| `poc/push/sw.js` | Push受信・通知表示・`notificationclick` |
| `poc/push/admin.html` / `admin.js` | `/admin` 管理画面 |
| `poc/push/apple-touch-icon.png` / `icon-192.png` / `icon-512.png` | **仮画像**（スクリプト生成） |
| `poc/push/package.json` / `package-lock.json` / `.env.example` | 依存関係と環境変数の雛形 |
| `poc/push/README.md` | Renderデプロイ手順・curl・実機テスト手順 |
| `docs/TECH_VALIDATION.md` | 実機検証チェックリスト16項目＋iOS Web Push調査 |
| `docs/API_RESEARCH.md` | 経路・天気・遅延・混雑の調査、関西の代替案、未確認一覧 |
| `docs/ENGINE_DESIGN.md` | Trip / Event / Alert / 通知判定 / API回数 / 停止 / 通知文 / 帰宅予定時刻未定 |
| `docs/PLATFORM_COMPARISON.md` | Render / Supabase / Cloudflare の比較（タスク4） |
| `docs/RISKS.md` | 技術的リスク・終電の誤解防止・Fallback・`prefers-reduced-motion`（タスク5） |
| `docs/PHASE0_REPORT.md` | この報告 |

タスク4・5は仕様に出力先の指定が無かったため、`docs/PLATFORM_COMPARISON.md` と `docs/RISKS.md` に分けました。

## 2. 通知PoCの概要

- Node.js 22 + Express 4 + web-push 3.6.7。フロントとAPIを同一オリジンで配信し、`/sw.js` はルート直下（キャッシュ無効）。
- `POST /subscribe`・`GET /status` は認証なし。`POST /send-test`・`POST /send-delayed` は `ADMIN_TOKEN` 不一致で401。
- `/send-delayed` は60〜600秒のみ受け付け（短時間テスト専用）。
- 送信時に404/410が返った購読は自動削除してログ出力。
- VAPID鍵・ADMIN_TOKENは環境変数のみ。`server.js`・`.env`・`subscriptions.json` は配信しない（許可リスト方式）。
- 通知タップ時は、既存のPoCページがあればそこへ移動、なければ新規に開く。同一オリジンのURLのみ許可。
- **ローカルで確認済み:** 静的配信、401判定、購読登録、送信、410での自動削除、遅延通知の予約受付（偽のPushサービスを使用）。**遅延通知が実際に発火するところ、Apple のPushサービスへの送信、iPhone実機は未確認**。

**仕様への追加（報告）:** Render無料プランはスピンダウン時にファイルが消えるため、仕様どおりだと数時間後テストの時点で `subscriptions.json` が空になる可能性が高いです。仕様は変えず、`/send-test`・`/send-delayed` に任意の `subscription` 指定を追加し、iPhone画面から控えた購読情報へ直接送れるようにしました。

## 3. Renderへのデプロイ手順

詳細は `poc/push/README.md`。

1. GitHubにpush（`.env`・`subscriptions.json` が含まれないことを確認）。
2. `npx web-push generate-vapid-keys` でVAPID鍵、ランダム文字列でADMIN_TOKENを作成。
3. Render の **New > Web Service** でリポジトリを選択。
4. Root Directory `poc/push`、Build Command `npm install`、Start Command `npm start`、Instance Type Free、Region は Singapore を推奨（日本リージョンは無し）。
5. Environment に `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`（`mailto:...`）/ `ADMIN_TOKEN`。
6. `https://<Name>.onrender.com/status` で `vapidConfigured: true` と `adminTokenConfigured: true` を確認。

## 4. iPhone実機テスト手順

詳細は `docs/TECH_VALIDATION.md`（結果記入欄つき）。

1. Safariで開き、通知できないことを確認。
2. 共有 →「ホーム画面に追加」→ アイコンから起動。
3. 「通知を許可する」→「通知を購読する」。購読情報をコピーしてパソコンに控える。
4. `/admin` から即時送信（起動中 / 閉じた状態 / 画面ロック中）。
5. 300秒の遅延通知を予約してロック。
6. 通知タップで `/?from=push` が開くか。
7. 数時間後、控えた購読情報を使って即時送信。
8. 再起動・再インストール・失効時の挙動、401、`/status` を確認。

## 5. API調査の要約

| データ | 結論 |
|---|---|
| 経路・終電 | 駅すぱあと API（`searchType=lastTrain`）と NAVITIME API（`last_operation`）に終電探索の指定あり。Google Routes API は日本の公共交通対応が**未確認**。ジョルダンのオープンAPIは時刻表を扱わず、Biz APIは¥354,000〜 |
| 天気 | 気象庁XMLは無料・商用可（出典表示）だが時間単位の降水予報を機械可読で取る方法は未確認。Open-Meteo（JMA MSM 5km・3時間更新）は無料だが**非商用のみ**。OpenWeather One Call 3.0 は1日1,000回無料・分単位降水あり |
| 遅延 | ODPTに**関西の鉄道運行情報は見当たらない**。関西を含む全国の運行情報はレスキューナウ系の商用データ（駅すぱあと・ジョルダン経由も）で、料金は見積もり |
| 混雑 | **関西の鉄道混雑はAPIで取得できない**。NAVITIMEの混雑度は首都圏のみ。MVPでは扱わない案 |

## 6. 監視エンジン設計の要約

- Trip: `planned → active → completed`、`planned/active → cancelled`。開始2時間前から低頻度監視、終了で即停止。押し忘れ対策の自動終了（帰宅予定+2時間、終電+1時間、最大24時間）。
- Event: 事実。生成・更新・取消（2回連続で消えたら確定）・期限切れ。仕様のモデルに `dedupeKey`・`revision`・`detail` などを追加。
- Alert: 15分以内のEventを統合し、行動（今すぐ出発・○時までに出発・傘・別ルート確認・タクシー）を1つ決める。
- 通知判定: 最小 / 標準（既定案） / 全部。重複防止（dedupeKey・`tag`・`Topic`）、1Trip最大5回・最小間隔15分、`danger` 格上げのみ例外。通知しない時間帯の例外は「ユーザーが選ぶ（既定ON）」を提案。
- API回数: 仕様の前提（5分ごと・3API）で1,000ユーザー月約156万回。更新頻度に合わせた可変間隔と共有キャッシュで約13万回（約1/12）。
- 通知文: MVPはルールベースを提案（正確性・速度・費用・誤通知リスクで優位）。
- 帰宅予定時刻が未定: 既定値を「終電まで」とし、途中で入力を促す通知は送らない案。

## 7. 本番実行基盤の比較結果

| 基盤 | 目安 | 長所 | 短所 |
|---|---|---|---|
| Render 有料 | 約$13/月〜 | PoCのコードがそのまま動く | 日本リージョン無し、単一プロセスが止まると全停止 |
| **Supabase Pro（第一候補）** | 約$25/月〜 | 東京リージョン、Postgres・Cron・関数が一体 | Edge FunctionのCPU 1回2秒、Denoでweb-pushが動くか**未確認** |
| Cloudflare Workers Paid（次点） | 約$5/月〜＋ストレージ | 最安、サーバー管理不要 | 独自ランタイム、web-pushが動くか**未確認**、DB選定が必要 |

## 8. 未確認項目（主なもの）

- iPhone実機での全16項目（ユーザーによる実施待ち）
- Google Routes API の日本（大阪・京都）での公共交通対応、SKU
- 駅すぱあと・NAVITIME・ジョルダンの保存条件・表示義務・規約、各プランでの終電探索可否
- NAVITIMEのマーケット経由で終電判定が実時刻表ベースになるか
- 関西私鉄（大阪メトロ・阪急・阪神・京阪・近鉄・南海）のAPI提供有無
- 商用の運行情報データの料金・更新頻度
- Open-Meteo商用プランの月額、OpenWeather無料プランの商用可否
- 気象庁の予報業務許可が必要になる範囲
- Supabase Edge Functions / Cloudflare Workers で web-push が動くか
- iOSのService Workerのバックグラウンド実行時間、ホーム画面Webアプリの7日ストレージ規則の現行挙動、PWAでの端末内予約通知

一覧の詳細は `docs/API_RESEARCH.md` 6章と各文書の「未確認」を参照。

## 9. 技術的リスク

詳細は `docs/RISKS.md`。影響が最も大きいのは次の3つ。

1. **終電情報の正確性:** 時刻表ベースの終電が遅延・臨時ダイヤを反映しない。根拠と最終確認時刻の表示、「見込み」表現、安全マージン、公式への導線で誤解を防ぐ。
2. **サービス停止時に「通知が来ない＝大丈夫」と誤解される:** 死活監視と、アプリ画面での「見守り停止中」表示。
3. **関西のリアルタイムデータ不足:** 遅延は有料データ、混雑はMVP対象外。

ほか: iOS Web Pushの制約、バックグラウンド処理不可、位置情報、API料金、規約、購読失効、Render無料プランのスリープ、通知疲れ、重複送信。

## 10. フェーズ1開始前に決めるべき事項

1. 実機検証（TECH_VALIDATION 16項目）の結果を見て、Web Pushを前提に進めてよいか
2. MVPの対象地域（関西のみ／首都圏も含める）
3. 経路・終電APIの採用候補（駅すぱあと／NAVITIME／Google）と、無料枠で始めるか有料契約するか
4. 遅延データをMVPに含めるか（有料データの見積もりを取るか）
5. 天気データ（Open-Meteo非商用で始めるか、商用前提で選ぶか）
6. 混雑をMVPから外すか
7. 本番実行基盤（Supabase第一候補の技術検証を行うか）
8. データキー名（`帰宅先` を日本語キーにするか）と、開始されなかったTripの扱い
9. 通知レベルの既定値、通知しない時間帯の例外の既定値、1Tripあたりの通知上限
10. 帰宅予定時刻が未定のときの既定（「終電まで」でよいか）
11. 商用化・収益化の予定（Open-Meteo・各APIの無料枠条件に直結）
12. 利用規約・免責の文面を誰がいつ用意するか
