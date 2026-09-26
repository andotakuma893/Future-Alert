# PLATFORM_COMPARISON — 本番監視エンジンの実行基盤比較

フェーズ0 タスク4。**実装はしていません。**
情報確認日: **すべて 2026-09-26**。確認できなかった項目は「未確認」。

監視エンジンに求めること（[`ENGINE_DESIGN.md`](./ENGINE_DESIGN.md) より）:

- 1分ごと程度の定期実行（通知時刻の精度のため）
- Trip / Event / Alert / 購読を保存する永続DB
- 外部APIの呼び出し（共有キャッシュ付き）
- Web Push送信（VAPID署名とペイロード暗号化。Node.jsなら `web-push` ライブラリ）
- 止まったときに気づけること

---

## 1. 比較表

| 項目 | 1. Render 有料プラン | 2. Supabase Cron + Edge Functions | 3. Cloudflare Workers + Cron Triggers |
|---|---|---|---|
| **定期実行方法** | (a) Cron Job サービス（UTC、同時実行は1つまで、12時間で強制停止） (b) 常駐の Web Service / Background Worker 内でタイマー実行 | `pg_cron`（Supabase Cron）で「毎秒〜年1回」の指定が可能。`pg_net` でEdge FunctionをHTTP呼び出し。同時実行は最大8ジョブ、1ジョブ10分以内を推奨 | Cron Triggers（最短1分、UTC）。設定変更の反映に最大15分かかることがある |
| **スリープの有無** | スピンダウンは**Freeインスタンスの制限**として記載（15分無通信で停止）。有料インスタンスで停止しないことの明示的な記載は未確認 | **Freeプランは1週間無操作でプロジェクトが一時停止**。Proは停止の記載なし | サーバーレスのためスリープの概念なし（コールドスタートの影響は未確認） |
| **最小構成** | Web Service Starter（0.5CPU/512MB）＋ Render Postgres、または Cron Job ＋ Postgres | Proプロジェクト1つ（Postgres・Cron・Edge Functions・Auth を含む） | Workers Paid ＋ ストレージ（D1 / KV / Durable Objects のいずれか） |
| **おおよその費用** | Web Service $7/月〜（0.5CPU）、Cron Job $0.00016/分〜（最低 $1/月/ジョブ）、Postgres $6/月〜（Freeは30日で失効） | Pro $25/月（$10分のコンピュートクレジット込み）。Edge Functions: Free 50万回、Pro 200万回まで込み、超過 $2/100万回。DB: Pro 8GB込み | Workers Paid $5/月〜（1,000万リクエスト、3,000万CPUミリ秒込み。超過 $0.30/100万リクエスト、$0.02/100万CPUミリ秒）。D1等の料金は未確認 |
| **スケールしやすさ** | インスタンスを大きくする／増やす。常駐プロセス内タイマーは**複数インスタンスで二重実行**しないよう工夫が必要 | 関数は自動スケール。DB（Postgres）が律速。Cronの同時8ジョブ上限に注意 | 関数は自動スケール。1回のCronの制限: CPU 30秒（間隔1時間未満）、実行時間15分、メモリ128MB、サブリクエスト 1万（Paid） |
| **API監視との相性** | 良い。長時間処理や順番待ちの制御が自由 | 良い。ただしEdge FunctionのCPU時間は**1回2秒**、実行時間は Free 150秒 / 有料 400秒。1回の実行で多数のTripを処理するなら分割が必要 | 良い。サブリクエスト上限が大きい。Freeは CPU 10ms・Cron 5個で**実用外**、Paid前提 |
| **Web Pushとの相性** | PoCと同じ Node.js＋`web-push` がそのまま動く（PoCで確認済み） | Edge Functions は Deno。`web-push`（npm）が動くかは**未確認**（要検証） | `nodejs_compat` で `node:crypto`・`node:https` がサポート（2026-08-04以降の互換日付は既定で有効）。`web-push` が実際に動くかは**未確認**（要検証） |
| **実装難易度** | 低い（PoCの延長） | 中（SQL・RLS・Deno・pg_net の理解が必要） | 中（Workers独自のランタイムとストレージ） |
| **運用難易度** | 中（サーバー・DBのバージョン管理、単一インスタンスの監視） | 低〜中（マネージド。DBのバックアップ等は込み） | 低（サーバー管理なし）。ストレージの選定が必要 |
| **障害時の対応** | 常駐プロセスが落ちると監視全体が止まる → ヘルスチェック・自動再起動・外部の死活監視が必要 | Cronジョブの実行履歴をDBで確認できる。関数が失敗しても次の周期で再実行できる設計にする | 失敗したCron実行は次の周期で再実行できる設計にする。ログ・アラートの設定が必要 |
| **日本から使う場合の注意点** | **日本リージョンなし**（Oregon / Ohio / Virginia / Frankfurt / Singapore）。Singaporeが最寄り | **東京（ap-northeast-1）リージョンあり**（大阪は無し） | 全世界のネットワークで実行。Cronがどの地域で動くかは未確認。日本の外部APIとの遅延は未確認 |
| **時刻** | Cron JobはUTC | 未確認（pg_cronは通常DBのタイムゾーン設定に依存、Supabaseの既定は未確認） | UTC |

