# TECH_VALIDATION — iPhone PWA Web Push 実機検証

フェーズ0 タスク1の実機検証チェックリストと、iOS Web Push の調査結果です。
PoCのコードと手順は [`poc/push/README.md`](../poc/push/README.md) を参照してください。

- 作成日: 2026-09-26
- 調査方法: Web検索とWebページ取得（一次情報を優先）。確認できなかったものは「未確認」と記載。

---

## 1. 実機検証チェックリスト

記入欄: **結果**（OK / NG / 一部 / 未実施）・**実施日時**・**使用端末**・**iOSバージョン**・**備考**。
事前に次を記録してください。

| 共通情報 | 記入欄 |
|---|---|
| 公開URL | |
| 使用端末 | |
| iOSバージョン | |
| 集中モード（Focus）の状態 | |
| 設定 > 通知 > FA PoC の設定（ロック画面 / 通知センター / バナー） | |
| 低電力モード | |

### 1-1. Safariでページを開いただけでは通知できないことを確認

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: SafariタブでPoCを開き、「環境」欄の Notification API / PushManager / 通知の許可 の表示と、「通知を許可する」を押したときのログを記録する。

### 1-2. ホーム画面に追加して起動できる

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 共有 →「ホーム画面に追加」。起動後「ホーム画面から起動: はい」になるか。アイコンが表示されるか。

### 1-3. ホーム画面PWAから通知許可を要求できる

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 「1. 通知を許可する」ボタンのタップで許可ダイアログが出るか。ページ読み込み時にダイアログが出ないこと。

### 1-4. Push Subscriptionを取得できる

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 「2. 通知を購読する」でログに `サーバーに登録: HTTP 201` と push service のホスト名が出るか。ホスト名を記録。`/status` の `subscriptionCount` が増えるか。購読情報JSONをパソコンに控える。

### 1-5. アプリ起動中に通知が届く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: PWAを前面表示したまま `/admin` から「今すぐ送信」。バナー表示の有無を記録。

### 1-6. アプリを閉じた状態で通知が届く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: ホーム画面に戻る場合と、App Switcherで上スワイプして終了した場合の両方を記録。

### 1-7. 画面ロック中に通知が届く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: ロック後すぐ・数分後の両方。ロック画面に表示されるか、通知センターのみか。

### 1-8. 5〜10分後の遅延通知が届く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: `/admin` で遅延300〜600秒を予約し、すぐにロック。予約時刻と受信時刻の差を記録。Render無料プランのスピンダウン（15分無通信）より短いので原則届く想定だが、サーバーが再起動するとタイマーは消える。

### 1-9. 数時間後に手動 `/send-test` した通知が届く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 購読後、PWAを開かずに数時間待つ（経過時間を記録）。**Render無料プランではスピンダウンで `subscriptions.json` が消える**ため、控えておいた購読情報JSONを `/admin` の「購読情報JSON」欄に貼って送信する。送信レスポンスの `statusCode`（201なら成功）も記録。

### 1-10. 通知をタップすると指定URLが開く

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: `url` を `/?from=push` で送信。(a) PWAが起動中、(b) PWAを終了済み、の両方でタップし、ログに「通知タップで開かれました (from=push)」が出るか。既存ページが再利用されたか、新規に開いたかを記録。

### 1-11. PWAを再起動しても購読が利用できるか

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: PWAを終了→再起動し、「購読: 購読中」のままか、購読情報JSONが前回と同じendpointか。その後の送信が届くか。

### 1-12. PWAを再インストールした場合に購読がどうなるか

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: ホーム画面から削除 → 再追加。(a) 再追加直後の通知許可状態、(b) 旧購読情報JSONへ送信したときの `statusCode`（410等）、(c) サーバー側で自動削除されたか、(d) 再購読でendpointが変わるか、を記録。

### 1-13. Subscriptionが失効した場合にサーバー側で削除されるか

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 1-12または「購読を解除する」後に、旧購読が `subscriptions.json` に残る状態で `/send-test`。レスポンスの `removed` が1以上になり、Renderのログに `[store] removed expired subscription` が出るか。ローカルでは偽のPushサービス（410を返す）で動作確認済み（2026-09-26）。

### 1-14. `/send-test` のADMIN_TOKEN認証が機能する

