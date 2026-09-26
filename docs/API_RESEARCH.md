# API_RESEARCH — 外部データ取得元の調査

フェーズ0 タスク2。**本番接続は行っていません**（公式サイト・ドキュメントの閲覧のみ）。

- 情報確認日: **すべて 2026-09-26**（個別に異なる場合のみ記載）
- 調査方法: Web検索・公式ページの取得。**Web検索は利用可能**だった。
- 表記: 確認できなかった項目は「**未確認**」。「記載なし」は公式ページに該当情報が見当たらなかったことを示す（＝未確認）。
- 注意: ページ取得ツールの制約（JavaScript描画・robots.txt・接続拒否）で読めなかったページがある。該当箇所は「未確認」とし、最後に**あとで確認すべき項目**として一覧化した。

---

## 0. 結論サマリー

| データ | MVPで使える見込み | 関西での状況 | 主な懸念 |
|---|---|---|---|
| 経路・終電 | **あり**（駅すぱあとAPI・NAVITIME APIに終電/最終便の探索指定がある） | 両社とも全国対応とされる。関西固有の制限は未確認 | 無料枠が小さい／フリープランは機能制限。保存条件・表示義務は未確認 |
| 天気 | **あり**（気象庁XML、Open-Meteo、OpenWeather） | 全国・全世界対応 | Open-Meteo無料は**非商用のみ**。気象庁は公式JSON APIなし（XML/CSV） |
| 遅延 | **有料なら可**（レスキューナウ配信を各社経由で） | ODPTには**関西の鉄道運行情報が見当たらない** | 無料・公式で関西を広くカバーする手段は確認できず |
| 混雑 | **ほぼ不可** | NAVITIMEの混雑度は**首都圏のみ**。関西の鉄道混雑APIは確認できず | 代替案が必要（後述） |

---

## 1. 経路・終電