出典:
- Render: [Pricing](https://render.com/pricing) / [Cron Jobs](https://render.com/docs/cronjobs) / [Free instances](https://render.com/docs/free) / [Regions](https://render.com/docs/regions)
- Supabase: [Pricing](https://supabase.com/pricing) / [Cron](https://supabase.com/docs/guides/cron) / [Edge Function limits](https://supabase.com/docs/guides/functions/limits) / [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) / [Regions](https://supabase.com/docs/guides/platform/regions)
- Cloudflare: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) / [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) / [Limits](https://developers.cloudflare.com/workers/platform/limits/) / [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

---

## 2. 費用の目安（前提を明記）

[`ENGINE_DESIGN.md`](./ENGINE_DESIGN.md) 5章の「前提B（最適化）」・**1,000ユーザー**・スケジューラは**1分ごと**（月 約43,800回）とした場合の基盤費用のみ（外部APIの費用は含まない）。

| 基盤 | 月額の目安 | 根拠 |
|---|---|---|
| Render | 約 $13〜 | Web Service Starter $7 ＋ Postgres $6。1インスタンスで足りるかは未検証 |
| Supabase | 約 $25〜 | Pro $25。Edge Functions 月約4.4万回は込みの200万回以内 |
| Cloudflare | 約 $5〜 ＋ ストレージ | Workers Paid $5。Cron 月約4.4万回は込みの1,000万リクエスト以内。D1等は未確認 |

---

## 3. 提案

**第一候補: Supabase（Pro・東京リージョン）**

- Trip・Event・Alert は関係の深いデータなので Postgres が合う。DB・定期実行・関数・（将来の）ユーザー認証が1か所にそろう。
- 東京リージョンがあり、日本のユーザー・日本の外部APIに近い。
- `pg_cron` でDB内の「期限の来たEvent」を直接探せるため、「状態で監視対象を抽出する」設計（ENGINE_DESIGN 6章）と相性が良い。
- 注意: Edge Function は1回あたりCPU 2秒。1分ごとの実行で全Tripを1回で処理せず、**Trip単位・バッチ単位に分けて呼ぶ**設計にする。Freeは1週間無操作で停止するので、本番はPro前提。

**次点: Cloudflare Workers（Paid）**

- 最も安く、サーバー管理が不要。ただしDBの選択（D1等）と独自ランタイムへの対応が必要。

**Render有料プランは「最短で動かす」候補**

- PoCのコードをほぼそのまま使えるのが最大の利点。ただし日本リージョンが無く、常駐プロセスが単一障害点になりやすい。

**フェーズ1前に必要な確認（本番接続ではなく、技術検証として）:**

1. Supabase Edge Functions（Deno）で Web Push の送信（VAPID署名・暗号化）が動くか。
2. 同じく Cloudflare Workers で動くか（次点の保険として）。
3. どちらも動かない場合は、Web Push送信だけ Node.js の小さなサービスに分ける構成を検討する。
