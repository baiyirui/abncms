<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**무료 · 오픈소스 · 전 세계에서 빠른 경량 CMS**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[공식 사이트 Website](https://cms.abn.cn) · [개발 문서 Docs](https://cms.abn.cn/docs.html) · [온라인 데모 Demo](https://abncms.eu.cc) · [GitHub](https://github.com/baiyirui/abncms) · [이메일 Email](mailto:a@abn.cn)

<br/>

**🌐 多语言 / Languages**

[简体中文](README.md) · [English](README-en.md) · [日本語](README-ja.md) · [한국어](README-ko.md) · [Español](README-es.md) · [Français](README-fr.md) · [Deutsch](README-de.md) · [Português](README-pt.md) · [Русский](README-ru.md)

</div>

---

## 🌱 만들게 된 계기

우리는 **정말로 모두의 것**인 콘텐츠 시스템을 만들고 싶었습니다.

웹사이트를 만드는 일에는 늘 일련의 어려움이 따랐습니다. 서버 구매, 데이터베이스 설정, 매달 내는 요금, 보안 패치 걱정, 콘텐츠를 한 번 바꿀 때마다 다시 빌드해야 하는 번거로움까지. 개인 블로거나 작은 팀, 자료 사이트는 콘텐츠를 자주 갱신하지도 않는데, 무거운 인프라를 위해 오랫동안 비용을 지불해야 했습니다.

동시에 Cloudflare의 무료 플랜은 실제 웹사이트를 운영할 만큼 강력해졌습니다. 전 세계 엣지 네트워크, D1 데이터베이스, KV, 무료 HTTPS와 DDoS 방어를 갖추고 있습니다. 하지만 **'무료 할당량'을 중심으로 설계되면서도 시각적인 관리자 화면에서의 글쓰기 경험을 유지하는** 오픈소스 CMS가 없다는 점을 발견했습니다. 정적 사이트는 빠르지만 콘텐츠를 바꿀 때마다 다시 빌드해야 하고, 동적 사이트는 유연하지만 서버를 운영하는 데 비용이 듭니다.

**ABNCMS는 이 빈자리를 채우기 위해 태어났습니다**:

> Cloudflare 무료 계정만 있으면 누구나 전 세계적으로 빠르고, 운영 부담이 없으며, 관리자 화면이 있고, 언제든 콘텐츠를 갱신할 수 있는 웹사이트를 가질 수 있습니다——게다가 완전히 무료이자 완전히 오픈소스입니다.

그래서 문서를 다국어로 만들었습니다. 오픈소스의 정신은 **세계 어느 구석의 사람이라도 동등하게 사용하고 이해하고 개선할 수 있게 하는 것**입니다. 언어가 장벽이 되어서는 안 됩니다.

---

## ✨ 주요 장점

### 1. 진짜 비용 제로
모든 것이 Cloudflare 무료 플랜 안에서 동작합니다. **서버도, 카드 등록도 필요 없습니다.** D1, KV, Worker, AI는 모두 무료 할당량 안에 있으며, 프로덕션 의존성은 `hono` 하나뿐입니다.

### 2. 태생부터 전 세계 고속
페이지는 Cloudflare의 **전 세계 300여 개 엣지 노드**에 캐싱되어 방문자가 가장 가까운 노드에서 콘텐츠를 받습니다. 지역을 넘어서도 똑같이 매끄럽습니다. HTTPS 인증서와 DDoS 방어도 무료로 제공됩니다.

### 3. 관리자 화면으로 언제든 갱신
순수 정적 사이트처럼 다시 빌드할 필요가 없습니다. **시각적인 관리자 화면**에서 글을 쓰고, 이미지를 올리고, 설정을 바꾸면 저장 즉시 프런트엔드에 반영됩니다——배포 후에도 완전히 통제할 수 있습니다.

### 4. 엣지 캐시로 초고속
페이지 캐시가 히트하면 **데이터베이스 쿼리 0회, KV 읽기/쓰기 0회**로 완성된 HTML을 바로 반환합니다. 글을 발행하거나 수정할 때는 캐시 세대 `cache_gen`을 1만 올리면 오래된 캐시가 즉시 무효화되어 페이지별 정리 없이 사이트 전체가 몇 초 만에 갱신됩니다.

### 5. 가볍고 사용량을 제어하기 쉬움
관리자 화면에서 페이지 캐시, 인기 글, 관련 글, 시맨틱 검색, AI 요약, 댓글, 방문 통계 등을 각각 켜고 끌 수 있습니다. 작은 사이트는 한 번의 클릭으로 'HTML 캐시 + 최소한의 읽기' 모드로 전환해 무료 할당량을 꼭 필요한 곳에 쓸 수 있습니다.

### 6. SEO 친화적이고 안전
의사 정적 URL `/p/{slug}.html`과 기존 링크의 301 리다이렉트, RSS, Sitemap, JSON-LD 구조화 데이터를 지원합니다. PBKDF2 비밀번호, KV 세션, 동일 출처 검증, 실패 시 속도 제한, AES-GCM 암호화 토큰, SQL 완전 파라미터화로 보안까지 챙겼습니다.

### 7. 데이터를 가져갈 수 있고 종속되지 않음
전체 내보내기 / 가져오기 백업을 지원하며 데이터는 여러분 자신의 것입니다. MIT 라이선스로 오픈소스화되어 자유롭게 Fork, 수정, 사설 배포가 가능합니다.

---

## 💰 무료 할당량, 꼭 필요한 곳에

| 리소스 | 무료 할당량 | ABNCMS의 최적화 |
|---|---|---|
| Workers | 하루 10만 요청 | 엣지 캐시가 바로 반환하고 렌더링은 가볍게 유지 |
| D1 데이터베이스 | 500만 행 읽기 / 10만 행 쓰기 | 캐시 히트 시 쿼리 0회, 미스 시 5회 이하, 목록은 반드시 인덱스 사용 |
| KV | 10만 읽기 / 1,000 쓰기 | 페이지 HTML은 Cache API에 저장해 **KV 쓰기 할당량을 차지하지 않음** |
| Workers AI | 하루 1만 neurons | 요약, 태그, 시맨틱 검색은 기본 비활성화, 필요할 때 켜기 |

> 익명 방문이 캐시에 히트하면: **D1 쿼리 0회, KV 읽기/쓰기 0회**——정적 사이트의 속도와 동적 사이트의 '언제든 갱신 가능'한 유연성을 함께 갖췄습니다.

---

## 🚀 빠른 시작

클론에서 배포까지 몇 개의 명령이면 충분하고, Cloudflare 무료 계정 하나로 시작할 수 있습니다.

```bash
# 1. 클론하고 프로젝트로 이동
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. 의존성 설치
npm install

# 3. 설정 준비 (account_id / D1 / KV ID 입력)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. 로컬 데이터베이스 초기화 후 시작
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Cloudflare 글로벌 엣지에 배포
npx wrangler login
python scripts/setup_remote.py    # D1 / KV / Vectorize 자동 생성 및 ID 기록
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

배포 후 관리자 화면은 `/admin/login`입니다. `.dev.vars`의 `ADMIN_PASSWORD`로 처음 로그인한 뒤 즉시 비밀번호를 변경하세요. 자세한 단계는 [전체 개발 문서](https://cms.abn.cn/docs.html)를 참고하세요.

---

## 🧩 기능 둘러보기

- **프런트엔드**: 홈 배너, 글 목록 (`/p/{slug}.html`), 독립 페이지, 카테고리 / 태그 / 아카이브, 전체 텍스트 검색, Markdown 렌더링, 이전/다음 글, 관련 글, 댓글, RSS / Sitemap / JSON-LD, 반응형 사이드바
- **관리자 화면**: 로그인 보호(PBKDF2 + KV 세션 + 속도 제한 + Turnstile), 글과 페이지 관리, 2단 Markdown 편집기, 이미지 호스팅 토큰 시각 설정, 사이트 로고 업로드, 서드파티 통계 코드, 탐색 메뉴, 친구 링크, 미디어 라이브러리, 댓글 승인, 전체 백업 내보내기/가져오기, 사이트 설정
- **Cron**: 매일 UTC 03:00에 만료된 방문 기록과 스팸 댓글 정리

핵심 렌더링을 제외한 대부분의 프런트엔드 기능은 관리자 화면에서 켜고 끌 수 있습니다.

---

## 📁 디렉터리 구조

```
abncms/
├── src/
│   ├── index.ts           # 모든 라우트 + Cron + 캐시 전략
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # 정적 리소스: admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # 증분 마이그레이션 SQL (멱등)
├── schema.sql             # 새 설치용 테이블 생성
├── seed.sql               # 샘플 데이터
└── wrangler.example.jsonc # 설정 템플릿
```

---

## 🔗 관련 링크

| 항목 | 주소 |
|---|---|
| 제품 공식 사이트 | https://cms.abn.cn |
| 개발 문서（中文） | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| 온라인 데모 | https://abncms.eu.cc |
| GitHub 소스 코드 | https://github.com/baiyirui/abncms |
| 이슈 피드백 | https://github.com/baiyirui/abncms/issues |
| 연락처 이메일 | a@abn.cn |

---

## 📄 라이선스

[MIT](LICENSE) 오픈소스입니다. 이름과 로고의 사용은 [TRADEMARK.md](TRADEMARK.md)를 참고하세요.

ABNCMS가 도움이 되었다면 저장소에 ⭐를 눌러주거나 Issue / PR을 보내 함께 더 좋게 만들어 주세요. 오픈소스는 여러분 덕분에 달라집니다.
