<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**Um CMS leve, gratuito, de código aberto e extremamente rápido no mundo todo**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[官网 Website](https://cms.abn.cn) · [开发手册 Docs](https://cms.abn.cn/docs.html) · [在线演示 Demo](https://abncms.883663.xyz) · [GitHub](https://github.com/baiyirui/abncms) · [邮箱 Email](mailto:a@abn.cn)

<br/>

**🌐 Idiomas / Languages**

[Chinês simplificado](README.md) · [Inglês](README-en.md) · [Japonês](README-ja.md) · [Coreano](README-ko.md) · [Espanhol](README-es.md) · [Francês](README-fr.md) · [Alemão](README-de.md) · [Português](README-pt.md) · [Russo](README-ru.md)

</div>

---

## 🌱 Motivação original

Queremos criar um sistema de gerenciamento de conteúdo que **realmente pertença a todos**.

Antes, criar um site significava enfrentar uma série de dificuldades: comprar um servidor, configurar um banco de dados, pagar mensalmente, preocupar-se com patches de segurança e reconstruir tudo a cada alteração de conteúdo. Para blogueiros individuais, equipes pequenas e sites de recursos, que atualizam seus conteúdos com pouca frequência, isso significa pagar a longo prazo por uma infraestrutura pesada da qual mal precisam.

Ao mesmo tempo, o plano gratuito da Cloudflare já é poderoso o suficiente para hospedar sites reais: rede global de borda, banco de dados D1, KV, HTTPS gratuito e proteção contra DDoS. Mas percebemos que faltava um CMS de código aberto **projetado em torno do limite gratuito e que, ao mesmo tempo, mantivesse uma experiência de escrita visual com painel administrativo**: sites estáticos são rápidos, mas exigem uma nova build a cada mudança; sites dinâmicos são flexíveis, mas custam um servidor.

**O ABNCMS nasceu para preencher essa lacuna:**

> Qualquer pessoa com uma conta gratuita da Cloudflare pode ter um site acelerado globalmente, sem manutenção, com painel administrativo e conteúdo atualizável a qualquer momento — totalmente gratuito e totalmente de código aberto.

É por isso que traduzimos a documentação para vários idiomas: o espírito do código aberto é **permitir que pessoas de todos os cantos do mundo usem, entendam e melhorem o projeto em igualdade de condições**. Idioma não deveria ser uma barreira.

---

## ✨ Vantagens principais

### 1. Custo realmente zero
Tudo roda dentro do plano gratuito da Cloudflare: **sem servidor e sem precisar cadastrar cartão**. D1, KV, Worker e AI estão dentro do limite gratuito; a única dependência de produção é o `hono`.

### 2. Aceleração global nativa
As páginas ficam em cache nos **mais de 300 nós de borda** da Cloudflare ao redor do mundo, para que cada visitante acesse a partir do ponto mais próximo, com a mesma fluidez em qualquer região. Certificado HTTPS e proteção DDoS inclusos gratuitamente.

### 3. Com painel administrativo, atualize quando quiser
Ao contrário de sites puramente estáticos, não é preciso reconstruir o projeto. Escreva artigos, envie imagens e altere configurações no **painel visual**; o frontend é atualizado na hora. Depois de publicar, você continua com controle total.

### 4. Cache de borda ultrarrápido
Quando há hit no cache de página: **0 consultas ao banco de dados, 0 leituras/escritas no KV**, e o HTML completo é devolvido diretamente. Ao publicar ou editar um artigo, basta incrementar em +1 a geração de cache `cache_gen`: o cache antigo é invalidado na hora e todo o site é atualizado em segundos, sem precisar limpar página por página.

### 5. Leve e com consumo controlado
O painel permite ativar ou desativar separadamente o cache de páginas, artigos populares, leituras relacionadas, busca semântica, resumos com IA, comentários e estatísticas de visitas. Um site pequeno pode reduzir tudo com um clique para «apenas cache de HTML + poucas leituras», gastando o limite gratuito onde realmente importa.

### 6. Otimizado para SEO e seguro
URLs semiestáticas `/p/{slug}.html` + redirecionamentos 301 de links antigos, RSS, Sitemap e dados estruturados JSON-LD; senhas com PBKDF2, sessões em KV, verificação de mesma origem, limitação de tentativas falhas, tokens criptografados com AES-GCM e SQL totalmente parametrizado.

### 7. Seus dados são seus, sem dependência
Exportação e importação de backups completos: os dados pertencem a você. Código aberto sob a licença MIT — faça um fork, modifique ou implante de forma privada sem restrições.

---

## 💰 Limite gratuito, usado com inteligência

| Recurso | Limite gratuito | Otimização do ABNCMS |
|---|---|---|
| Workers | 100 mil requisições / dia | Resposta direta pelo cache de borda, renderização leve |
| Banco de dados D1 | 5 milhões de leituras / 100 mil escritas | 0 consultas com cache, no máximo 5 sem ele; listas sempre usam índice |
| KV | 100 mil leituras / 1 mil escritas | O HTML das páginas fica na Cache API, **sem consumir o limite de escrita do KV** |
| Workers AI | 10 mil neurons / dia | Resumos, tags e busca semântica desligados por padrão, ative quando precisar |

> Em visitas anônimas com hit no cache: **0 consultas ao D1, 0 leituras/escritas no KV** — a velocidade de um site estático com a capacidade de «atualizar a qualquer momento» de um site dinâmico.

---

## 🚀 Início rápido

Do clone à publicação são apenas alguns comandos. Uma conta gratuita da Cloudflare é tudo o que você precisa para começar.

```bash
# 1. Clone o projeto e entre no diretório
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. Instale as dependências
npm install

# 3. Prepare a configuração (preencha account_id / D1 / KV ID)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. Inicialize o banco de dados local e inicie
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Faça o deploy na rede global de borda da Cloudflare
npx wrangler login
python scripts/setup_remote.py    # Cria D1 / KV / Vectorize automaticamente e preenche os IDs
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

Após o deploy, o painel administrativo fica em `/admin/login`. Faça o primeiro login com o `ADMIN_PASSWORD` do `.dev.vars` e altere a senha imediatamente. Veja o passo a passo no [manual de desenvolvimento completo](https://cms.abn.cn/docs.html).

---

## 🧩 Visão geral dos recursos

- **Frontend**: banner da página inicial, feed de artigos (`/p/{slug}.html`), páginas independentes, categorias / tags / arquivos, busca em texto completo, renderização Markdown, artigo anterior e próximo, leituras relacionadas, comentários, RSS / Sitemap / JSON-LD, barra lateral responsiva
- **Painel administrativo**: proteção de login (PBKDF2 + sessão em KV + limitação de tentativas + Turnstile), gerenciamento de artigos e páginas, editor Markdown de duas colunas, configuração visual do token de hospedagem de imagens, upload do logotipo do site, código de analytics de terceiros, menu de navegação, links amigos, biblioteca de mídia, moderação de comentários, exportação e importação de backup completo, configurações do site
- **Cron**: limpeza diária às 03:00 UTC de registros de acesso expirados e comentários spam

Além da renderização principal, quase todos os recursos do frontend podem ser ativados ou desativados no painel.

---

## 📁 Estrutura de diretórios

```
abncms/
├── src/
│   ├── index.ts           # Todas as rotas + Cron + estratégia de cache
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # Recursos estáticos: admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # Migrações SQL incrementais (idempotentes)
├── schema.sql             # Cria as tabelas para uma instalação nova
├── seed.sql               # Dados de exemplo
└── wrangler.example.jsonc # Modelo de configuração
```

---

## 🔗 Links relacionados

| Projeto | Endereço |
|---|---|
| Site oficial | https://cms.abn.cn |
| Manual de desenvolvimento (chinês) | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| Demonstração online | https://abncms.883663.xyz |
| Código-fonte no GitHub | https://github.com/baiyirui/abncms |
| Relatar problemas | https://github.com/baiyirui/abncms/issues |
| E-mail de contato | a@abn.cn |

---

## 📄 Licença

[MIT](LICENSE) sob licença de código aberto. O uso do nome e do logotipo está descrito em [TRADEMARK.md](TRADEMARK.md).

Se o ABNCMS ajudou você, dê uma ⭐ ao repositório ou abra uma Issue / um PR para melhorá-lo ainda mais. O código aberto é diferente graças a você.
