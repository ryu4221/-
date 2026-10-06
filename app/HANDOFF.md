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
- 【未公開・Claude実装 2026-10-02】回覧板：教室の2人目の生徒「回覧板」（クリップボードを持つ生徒）。職員へのお知らせ（本文＋PDF等の添付5つまで）、フォルダー（名前と6色）、「見ました」チェック（見た人／まだの人）、未確認・重要・掲載終了の絞り込み、件名・本文・添付ファイル名の検索。使う人は職員名簿から選び、その端末のlocalStorage（board-staff-id）に記憶。退職・休職はフラグで扱う。
- 【未公開・Claude実装 2026-10-02 第2弾】回覧板の追加機能：確認期限（期限まもなく／期限切れ表示）、新しい版の追加（前の版も残り、見ましたは最新版でやり直し）、綴りフォルダー（シフト集など。一覧では1枚にまとめ、開くと月ごと）、コメント、対象者の自由記入（名簿の名前が含まれればその人だけ、無ければ全員）、テンプレート（5種＋保存）、掲載期限（無期限／日付）、管理者だけの削除（暗証番号。5回まちがえると10分ロック）、一覧の小さなプレビュー（PDF1ページ目・画像。投稿者のブラウザーでpdf.js 4.10を使って作る）、ピン留め、印刷・PDF保存画面（/board/print?id=）。
- 【未公開・Claude実装 2026-10-06】文章チェック：教室の3人目の生徒「文章チェック」（赤ペンを持つ生徒）。貼り付けた文章の誤字・脱字、重複、ら抜き・い抜き、二重敬語・重ね言葉、日付と曜日の食い違い、括弧の閉じ忘れ、表記ゆれ・表記の提案を指摘し、「直す」「まとめて直す」「このままにする」「直した文章をコピー」ができる。判定はブラウザー内の規則（lib/proofread.ts）だけで行い、文章は送信・保存しない。DB・APIの変更なし。
- 【未公開・Claude実装 2026-10-06】日々の記録：教室の4人目の生徒「日々の記録」（ノートを持つ生徒）。利用者を選び、その人の特徴（朝が弱い等）・アセスメント／本案（個別支援計画）／モニタリングの最新テキスト書類・今日のメモから、AIが「日々の記録」と「職員考察」の下書きを作る。文例（ノウビーの書き方）を登録すると文体をまねる。下書きは編集・文章チェック・コピー・保存（日付ごと）ができ、削除は管理者のみ。AIに送る前に、本人・家族・他の利用者の氏名、住所、電話番号、受給者証番号、生年月日、メールを伏せる。送る内容は画面で確認できる。AI未設定のときは外部に何も送らず「見本」を表示。
- AIの接続：OpenAI互換の chat/completions 形式。環境変数 AI_BASE_URL・AI_API_KEY・AI_MODEL があればそれを使い、無ければ画面の「AIの設定（管理者）」で登録した値（app_settings。鍵は画面に返さない）を使う。初期のおすすめは Cloudflare Workers AI の無料枠。

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
| public/classroom/ | 教室画像・生徒スプライト（student-board.png は回覧板係） |
| components/BoardConversation.tsx | 回覧板係の会話の流れ（職員選択、管理者、フォルダー、名簿） |
| lib/board.ts | 回覧板の型・色・上限値・対象者/期限の判定・テンプレート |
| lib/boardAdmin.ts | 管理者の暗証番号（PBKDF2）とロック |
| lib/thumbnail.ts | 一覧プレビューの作成（ブラウザー側、pdfjs-dist） |
| components/board/ | 回覧板の一覧・詳細・投稿フォーム |
| app/board/print/page.tsx | 掲示物の印刷・PDF保存画面 |
| components/ProofreadConversation.tsx | 文章チェック係の会話 |
| lib/proofread.ts | 誤字脱字チェックの規則（ブラウザー内で判定） |
| components/DailyConversation.tsx | 日々の記録の係の会話（特徴・資料・メモ・下書き・文例・AIの設定） |
| lib/daily.ts | 伏せ字処理、AIへの指示文、返事の読み取り、見本の文章 |
| lib/ai.ts | AIへの接続（サーバー専用、接続先の切り替え） |
| app/api/daily/route.ts、app/api/daily/generate/route.ts | 特徴・文例・記録・AI設定のAPIと下書き作成 |
| scripts/proofread.test.mts | 規則の確認（node --experimental-strip-types scripts/proofread.test.mts） |
| app/api/board/thumb/[id]/route.ts | 一覧プレビュー画像 |
| app/api/board/route.ts | 回覧板の一覧・投稿・各種操作 |
| app/api/board/files/[id]/route.ts | 回覧板の添付ファイル（PDF・画像はブラウザーで開く） |