### 1-1. Google Routes API

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料枠 | Compute Routes: Essentials 月10,000件 / Pro 月5,000件 / Enterprise 月1,000件 | [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) |
| 料金体系 | 従量課金。最初の価格帯で Essentials $5.00 / Pro $10.00 / Enterprise $15.00（1,000件あたり） | 同上 |
| 公共交通がどのSKUか | **未確認**（Usage and billing ページに明記なし） | [Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing) |
| 日本対応 | 地図・ジオコーディング・車・徒歩の経路は日本対応。**公共交通（TRANSIT）の日本対応は未確認**（対応表に交通機関の列が無く、Routes APIの国別表は取得できなかった） | [Coverage](https://developers.google.com/maps/coverage) / [Routes coverage](https://developers.google.com/maps/documentation/routes/coverage) |
| 大阪・京都対応 | **未確認**（上記に同じ） | - |
| 終電検索 | 専用の「終電」指定は**記載なし**。`departureTime` / `arrivalTime`（過去7日〜未来100日）を指定できる | [Transit routes](https://developers.google.com/maps/documentation/routes/transit-route) |
| リアルタイム情報 | **未確認**（公共交通ページに記載なし） | 同上 |
| 商用利用 | Google Maps Platform 利用規約に従う。可否そのものの条文は**未確認** | - |
| データ保存条件 | 緯度経度は最長30日連続でキャッシュ可、その後削除。Place ID は無期限保存可 | [Service Specific Terms 19.3](https://cloud.google.com/maps-platform/terms/maps-service-terms) / [Routes policies](https://developers.google.com/maps/documentation/routes/policies) |
| 表示義務 | Googleマップ上に表示しない場合は Google Maps ロゴ（難しければ「Google Maps」テキスト）の表示が必要 | [Routes policies](https://developers.google.com/maps/documentation/routes/policies) |
| 利用規約上の制限 | Routes APIのコンテンツを**Google以外の地図と組み合わせて使ってはならない** | [Service Specific Terms 19.2](https://cloud.google.com/maps-platform/terms/maps-service-terms) |
| API制限 | Compute Routes: 3,000 QPM | [Usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing) |
| 更新頻度 | **未確認** | - |

**評価:** 日本の公共交通対応が未確認のため、フェーズ1前に「大阪→京都のTRANSITで結果が返るか」をテスト呼び出しで確認する必要がある（本番接続にあたるため、フェーズ0では実施していない）。

### 1-2. 駅すぱあと API（旧：駅すぱあとWebサービス）

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料枠 | **フリープラン（¥0）**あり。個人・商用問わず利用可。ただし経路探索は「検索結果を駅すぱあと APIのURLで回答」する簡易版、駅・路線情報は鉄道・航空のみ。リクエスト上限は**記載なし** | [プラン](https://api-info.ekispert.com/plan/) / [LP](https://api-info.ekispert.com/lp/toc_v2/) |
| 料金体系 | リクエスト数買い切り型（¥5,500〜¥22,000で5,000〜20,000件）、スタンダード（初期費用＋リクエスト数別の従量制、見積もり）、エンタープライズ（問い合わせ） | [プラン](https://api-info.ekispert.com/plan/) |
| 日本対応 | 対応（国内の乗換案内サービス） | 同上 |
| 大阪・京都対応 | 地域制限の記載は見当たらず。**明示的な確認は未確認** | - |
| 終電検索 | **可**。経路探索の `searchType` に `lastTrain`（「指定された運行日の最終ダイヤの経路を優先して探索」）がある。どのプランで使えるかは**未確認** | [経路探索](https://docs.ekispert.com/v1/api/search/course/extreme.html) / [探索種別](https://docs.ekispert.com/v1/dictionary/search-type/) |
| リアルタイム情報 | 経路探索への遅延反映は**未確認**。別APIとして「鉄道運行情報（レスキューナウ）」があり、区間単位の運行情報を提供。料金・必要プランは**未確認** | [鉄道運行情報](https://docs.ekispert.com/v1/api/operationLine/service/rescuenow/information.html) |
| 商用利用 | フリープランは商用可と記載 | [LP](https://api-info.ekispert.com/lp/toc_v2/) |
| データ保存条件 | **未確認** | - |
| 表示義務 | **未確認**（プランページに記載なし） | - |
| 利用規約 | **未確認**（規約本文を未取得） | - |
| API制限 | **未確認** | - |
| 更新頻度 | **未確認** | - |

### 1-3. NAVITIME API

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料枠 | RapidAPI BASIC: $0、月500アクセス、分間50 | [API一覧と料金](https://api-sdk.navitime.co.jp/api/specs/description/about_navitime_api.html) / [RapidAPI](https://api-sdk.navitime.co.jp/api/rakutenrapid/) |
| 料金体系 | RapidAPI PRO $200/月（5,000・分間100）、ULTRA $300/月＋超過（10,000・分間150）。SBI API Hub Basic 26,000円/月、Standard 39,000円/月＋超過7円。直接契約はアクセス別料金表（要相談） | 同上 |
| 日本対応 | 全国の鉄道・バス・航空を対象 | [ルート検索(トータルナビ)](https://api-sdk.navitime.co.jp/api/specs/api_guide/route_transit.html) |
| 大阪・京都対応 | 全国対応の記載あり。地域別の差は「データ提供状況による」 | 同上 |
| 終電検索 | **可**。`last_operation`（指定日の最終出発を検索）パラメータがある | 同上 |
| リアルタイム情報 | 「運行情報」は**直接契約の追加オプション**。実時刻表ベースの検索もオプション申込時のみで、APIマーケットでは不可 | [API一覧と料金](https://api-sdk.navitime.co.jp/api/specs/description/about_navitime_api.html) / [ルート検索](https://api-sdk.navitime.co.jp/api/specs/api_guide/route_transit.html) |
| 商用利用 | RapidAPIでの明示的な制限は記載なし。**未確認** | - |
| データ保存条件 | **未確認** | - |
| 表示義務 | **未確認** | - |
| 利用規約 | **未確認** | - |
| API制限 | 上記の分間・月間上限 | 上記 |
| 更新頻度 | **未確認** | - |

**重要:** RapidAPI等のマーケット経由では**平均所要時間ベース**になり、実際の時刻表での終電判定は直接契約オプションが必要と読める。終電を扱うFuture Alertでは致命的になりうるため、フェーズ1前に要確認。

### 1-4. ジョルダン

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料枠 | 「乗換案内オープンAPI」: 登録のみで無料。利用上限あり（数値は**未確認**）。公開サイト向けのみ（イントラ不可）。**実際の時刻表は考慮せず**、運賃・所要時間を返す | [乗換案内オープンAPI](https://norikae.jorudan.co.jp/openapi/) |
| 料金体系 | 「乗換案内Biz API」: 10同時ライセンスで¥354,000〜。90日間の試用貸し出しあり | [乗換案内Biz API](https://biz.jorudan.co.jp/service/biz_api.html) |
| 日本対応 | 対応 | 同上 |
| 大阪・京都対応 | **未確認** | - |
| 終電検索 | オープンAPIは時刻表非考慮のため**不可と読める**。Biz APIの終電探索可否は**未確認** | 同上 |
| リアルタイム情報 | 別サービス「運行情報サービス」（全国約597路線、関西含む、API提供、レスキューナウ提供情報、30分以上の遅延が対象、「必ずしもリアルタイムではない」）。料金**未確認** | [運行情報サービス](https://biz.jorudan.co.jp/service/information.html) |
| 商用利用 | オープンAPIは商用サイトでも可（公開利用のみ、再許諾不可） | [乗換案内オープンAPI](https://norikae.jorudan.co.jp/openapi/) |
| データ保存条件 / 表示義務 / API制限 / 更新頻度 | **未確認** | - |

**評価:** Biz APIは企業の交通費精算向けの価格帯で、個人開発のMVPには重い。オープンAPIは時刻表を扱わないため終電判定に使えない。

---

## 2. 天気

### 2-1. 気象庁

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料利用 | 防災情報XML（PULL型Atomフィード）は登録不要・無料。AMeDAS観測CSV等も公開 | [防災情報XML PULL型](https://xml.kishou.go.jp/xmlpull.html) / [気象データ高度利用ポータル](https://www.data.jma.go.jp/developer/index.html) |
| 商用利用 | Webサイトのコンテンツは「公共データ利用規約（第1.0版）」（CC BY互換）で商用利用可 | [気象庁ホームページについて](https://www.jma.go.jp/jma/kishou/info/coment.html) |
| 日本対応 / 大阪・京都 | 対応（国の機関） | - |
| 更新頻度 | 高頻度フィードは毎分更新（直近10分以上を掲載）、長期フィードは毎時 | [PULL型](https://xml.kishou.go.jp/xmlpull.html) |
| API制限 | 1日10GB以上のダウンロードを確認した場合、IPアドレスを遮断 | 同上 |
| 保存条件 | 特段の保存制限は**未確認** | - |
| 表示義務 | 「出典：気象庁ホームページ（URL）」の記載。加工した場合はその旨を記載し、国が作成したように見せない | [気象庁ホームページについて](https://www.jma.go.jp/jma/kishou/info/coment.html) |
| その他の注意 | 気象業務法17条（予報業務の許可）に関する制約が明記されている。**気象庁の予報を転載するのは可だが、独自に予報を作る場合は許可が必要**になりうる。Future Alertが「独自の雨予測」を出すかどうかで要確認 | 同上 |
| JSON | 気象庁サイトが内部で使うJSON（いわゆる bosai JSON）は、公式な提供形式として**掲載されていない**（ポータルはXMLとCSVのみ） | [気象データ高度利用ポータル](https://www.data.jma.go.jp/developer/index.html) |
| 安定配信 | 確実な配信が必要な場合は（一財）気象業務支援センターや民間気象事業者に相談するよう案内 | [PULL型](https://xml.kishou.go.jp/xmlpull.html) |

**評価:** 注意報・警報は公式XMLで取れる。一方「○時から雨」の**時間単位の降水予報を公式の機械可読形式で取る方法は今回確認できず（未確認）**。ナウキャスト等の格子データは気象業務支援センター経由（有料、料金未確認）。

### 2-2. Open-Meteo

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料利用 | **非商用のみ**。600回/分、5,000回/時、10,000回/日、300,000回/月 | [Terms](https://open-meteo.com/en/terms) |
| 商用利用 | 広告・サブスク・商用製品は有料プランが必要。API Standard（月100万回）/ Professional（月500万回）/ Enterprise。**月額は未確認**（ページに記載なし） | [Terms](https://open-meteo.com/en/terms) / [Pricing](https://open-meteo.com/en/pricing) |
| 日本対応 / 大阪・京都 | 気象庁のGSM（全球、約55km、11日、6時間ごと更新）と**MSM（日本・韓国、約5km、4日、3時間ごと更新）**を使うJMA APIがある | [JMA API](https://open-meteo.com/en/docs/jma-api) |
| 更新頻度 | 上記（MSM 3時間ごと） | 同上 |
| API制限 | 上記の無料枠 | [Terms](https://open-meteo.com/en/terms) |
| 保存条件 | データは CC BY 4.0（帰属表示で再配布可） | [Terms](https://open-meteo.com/en/terms) |
| 表示義務 | CC BY 4.0 の帰属表示 | 同上 |
| 粒度 | 降水は1時間単位（JMA APIでは分単位の降水予報は記載なし） | [JMA API](https://open-meteo.com/en/docs/jma-api) |

**評価:** MVP検証段階（非商用）なら最も手軽。**有料化・広告導入の時点で有料プランが必要**。

### 2-3. OpenWeather

| 項目 | 内容 | 出典 |
|---|---|---|
| 無料利用 | One Call API 3.0: 1日1,000回まで無料、以降1回0.0015 USD。Free プラン（現在の天気・予報）: 60回/分、月100万回 | [Pricing](https://openweathermap.org/price) / [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| 商用利用 | 無料プランでの商用可否は**未確認** | - |
| 日本対応 / 大阪・京都 | 全世界対応 | [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| 更新頻度 | One Call 3.0 は10分ごと更新。Free プランの表では「2時間ごと」、上位プランで1時間・10分 | 同上 / [Pricing](https://openweathermap.org/price) |
| データ内容 | 1時間先までの**分単位降水予報**、48時間の時間別予報、8日予報、各国政府の気象警報 | [One Call 3.0](https://openweathermap.org/api/one-call-3) |
| API制限 | 上記 | - |
| 保存条件 | ライセンスは ODbL と表記。具体的な保存制限は**未確認** | [Pricing](https://openweathermap.org/price) |
| 表示義務 | **未確認**（ODbL・CC BY-SA系の帰属が必要と思われるが条文未確認） | - |
| 分単位降水の日本での精度 | **未確認** | - |

---

## 3. 遅延（運行情報）

### 3-1. 公共交通オープンデータ（ODPT）

| 項目 | 内容 | 出典 |
|---|---|---|
| 概要 | 公共交通オープンデータ協議会が2019-05-31から「公共交通オープンデータセンター」を運用。鉄道・バス・航空・フェリー・シェアサイクル | [odpt.org](https://www.odpt.org/) |
| 登録 | 開発者サイトでユーザー登録（無料）後にAPI利用 | 同上 / [developer.odpt.org](https://developer.odpt.org) |
| 運行情報データ | カタログで「運行情報」を検索すると51件。鉄道の運行情報は**京急・西武・京王・東武・東急・多摩モノレール・りんかい線・つくばエクスプレス・東京メトロ・JR東日本（i-Stations）・横浜市交通局・都営**など**首都圏が中心** | [CKANカタログ（運行情報）](https://ckan.odpt.org/dataset?q=%E9%81%8B%E8%A1%8C%E6%83%85%E5%A0%B1) |
| 関西の鉄道 | 「運行情報」検索の全3ページに**関西の鉄道事業者の運行情報は見当たらなかった**。「西日本」で0件、「大阪」は阪九フェリーのみ | 同上 / [「大阪」検索](https://ckan.odpt.org/dataset?q=%E5%A4%A7%E9%98%AA) |
| 京都 | 京都市交通局（市バス・地下鉄）、京都バス（リアルタイム情報あり、バス）のデータセットがある。京都市営地下鉄データの形式（静的GTFSか、運行情報を含むか）は**未確認** | [「京都」検索](https://ckan.odpt.org/dataset?q=%E4%BA%AC%E9%83%BD) |
| ライセンス・利用条件 | 開発者サイトの利用規約を**未確認**（データセットごとにライセンスが異なる可能性） | - |

**評価:** 関西の鉄道遅延をODPTで広くカバーすることは**現時点では期待できない**（確認日時点のカタログ検索結果に基づく）。

### 3-2. 各鉄道会社の公開情報

| 事業者 | 公開状況 | 出典 |
|---|---|---|
| JR西日本 | 公式Webで近畿エリアの運行情報を公開。公式アプリあり。**API・オープンデータの提供は確認できず** | [近畿エリア運行情報](https://trafficinfo.westjr.co.jp/kinki.html) |
| 大阪メトロ・阪急・阪神・京阪・近鉄・南海 | 今回は個別確認できず（**未確認**）。いずれも公式Web等で運行情報を公開していると思われるが、API提供は未確認 | - |

- 公式Webページを機械的に取得（スクレイピング）する場合は、各社の利用規約・robots.txt・負荷への配慮が必要。**規約上の可否は未確認**で、MVPの前提にすべきではない。

### 3-3. その他（商用の準公式データ）

| 提供元 | 内容 | 出典 |
|---|---|---|
| レスキューナウ | 国内の全鉄道路線（ケーブルカー・ロープウェイ・季節運行を除く）の運行情報を独自ルールで標準化し、Web API（JSON）/ HTTP GET（XML）で配信。料金は見積もり（**未確認**）。更新頻度は**未確認** | [鉄道運行情報](https://www.rescuenow.co.jp/contentsdelivery/category/railwayinfomation) |
| 駅すぱあと API | 「鉄道運行情報（レスキューナウ）」API。提供条件あり。料金**未確認** | [駅すぱあと 鉄道運行情報](https://docs.ekispert.com/v1/api/operationLine/service/rescuenow/information.html) |
| ジョルダン 運行情報サービス | 全国約597路線（関西含む）、API提供、30分以上の遅延が対象、リアルタイム保証なし。料金**未確認** | [運行情報サービス](https://biz.jorudan.co.jp/service/information.html) |
| NAVITIME | 運行情報は直接契約の追加オプション。料金**未確認** | [API一覧と料金](https://api-sdk.navitime.co.jp/api/specs/description/about_navitime_api.html) |

**評価:** 関西の遅延を網羅的に扱う現実的な手段は、**レスキューナウ系の商用データ（直接または駅すぱあと・ジョルダン経由）**。どれも料金は見積もりで未確認。

---

## 4. 混雑

**結論: 関西の鉄道混雑を、APIで実用的に取得する方法は確認できなかった（取得できない）。**

| 候補 | 内容 | 出典 |
|---|---|---|
| NAVITIME 乗換検索の混雑度 | `options=congestion` で1〜6の混雑度を出力。**予測値**。**首都圏（東京・埼玉・神奈川・千葉）の対応路線のみ**（2021年12月時点の記載） | [乗換検索で混雑度を表示](https://api-sdk.navitime.co.jp/api/specs/examples/transit_congestion.html) / [ルート検索](https://api-sdk.navitime.co.jp/api/specs/api_guide/route_transit.html) |
| NAVITIME 混雑度予測（駅） | 駅名と日付から24時間分の混雑度予測。直接契約または試用が必要。対応地域・データ源・更新頻度は**未確認** | [混雑度予測](https://api-sdk.navitime.co.jp/api/specs/examples/congestion_prediction_node.html) |
| JR西日本 | 公式アプリでリアルタイム混雑状況を提供（提供路線の拡大を2022年に発表）。**APIは確認できず** | [JR西日本プレスリリース](https://www.westjr.co.jp/press/article/2022/02/page_19510.html) |
| 国土交通省 | 路線ごとの詳細な混雑状況は各事業者のWebで案内、としている | [国土交通省 鉄道混雑情報](https://www.mlit.go.jp/tetudo/tetudo_tk1_000043.html) |
| 人流データ（Agoop、モバイル空間統計など） | 商用の人流統計。料金・リアルタイム性・API提供条件は**未確認**。個人開発のMVP向けではない可能性が高い（推測のため要確認） | [Agoop サービス](https://agoop.co.jp/service/) |
| Google「混雑する時間帯」 | 公開APIとしての提供は**未確認** | - |

### 混雑の代替案

| 案 | 内容 | メリット | デメリット |
|---|---|---|---|
| A. 時間帯ルール | 平日朝夕ラッシュ、終電前、イベント開催日などを固定ルールで「混雑しやすい」と判定 | 無料・確実に動く | 実際の混雑とずれる。精度は低い |
| B. 遅延からの推定 | 遅延・運転見合わせが出たら「混雑の可能性が高い」とする | 遅延データがあれば追加費用なし | 遅延データ（有料）に依存 |
| C. イベント情報 | 京セラドーム・甲子園・万博会場などの開催情報を登録地点と照合 | 関西でも実現可能 | データ収集の手間。情報源の規約確認が必要 |
| D. 首都圏のみNAVITIME | 首都圏だけ実データ、関西は案A | 将来の拡張に備えられる | 地域で品質差が出る |
| E. MVPから混雑を外す | Eventの `crowd` は設計上だけ残し、MVPでは生成しない | 誤通知を防げる | 価値の一部を失う |

**推奨（設計上の提案）:** MVPでは **E（混雑は通知しない）＋ A（参考表示のみ）**。混雑を理由に `danger` のAlertは出さない。

---

## 5. 関西圏での代替案の比較

| 観点 | 別API（商用） | 鉄道会社公式Web | 公共交通オープンデータ | 機能を限定 | 地域を段階拡張 |
|---|---|---|---|---|---|
| 遅延 | レスキューナウ系で全国対応（有料、料金未確認） | 公開はあるがAPIなし。スクレイピングは規約未確認 | 関西の鉄道は見当たらず | 遅延は「公式サイトを見てください」リンクのみ | 首都圏はODPTで先行 |
| 終電 | 駅すぱあと・NAVITIMEで可 | 時刻表PDF等（機械可読性は未確認） | 京都市交通局などGTFS（形式未確認） | 終電は時刻表ベースのみ（遅延は反映しない） | - |
| 混雑 | 首都圏のみ（NAVITIME） | アプリのみ | なし | 混雑はMVPで扱わない | 首都圏で先行 |
| 費用 | 高い（見積もり） | 無料 | 無料 | 無料 | 地域により異なる |
| 実装難易度 | 低〜中 | 高（形式がばらばら、変更に弱い） | 中 | 低 | 中 |
| リスク | 契約・費用 | 規約違反・仕様変更で停止 | カバー不足 | 価値が下がる | 関西ユーザーに不公平 |

**提案:** 関西をMVPの対象にするなら、
1. **終電:** 駅すぱあと API（`lastTrain`）または NAVITIME API（`last_operation`）で時刻表ベースの終電を出す。
2. **遅延:** MVPでは「遅延データなし」で開始し、「最新の運行情報は公式サイトで確認」導線を必ず出す。有料データ（レスキューナウ系）は料金確認後に判断。
3. **混雑:** MVPでは扱わない。
4. **雨:** 非商用の検証段階はOpen-Meteo（JMA MSM）、商用化時は有料プランか気象庁XML＋別データを再検討。

---

## 6. あとで確認すべき項目（未確認一覧）

### 経路・終電
- [ ] Google Routes API: 日本（大阪・京都）で `TRANSIT` が使えるか、どのSKUか、リアルタイム反映の有無
- [ ] 駅すぱあと API: フリープランのリクエスト上限、`lastTrain` を使えるプラン、利用規約・保存条件・表示義務
- [ ] NAVITIME API: RapidAPIで `last_operation` が実時刻表で動くか（平均所要時間ベースになるか）、商用利用・保存・表示義務
- [ ] ジョルダン: オープンAPIの利用上限、Biz APIで終電探索が可能か

### 天気
- [ ] 気象庁: 時間単位の降水予報を公式に機械可読形式で取得する方法、予報業務許可が必要となる範囲
- [ ] Open-Meteo: 商用プランの月額
- [ ] OpenWeather: 無料プランの商用利用可否、帰属表示の条件、日本での分単位降水の精度

### 遅延
- [ ] ODPT: 開発者サイトの利用規約・ライセンス、京都市交通局データの形式
- [ ] 大阪メトロ・阪急・阪神・京阪・近鉄・南海のAPI提供有無
- [ ] レスキューナウ／駅すぱあと運行情報／ジョルダン運行情報サービス／NAVITIME運行情報オプションの料金と更新頻度

### 混雑
- [ ] NAVITIME 混雑度予測（駅）の対応地域
- [ ] 人流データ各社のAPI提供条件と料金