- [ ] 結果:
- 実施日時:
- 使用端末: （パソコン）
- iOSバージョン: -
- 備考: トークン無し・誤りで401、正しいトークンで200。ローカルでは確認済み（2026-09-26）。本番URLでも確認する。

### 1-15. `/send-delayed` のADMIN_TOKEN認証が機能する

- [ ] 結果:
- 実施日時:
- 使用端末: （パソコン）
- iOSバージョン: -
- 備考: トークン無し・誤りで401、正しいトークンで202。範囲外（例 7200秒）は400。ローカルでは確認済み（2026-09-26）。

### 1-16. `/status` で購読件数を確認できる

- [ ] 結果:
- 実施日時:
- 使用端末:
- iOSバージョン:
- 備考: 購読前後で `subscriptionCount` が変わるか。

### 追加で記録しておくと良い項目（任意）

- [ ] 集中モードON時の挙動
- [ ] 低電力モードON時の受信遅延
- [ ] 機内モード中に送信し、解除後に届くか（TTL=3600秒で送信している）
- [ ] 同じ `tag` で2回送ったときに通知が置き換わるか

---

## 2. iOS Web Push 調査結果

確認日はすべて **2026-09-26**。

### 2-1. iOSでWeb Pushが利用可能になったバージョン

| 内容 | 出典 |
|---|---|
| iOS / iPadOS **16.4** 以降の**ホーム画面Webアプリ**でWeb Pushに対応。macOSではSafari 16（macOS 13以降）のWebページで対応。 | [Apple Developer: Sending web push notifications in web apps and browsers](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) |
| iOS 16.4 beta 1 でホーム画面Webアプリ向けWeb Pushが追加された。 | [WebKit Blog: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| `PushManager.subscribe` / `showNotification` の Safari on iOS 対応は 16.4、注記「ホーム画面に保存したWebアプリで対応」。 | [MDN browser-compat-data v8.1.3](https://github.com/mdn/browser-compat-data)（`api.PushManager.subscribe` 等） |
| Apple Developer Program への加入は不要。 | Apple Developer（同上） |

### 2-2. ホーム画面追加が必要な条件

| 内容 | 出典 |
|---|---|
| iOS/iPadOSでは、ユーザーが共有メニューの「ホーム画面に追加」でWebアプリを追加する必要がある。 | WebKit Blog（同上） |
| Web Appマニフェストの `display` を `standalone` または `fullscreen` にする。PoCは `standalone`。 | WebKit Blog（同上） |
| Safari以外のブラウザ（サードパーティ）も、必要なエンタイトルメントがあれば共有メニューからホーム画面追加を提供できる。 | WebKit Blog（同上） |
| Safariのタブ内（ホーム画面に追加していない状態）では通知を受けられない。 | MDN BCD注記「Notifications are supported in web apps saved to the home screen」。実機での具体的な挙動（APIが未定義になるか、拒否されるか）は**未確認**→ 1-1で確認。 |

### 2-3. 通知許可の条件

| 内容 | 出典 |
|---|---|
| 通知許可の要求は「購読ボタンをタップする」などの**直接のユーザー操作への応答**である必要がある。 | WebKit Blog（同上） |
| ジェスチャーのイベントハンドラ内から直ちに購読メソッドを呼ぶこと。 | Apple Developer（同上） |
| 通知はiOSの集中モード（Focus）と統合され、ユーザーが受信条件を設定できる。 | WebKit Blog（同上） |
| ホーム画面WebアプリのバッジはiOS 16.4以降の「通知」設定から許可を管理できる（Badging API）。 | Apple Developer（同上） |

### 2-4. Service Workerの制約

| 内容 | 出典 |
|---|---|
| **Safariは不可視のプッシュ（サイレントプッシュ）に対応しない。** 受信したら直ちに通知を表示すること。表示しないとSafariはそのサイトの通知許可を取り消す。 | Apple Developer（同上） |
| `pushsubscriptionchange` イベントは Safari on iOS で**非対応**。購読の更新をService Workerで自動検知できない前提で設計する。 | MDN BCD v8.1.3（`api.ServiceWorkerGlobalScope.pushsubscriptionchange_event`） |
| `Clients.openWindow` は iOS 11.3、`WindowClient.navigate` は iOS 16 以降で対応。 | MDN BCD v8.1.3 |
| ペイロード上限は **4KB**（`PayloadTooLarge`）。 | Apple Developer（同上） |
| `TTL` ヘッダー必須。端末に届けられない場合、最大30日以内でTTLに応じて保存し、端末がオンラインになったら配信を試みる。保存件数には上限がある。 | Apple Developer（同上） |
| `Urgency: high` で即時配信を試みる。PoCは `high` で送信。 | Apple Developer（同上） |
| `Topic` ヘッダー（最大32文字）でPushサービス側の通知まとめが可能。 | Apple Developer（同上） |
| VAPIDのJWTは1時間に1回より頻繁に更新しないこと。サーバーの通信制限がある場合は `https://*.push.apple.com` を許可する。 | Apple Developer（同上） |
| 410 = デバイストークン失効。404 = 不正な `:path`。429 = 同一宛先への送信過多。 | Apple Developer（同上） |
| スクリプトで書き込むストレージ（IndexedDB、LocalStorage、Service Worker登録など）はSafari利用7日間で操作がないと削除されるが、ホーム画面Webアプリは独自の利用日数カウンタを持ち、実際に使うとリセットされる。 | [WebKit Blog: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)（2020年の記事。現行の挙動は**未確認**） |

### 2-5. バックグラウンドJavaScript実行の制約

| 内容 | 出典 |
|---|---|
| Background Sync（`SyncManager`）、Periodic Background Sync（`PeriodicSyncManager`）、Background Fetch は Safari on iOS で**非対応**。 | MDN BCD v8.1.3 |
| WebKitの議論で「iOSのWebKitは画面オフ時にWebサイトのバックグラウンド実行を維持しない」旨が述べられている。 | [WebKit Bug 193946](https://bugs.webkit.org/show_bug.cgi?id=193946)（2025-11-04 RESOLVED LATER） |
| バックグラウンドでService Workerが起動されるのはPush受信・通知クリックなどのイベント時のみと考えられるが、iOSでの実行時間の上限は**未確認**。 | 公式の明記を確認できず |

**設計上の結論:** PWAが常時バックグラウンドでJavaScriptを実行する前提は取れない。監視はサーバー側で行い、必要なタイミングでWeb Pushを送る（CLAUDE.md 設計原則12）。

### 2-6. 位置情報をバックグラウンドで取得する場合の制約

| 内容 | 出典 |
|---|---|
| W3C Geolocation 仕様では、`watchPosition` は文書が fully active かつ可視（`visible`）でない間は位置更新を通知しない。`getCurrentPosition` も fully active でなければ `POSITION_UNAVAILABLE`。 | [W3C Geolocation](https://w3c.github.io/geolocation/) |
| Geolocation APIはWindowにのみ公開され、Service Worker等のWorkerからは使えない。 | W3C Geolocation（`[Exposed=Window]`） |
| WebKitでバックグラウンド位置情報の仕組みを追加する提案は「合意された標準ができるまで」LATERでクローズ。プライバシー上の懸念が示されている。 | WebKit Bug 193946（同上） |

**設計上の結論:** 「今いる場所から徒歩○分」をバックグラウンド位置情報で計算する設計は取らない。出発地点・目的地・帰宅先・登録地点を基準にし、位置情報はアプリを開いている間の任意の補助にとどめる（CLAUDE.md 設計原則13）。

### 2-7. PWAとして実装する場合の注意点

1. 購読ボタンは必ずユーザー操作から呼ぶ（ページ読み込み時に要求しない）。
2. Pushを受けたら必ず通知を表示する。「条件が変わったので通知不要」をクライアント側で判断して握りつぶす設計は取れない。**通知の要否はサーバー側で判断してから送る。**
3. `pushsubscriptionchange` に頼れないため、アプリを開いたときに毎回 `getSubscription()` を確認し、サーバーへ再登録する（endpointの差分を検知）。
4. 送信時の410で購読を削除する。Future Alertでは「購読が失効したユーザー」をアプリ起動時に案内する仕組みが必要。
5. ペイロードは4KB以内。詳細はアプリを開いてからサーバーに取りに行く。
6. 集中モードやユーザーの通知設定で届かない場合がある。重要Alertが届かなかった可能性を前提にする。
7. Service Workerは `/sw.js`（スコープ `/`）で配信し、キャッシュさせない。
8. ホーム画面Webアプリのストレージ・購読は、ユーザーの削除や長期未使用で消える可能性がある（2-4参照、現行挙動は未確認）。サーバー側を正とする。

---

## 3. PoC実装メモ（仕様との差分・補足）

- **仕様の不足（報告）:** Render無料プランはスピンダウン時にファイルシステムの変更が失われる（[Render Free](https://render.com/docs/free)、2026-09-26確認）。仕様どおり `subscriptions.json` に保存すると、「数時間後に `/send-test`」の時点で購読が0件になる可能性が高い。仕様自体は変更せず、`/send-test` と `/send-delayed` に任意の `subscription` 指定を追加し、控えた購読情報に直接送れるようにした。
- **仕様との差分（報告）:** Appleの仕様では404は「不正な `:path`」で、失効は410。仕様に従い404/410の両方で削除しているが、本番では404の扱いを再検討する余地がある。
- `/send-delayed` は60〜600秒に制限（仕様「5〜10分程度」。1分から試せるよう下限を60秒にした）。
- `/subscribe` は認証なしのため、PoCでは保存件数を50件に制限。
- アイコンは仮画像（スクリプト生成）。

---

## 4. Phase 0 実機テスト結果（追記）

- 追記日: 2026-09-27（たくまさんからの報告を記録）
- 実施日時・端末機種・iOSバージョン・Windowsのブラウザ: **未記入**（報告に含まれていないため）
- 環境: Render上のWeb Push PoC

### 4-1. 報告された結果

| 対象 | 項目 | 結果 |
|---|---|---|
| サーバー | Render上でWeb Push PoCが稼働 | OK |
| iPhone | ホーム画面に追加 | OK（追加済み） |
| iPhone | 通知許可 | OK（`granted`） |
| iPhone | Push購読 | OK |
| iPhone | 通知受信 | OK |
| iPhone | 通知タップ後にFuture Alertが起動 | OK |
| iPhone | Apple Push Serviceの応答 | HTTP 201 |
| Windows | 通知受信 | OK |
| Windows | 通知タップ後にFuture Alertが起動 | OK |
| Windows | Windows Push Serviceの応答 | HTTP 201 |
| サーバー | 送信結果 | total=2 / sent=2 / failed=0 / removed=0 |
| サーバー | Render無料プランでは再起動時にサーバー側の購読情報が消える可能性 | 確認済み（3章の記載と一致） |

### 4-2. 1章チェックリストとの対応

1章の記入欄は変更していません。報告内容との対応は次のとおりです。

| 1章の項目 | 状況 |
|---|---|
| 1-1. Safariだけでは通知できない | 未報告 |
| 1-2. ホーム画面に追加して起動できる | OK（ホーム画面追加済み、タップで起動） |
| 1-3. ホーム画面PWAから通知許可を要求できる | OK（`granted`） |
| 1-4. Push Subscriptionを取得できる | OK |
| 1-5. アプリ起動中に通知が届く | 通知受信は成功。受信時のアプリの状態は未報告 |
| 1-6. アプリを閉じた状態で通知が届く | 同上 |
| 1-7. 画面ロック中に通知が届く | 同上 |
| 1-8. 5〜10分後の遅延通知が届く | 未報告 |
| 1-9. 数時間後に手動 `/send-test` した通知が届く | 未報告 |
| 1-10. 通知をタップすると指定URLが開く | OK（Future Alertが起動）。開いたURL（`/?from=push`）の確認は未報告 |
| 1-11. PWA再起動後も購読が利用できる | 未報告 |
| 1-12. PWA再インストール時の購読 | 未報告 |
| 1-13. 失効した購読がサーバー側で削除される | 未報告（今回の送信は removed=0） |
| 1-14. `/send-test` のADMIN_TOKEN認証 | 未報告（正しいトークンでの送信は成功） |
| 1-15. `/send-delayed` のADMIN_TOKEN認証 | 未報告 |
| 1-16. `/status` で購読件数を確認できる | 未報告 |

### 4-3. 結論

Phase 0の最重要検証である「iPhoneのホーム画面PWAへのWeb Push通知」は、Render上のPoCで**受信・タップ起動まで成功**しました（Apple Push Service HTTP 201）。Windowsでも同様に成功しています。

未報告の項目（特に1-6・1-7のアプリを閉じた状態・画面ロック中、1-9の数時間後の送信）は、必要に応じて追加で確認・記入してください。