## API
- GET /api/records → id,name,city,count の一覧（基本情報は一覧に含まない）
- POST /api/records → name,city,id（idなし新規、あり更新）
- GET /api/records?person=ID → 支援書類一覧
- PUT /api/records → multipart file,person,category（20 MB以下）
- PATCH /api/records → id,name,expectedName（既存書類名のみ変更）
- GET /api/profile?person=ID → 基本情報JSON
- PUT /api/profile → id,profile（基本情報全体を保存。1項目だけ送ると他項目が消えるので必ず全体を送る）
- GET /api/files/ID → ファイル取得
- GET /api/board?staff=職員ID → {staff,folders,posts}。postsのseenはその職員が確認済みか
- GET /api/board?post=ID → {post,files,reads}
- GET /api/board → {staff,folders,posts,templates,hasPin}。postsのmyVersion=その職員が確認した版、readers=最新版を確認した職員ID
- POST /api/board → multipart title,body,folder,author(職員ID),target,due,expires,important,pinned,file×5,thumb（1つ20 MB・合計50 MB）。post=ID を付けると新しい版の追加（file必須、note任意）
- PATCH /api/board → JSON action=read|unread|archive|pin|move|meta（target,due,expires）|comment|template|folder（binder）|staff|setPin|admin
- DELETE /api/board → JSON kind=post|comment|template, id, staff, pin（管理者のみ）
- GET /api/board/files/ID（?download=1で保存）。R2のキーは board/ID

peopleはid/name/city/profile(JSON文字列)、documentsはid/person/category/name/size/created。
日々の記録は person_traits、record_examples、daily_records、app_settings（migration 0004、テーブル追加のみ）。
回覧板はboard_staff、board_folders、board_posts、board_files、board_reads（migration 0002）、board_versions、board_comments、board_templates、board_settings と列の追加（migration 0003）。どちらもテーブル・列の追加のみ。
本番認証はSites側で保護。アプリのsameOriginだけで公開サイトを保護できるわけではありません。

## 起動・確認
Node.js >=22.13.0、npm。使用実績はNode 24。同じPCの既存node_modulesは再利用可。
新しく展開した環境では app/ で以下を実行：

    npm run install:ci
    npm run build

新規のローカルDBだけに、順番に一度ずつ適用：

    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_furry_madripoor.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_flippant_iron_man.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_friendly_adam_warlock.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_dry_cammi.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_secret_sphinx.sql
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

## AIの設定手順（日々の記録）
ユーザーが行うこと（Cloudflare Workers AI の無料枠を使う場合。画面や名称は変わることがあるので、Cloudflareの公式案内も確認する）：
1. Cloudflare の無料アカウントを作る。
2. ダッシュボードで「アカウントID」（32文字の英数字）を確認する。
3. 「APIトークン」を作る。権限は Workers AI の読み取り／実行だけにする。
4. Workers AI のモデル一覧から、日本語が使えるモデル名を選ぶ（例：@cf/meta/llama-3.3-70b-instruct-fp8-fast。実際に使えるかは一覧で確認）。
5. アプリの「日々の記録」→「AIの設定（管理者）」で、サービス＝Cloudflare、アカウントID、モデル名、鍵（APIトークン）、管理者の暗証番号を入れて保存する。
Codexが確認すること：公開先（Sites）から api.cloudflare.com などの外部へ通信できるか。Sitesが秘密の環境変数に対応していれば、AI_BASE_URL・AI_API_KEY・AI_MODEL で設定してもよい（その場合は画面の設定より優先される）。鍵をコード・Git・TURN_LOGに書かない。
無料枠を超えると「無料で使える量を超えました」と表示され、翌日まで使えない（文章チェックの規則判定は使える）。
