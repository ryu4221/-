# 支援の教室：開発引き継ぎ

## 現在の状態
- 公開URL：https://shien-file-room.ryu160324.chatgpt.site/
- 公開済みコミット：d45e5eecd5c76b2ed0bfb161bc8661703a397a9f
- 公開先project_id：appgprj_6abc6b58820081919eb988b0c4a2fed9
- 最新deployment：appgdep_6abf49dcdee08191957eb7451e1c7fd8（成功確認済み）
- アクセスは所有者限定。共有範囲を変更しない。
- 開発コードは完成した最新公開版と一致。次の機能は未指定。

## 完成済み機能
- 教室ホーム、小さなピクセル生徒、低頻度のゆっくりした移動、動きを止める機能。
- 生徒を選択すると近づき、会話形式の選択画面を開く。
- 選択肢：利用者各基本情報／利用者を探す／利用者を登録する／支援書類を確認・保存する／利用者一覧。
- 基本情報ボタン→氏名・自治体で利用者検索→同じ会話内で生年月日・住所等を確認。
- /users では利用者一覧、基本情報の表示・編集、書類の分類と保存・ダウンロード。
- 本番は30名（退所者4名を含む）、368ファイル。生年月日・住所を含む基本情報も30名登録・照合済み。
- 支援書類214件と、そこから分離した議事録欄154件。元画面の転記TXTであり、正式PDF・署名・印影ではない。
- 本人電話番号は取得時に非表示だったため空欄。phoneUnavailable=trueで区別。その他の未入力は補完していない。
- 日々の支援記録、請求、工賃等の業務機能は未実装・未取込。

## 技術構成とファイル
TypeScript / React 19 / vinext + Vite / Cloudflare Workers互換 / D1 / R2。
package.jsonにはNextもありますが、実際のdev/buildはscripts/run-framework.mjs経由のvinextです。

| ファイル | 役割 |
|---|---|
| app/page.tsx、app/classroom.css | 教室画面・演出 |
| lib/classroom.ts | 機能係の生徒一覧と教室の拡張 |
| components/StudentConversation.tsx | 会話の状態遷移、利用者選択、基本情報、書類操作 |
| app/users/page.tsx | 通常の利用者管理画面 |
| components/BasicProfile.tsx、lib/profile.ts | 基本情報の表示・編集・検証 |
| app/api/records/route.ts | 利用者・書類の一覧、登録、ファイル名修正 |
| app/api/profile/route.ts | 利用者別基本情報の取得・保存 |
| app/api/files/[id]/route.ts | R2書類のダウンロード |
| lib/storage.ts | DB/R2参照、同一オリジン検査 |
| db/schema.ts、drizzle/ | データ構造とmigration |
| public/classroom/ | 教室画像・生徒スプライト |

## API
- GET /api/records → id,name,city,count の一覧（基本情報は一覧に含まない）
- POST /api/records → name,city,id（idなし新規、あり更新）
- GET /api/records?person=ID → 支援書類一覧
- PUT /api/records → multipart file,person,category（20 MB以下）
- PATCH /api/records → id,name,expectedName（既存書類名のみ変更）
- GET /api/profile?person=ID → 基本情報JSON
- PUT /api/profile → id,profile（基本情報全体を保存。1項目だけ送ると他項目が消えるので必ず全体を送る）
- GET /api/files/ID → ファイル取得

peopleはid/name/city/profile(JSON文字列)、documentsはid/person/category/name/size/created。
本番認証はSites側で保護。アプリのsameOriginだけで公開サイトを保護できるわけではありません。

## 起動・確認
Node.js >=22.13.0、npm。使用実績はNode 24。同じPCの既存node_modulesは再利用可。
新しく展開した環境では app/ で以下を実行：

    npm run install:ci
    npm run build

新規のローカルDBだけに、順番に一度ずつ適用：

    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_furry_madripoor.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_flippant_iron_man.sql
    npm run dev

既存ローカルDBにmigrationを二重適用しないこと。本番への --remote 操作は行わないこと。
標準の開発ポートは5173。実際に端末が表示するURLを使う。ローカルDBは本番と別なので、30名が表示されなくても異常ではない。
必要なローカルサインインはREADME.mdのPortable説明を参照。開発サーバーは127.0.0.1に限定。
型チェック：node node_modules/typescript/bin/tsc --noEmit
ビルド：npm run build（または node scripts/run-framework.mjs build）
新しい環境での依存インストール・起動はこの引き継ぎ作成時には再実施していません。

## 公開担当への情報
現在はSitesプラグインで既存projectを開き、sourceをpushし、そのcommitから作ったarchiveをprivate deployする運用。
短期トークンは引き継ぎに含めず、担当の正規ツールで取得する。
Windowsで公式site-workflow.mjsのpackage-site.sh呼び出しがパス解釈エラーになることがある。
直近ではbuildとsource push後に、公式prepare-site-build.cjsでステージへ準備し、.openai/hosting.jsonとdrizzleを含めてWindows tarで梱包、そのSHAで既存Sitesへ公開した。
推測したSHAや別のビルドを公開しない。前回成功版を再度保存する必要はない。

## 交代時に確認すること
1. 現在のGit差分とユーザーの最新依頼。
2. 基本情報・書類を消していないか。
3. 変更部分の型チェック・ビルド・操作確認。
4. TURN_LOG.md更新。公開済み／未公開を明記。
5. 次の担当へ変更ファイルと残作業を渡す。
