# 5LANCEポータル（独立Webアプリ版）

Claudeアーティファクト版と同じ機能（実績管理・代理店シフト管理・お知らせ・管理者専用ページ）を、
**Googleアカウントでログインする独立したWebアプリ**として動かすためのコードです。

データの保存・認証には無料で使える Google の Firebase を使っています。公開はこのリポジトリの
GitHub Pages で行います。

## セットアップ手順（最初の1回だけ）

### 1. Firebaseプロジェクトを作成する（5分）

1. https://console.firebase.google.com/ を開き、Googleアカウントでログイン
2. 「プロジェクトを追加」→ 好きな名前（例: `5lance-portal`）を入力して作成
   （Googleアナリティクスは「有効にしない」で問題ありません）

### 2. Googleログインを有効にする

1. 作成したプロジェクトの画面で、左メニュー「Authentication」→「Sign-in method」
2. 「Google」を選択し、有効にする → 保存

### 3. Firestore（データベース）を作成する

1. 左メニュー「Firestore Database」→「データベースの作成」
2. 本番環境モードで作成（リージョンは `asia-northeast1`（東京）がおすすめ）
3. 作成後、「ルール」タブを開き、このリポジトリの `firestore.rules` の中身を
   すべてコピーして貼り付け、「公開」をクリック

### 4. （任意）お知らせの添付ファイル機能を使う場合

1. 左メニュー「Storage」→ 使ってみる → 本番環境モードで作成
2. 「Rules」タブに、このリポジトリの `storage.rules` の中身を貼り付けて「公開」

添付ファイル機能を使わない場合は、この手順は飛ばして構いません（自動的に機能が無効表示になります）。

### 5. Webアプリの設定情報を取得する

1. プロジェクトの概要画面（歯車アイコン→プロジェクトの設定）→「全般」タブ
2. 「マイアプリ」で「</>」（ウェブ）を選び、アプリ名を入力して登録
3. 表示された `firebaseConfig` の値を、このリポジトリの `firebase-config.js` に
   コピーして書き換える（Claudeとの会話でこのファイルを更新してもらってもOKです）

### 6. 許可するメールドメインを設定する

`firebase-config.js` の `window.__ALLOWED_DOMAINS` に、ログインを許可する
メールアドレスのドメインを指定します（例: `["5lance.co.jp"]`）。
`firestore.rules` の `isAllowedDomain()` 内のドメイン一覧も同じ内容にしてください。

### 7. GitHub Pagesを有効にする

1. このリポジトリの GitHub 上のページで「Settings」→「Pages」
2. 「Source」を `Deploy from a branch`、ブランチを `main` / `/(root)` に設定して保存
3. 数分後、`https://<あなたのGitHubユーザー名>.github.io/5lance-portal/` でアクセスできるようになります

### 8. 最初の管理者を登録する

1. 上記URLを開き、Googleアカウントでログイン
2. 画面上部の「管理者専用」タブ → パスワード設定画面に、自分の「UID」が表示されるのでコピー
3. Firebaseコンソールの Firestore Database →「admins」コレクションを作成
   → ドキュメントID にそのUIDを貼り付け → 適当なフィールド（例: `allowed: true`）を1つ入れて保存

これで、あなたのアカウントが管理者として認識され、実績目標・シフト・お知らせなどの
管理者専用の保存ができるようになります（他の管理者を追加したい場合も同じ手順です）。

## ファイル構成

- `index.html` … アプリ本体（画面・機能はすべてここに入っています）
- `firebase-config.js` … Firebaseプロジェクトの接続情報とログイン許可ドメイン
- `app-shim.js` … Googleログイン・Firestoreとの接続を行う下回りの仕組み
- `firestore.rules` … データベースのアクセス権限（セキュリティルール）
- `storage.rules` … 添付ファイル用のアクセス権限（任意）
- `manifest.json` / `icon-*.png` / `sw.js` … スマホのホーム画面に追加できるようにするための設定

## 今後の更新について

Claudeとの会話でこのアプリの機能追加・修正を依頼すると、このリポジトリに自動でpushされ、
GitHub Pagesが数分以内に自動的に更新されます。
