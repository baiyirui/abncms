<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**無料・オープンソース・世界中で高速な軽量CMS**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[公式サイト Website](https://cms.abn.cn) · [開発ドキュメント Docs](https://cms.abn.cn/docs.html) · [オンラインデモ Demo](https://abncms.883663.xyz) · [GitHub](https://github.com/baiyirui/abncms) · [メール Email](mailto:a@abn.cn)

<br/>

**🌐 多语言 / Languages**

[简体中文](README.md) · [English](README-en.md) · [日本語](README-ja.md) · [한국어](README-ko.md) · [Español](README-es.md) · [Français](README-fr.md) · [Deutsch](README-de.md) · [Português](README-pt.md) · [Русский](README-ru.md)

</div>

---

## 🌱 制作のきっかけ

私たちは、**本当にすべての人のための**コンテンツシステムを作りたいと考えました。

ウェブサイトを作るには、これまでさまざまな課題がつきものでした。サーバーの購入、データベースの設定、毎月の支払い、セキュリティパッチへの気遣い、コンテンツを少し変えるたびに必要になる再ビルド——。個人ブログや小さなチーム、資料系サイトではコンテンツの更新頻度はそれほど高くないのに、重厚なインフラに対して長期的にコストを払い続ける必要がありました。

その一方で、Cloudflare の無料プランは実際のウェブサイトを運用できるほど強力になっています。グローバルなエッジネットワーク、D1 データベース、KV、無料の HTTPS と DDoS 保護が揃っています。しかし、**「無料枠」を前提に設計されながら、ビジュアルな管理画面での執筆体験も残している**オープンソース CMS が足りないことに気づきました。静的サイトは高速ですが、コンテンツを変更するたびに再ビルドが必要です。動的サイトは柔軟ですが、サーバーの運用に費用がかかります。

**ABNCMS は、この空白を埋めるために生まれました**:

> Cloudflare の無料アカウントさえあれば、誰でもグローバルに高速化され、運用の手間がかからず、管理画面付きで、コンテンツをいつでも更新できるウェブサイトを持てます——しかも完全に無料、完全にオープンソース。

だからこそ、私たちはドキュメントを多言語化しました。オープンソースの精神は、**世界のあらゆる場所の人々が対等に使い、理解し、改善できるようにすること**です。言語が壁になってはなりません。

---

## ✨ 主な利点

### 1. 本当にコストゼロ
すべて Cloudflare の無料プラン内で動作し、**サーバーもクレジットカード登録も不要**です。D1、KV、Worker、AI はすべて無料枠内に収まり、本番環境の依存パッケージは `hono` のみです。

### 2. 最初からグローバル高速
ページは Cloudflare の**世界中 300 以上のエッジ拠点**にキャッシュされ、訪問者は最寄りのノードから配信されます。地域をまたいでも同じように快適です。HTTPS 証明書と DDoS 保護も無料で標準装備です。

### 3. 管理画面があり、いつでも更新できる
純粋な静的サイトのように再ビルドは必要ありません。**ビジュアルな管理画面**で記事を書き、画像をアップロードし、設定を変更すると、保存後すぐにフロントエンドへ反映されます——公開後も完全にコントロールできます。

### 4. エッジキャッシュによる超高速化
ページキャッシュがヒットした場合、**データベースクエリ 0 回、KV の読み書き 0 回**で完全な HTML を直接返します。公開や記事の編集時はキャッシュ世代 `cache_gen` を 1 上げるだけで古いキャッシュが即座に無効化され、ページごとの削除なしにサイト全体が数秒で更新されます。

### 5. 軽量で消費量をコントロールしやすい
管理画面では、ページキャッシュ、人気記事、関連記事、セマンティック検索、AI 要約、コメント、アクセス統計などを個別にオン／オフできます。小規模サイトならワンクリックで「HTML キャッシュのみ＋ごく少数の読み取り」に切り替えられ、無料枠を必要な場所に集中させられます。

### 6. SEO に強く、安全
疑似静的 URL `/p/{slug}.html` と旧リンクの 301 リダイレクト、RSS、Sitemap、JSON-LD 構造化データに対応。PBKDF2 パスワード、KV セッション、同一オリジン検証、失敗時のレート制限、AES-GCM 暗号化トークン、SQL の完全パラメータ化で安全性も確保しています。

### 7. データを持ち出せる、ロックインなし
バックアップの全量エクスポート／インポートに対応し、データはあなた自身のものです。MIT ライセンスでオープンソース化しており、自由に Fork、改造、私有デプロイが可能です。

---

## 💰 無料枠を、必要な場所に

| リソース | 無料枠 | ABNCMS の最適化 |
|---|---|---|
| Workers | 10 万リクエスト / 日 | エッジキャッシュが直接返し、レンダリングは軽量に維持 |
| D1 データベース | 500 万行読み取り / 10 万行書き込み | キャッシュヒット時 0 クエリ、未ヒット時 5 回以下、一覧は必ずインデックスを使用 |
| KV | 10 万読み取り / 1,000 書き込み | ページ HTML は Cache API に配置し、**KV の書き込み枠を使わない** |
| Workers AI | 1 万 neurons / 日 | 要約、タグ、セマンティック検索はデフォルトでオフ、必要に応じて有効化 |

> 匿名アクセスがキャッシュにヒットした場合: **D1 クエリ 0 回、KV の読み書き 0 回**——静的サイトの速さと動的サイトの「いつでも更新できる」柔軟性を兼ね備えています。

---

## 🚀 クイックスタート

クローンから公開までほんの数コマンド、Cloudflare の無料アカウントだけで始められます。

```bash
# 1. クローンしてプロジェクトに移動
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. 依存関係をインストール
npm install

# 3. 設定を用意（account_id / D1 / KV の ID を入力）
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. ローカルデータベースを初期化して起動
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Cloudflare のグローバルエッジへデプロイ
npx wrangler login
python scripts/setup_remote.py    # D1 / KV / Vectorize を自動作成し ID を書き戻す
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

デプロイ後、管理画面は `/admin/login` です。`.dev.vars` の `ADMIN_PASSWORD` で初回ログインし、ログイン後ただちにパスワードを変更してください。詳細な手順は[完全な開発ドキュメント](https://cms.abn.cn/docs.html)をご覧ください。

---

## 🧩 機能一覧

- **フロントエンド**: トップページのバナー、記事一覧（`/p/{slug}.html`）、独立ページ、カテゴリ / タグ / アーカイブ、全文検索、Markdown レンダリング、前後の記事、関連記事、コメント、RSS / Sitemap / JSON-LD、レスポンシブサイドバー
- **管理画面**: ログイン保護（PBKDF2 + KV セッション + レート制限 + Turnstile）、記事と固定ページの管理、2 カラム Markdown エディター、画像ホスティングトークンのビジュアル設定、サイトロゴのアップロード、サードパーティ解析コード、ナビゲーションメニュー、友情リンク、メディアライブラリ、コメント承認、全量バックアップのエクスポート／インポート、サイト設定
- **Cron**: 毎日 UTC 03:00 に期限切れのアクセス履歴とスパムコメントを削除

コアのレンダリングを除き、ほとんどのフロントエンド機能は管理画面でオン／オフできます。

---

## 📁 ディレクトリ構成

```
abncms/
├── src/
│   ├── index.ts           # すべてのルート + Cron + キャッシュ戦略
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # 静的アセット：admin.js、favicon、robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # 差分マイグレーション SQL（冪等）
├── schema.sql             # 新規インストール用のテーブル作成
├── seed.sql               # サンプルデータ
└── wrangler.example.jsonc # 設定テンプレート
```

---

## 🔗 関連リンク

| 項目 | アドレス |
|---|---|
| 製品公式サイト | https://cms.abn.cn |
| 開発ドキュメント（中文） | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| オンラインデモ | https://abncms.883663.xyz |
| GitHub ソースコード | https://github.com/baiyirui/abncms |
| 課題・バグ報告 | https://github.com/baiyirui/abncms/issues |
| 連絡先メール | a@abn.cn |

---

## 📄 ライセンス

[MIT](LICENSE) オープンソースです。名称とロゴの使用については [TRADEMARK.md](TRADEMARK.md) をご覧ください。

ABNCMS が役に立ったら、リポジトリに ⭐ を付けたり、Issue / PR を送って一緒に改善していただけると嬉しいです。オープンソースはあなたによってより良くなります。
