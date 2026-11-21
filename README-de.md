<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**Ein kostenloses, quelloffenes und weltweit schnelles leichtgewichtiges CMS**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[官网 Website](https://cms.abn.cn) · [开发手册 Docs](https://cms.abn.cn/docs.html) · [在线演示 Demo](https://abncms.eu.cc) · [GitHub](https://github.com/baiyirui/abncms) · [邮箱 Email](mailto:a@abn.cn)

<br/>

**🌐 Sprachen / Languages**

[Vereinfachtes Chinesisch](README.md) · [Englisch](README-en.md) · [Japanisch](README-ja.md) · [Koreanisch](README-ko.md) · [Spanisch](README-es.md) · [Französisch](README-fr.md) · [Deutsch](README-de.md) · [Portugiesisch](README-pt.md) · [Russisch](README-ru.md)

</div>

---

## 🌱 Warum wir ABNCMS entwickelt haben

Wir wollen ein Content-Management-System schaffen, das **wirklich allen gehört**.

Eine Website zu bauen bedeutete früher eine Reihe von Hürden: einen Server kaufen, eine Datenbank einrichten, monatlich zahlen, sich um Sicherheitspatches kümmern und bei jeder inhaltlichen Änderung alles neu bauen. Für einzelne Blogger, kleine Teams und Ressourcen-Seiten, die ihre Inhalte nur selten aktualisieren, heißt das jedoch, dauerhaft für eine schwere Infrastruktur zu zahlen, die sie eigentlich nicht brauchen.

Gleichzeitig ist der kostenlose Tarif von Cloudflare inzwischen leistungsfähig genug, um echte Websites zu betreiben: globales Edge-Netzwerk, D1-Datenbank, KV, kostenloses HTTPS und DDoS-Schutz. Uns fehlte jedoch ein Open-Source-CMS, das **konsequent um das kostenlose Kontingent herum entwickelt wurde und dennoch eine visuelle Schreiberfahrung mit Backend bietet**: statische Seiten sind schnell, müssen aber bei jeder Änderung neu gebaut werden; dynamische Seiten sind flexibel, kosten aber einen Server.

**ABNCMS wurde genau für diese Lücke entwickelt:**

> Jeder kann mit einem kostenlosen Cloudflare-Konto eine weltweit beschleunigte, wartungsfreie Website mit Backend und jederzeit aktualisierbaren Inhalten betreiben — vollständig kostenlos und vollständig quelloffen.

Aus diesem Grund haben wir die Dokumentation in mehrere Sprachen übersetzt: Der Geist von Open Source bedeutet, **Menschen in jedem Teil der Welt gleiche Möglichkeiten zu geben, das Projekt zu nutzen, zu verstehen und zu verbessern**. Sprache sollte keine Hürde sein.

---

## ✨ Kernvorteile

### 1. Wirklich null Kosten
Alles läuft innerhalb des kostenlosen Cloudflare-Tarifs: **kein Server, keine Kreditkarte nötig**. D1, KV, Worker und AI liegen im kostenlosen Kontingent; die einzige Produktionsabhängigkeit ist `hono`.

### 2. Von Grund auf weltweit beschleunigt
Seiten werden auf den **300+ Edge-Knoten** von Cloudflare rund um den Globus zwischengespeichert, sodass Besucher von der nächstgelegenen Location aus zugreifen — in jeder Region gleich flüssig. HTTPS-Zertifikat und DDoS-Schutz sind kostenlos enthalten.

### 3. Backend vorhanden, jederzeit aktualisierbar
Anders als bei rein statischen Seiten ist kein Neuaufbau nötig. Schreiben Sie Artikel, laden Sie Bilder hoch und ändern Sie Einstellungen im **visuellen Backend** — das Frontend aktualisiert sich sofort. Auch nach der Veröffentlichung behalten Sie die volle Kontrolle.

### 4. Extrem schneller Edge-Cache
Bei einem Cache-Hit: **0 Datenbankabfragen, 0 KV-Lese-/Schreibvorgänge**, und das vollständige HTML wird direkt ausgeliefert. Beim Veröffentlichen oder Bearbeiten eines Artikels wird nur die Cache-Generation `cache_gen` um +1 erhöht, wodurch der alte Cache sofort ungültig wird: die gesamte Website aktualisiert sich in Sekunden, ohne dass jede Seite einzeln geleert werden muss.

### 5. Leichtgewichtig und kontrollierter Verbrauch
Das Backend erlaubt es, Seiten-Cache, beliebte Artikel, verwandte Artikel, semantische Suche, KI-Zusammenfassungen, Kommentare und Besuchsstatistiken jeweils getrennt ein- oder auszuschalten. Eine kleine Website kann mit einem Klick auf „nur HTML-Cache + wenige Lesevorgänge" reduzieren und das kostenlose Kontingent dort einsetzen, wo es am meisten zählt.

### 6. SEO-freundlich und sicher
Pseudostatische URLs `/p/{slug}.html` + 301-Weiterleitungen für alte Links, RSS, Sitemap und JSON-LD-strukturierte Daten; PBKDF2-Passwörter, KV-Sessions, Same-Origin-Prüfung, Ratenbegrenzung bei Fehlversuchen, AES-GCM-verschlüsselte Tokens und vollständig parametrisiertes SQL.

### 7. Daten bleiben portierbar, kein Vendor Lock-in
Vollständiger Export und Import von Backups: Ihre Daten gehören Ihnen. Open Source unter der MIT-Lizenz — forken, anpassen und privat deployen, ganz ohne Einschränkungen.

---

## 💰 Kostenloses Kontingent, sinnvoll genutzt

| Ressource | Kostenloses Kontingent | ABNCMS-Optimierung |
|---|---|---|
| Workers | 100.000 Anfragen / Tag | Direkte Antwort aus dem Edge-Cache, schlankes Rendering |
| D1-Datenbank | 5 Mio. gelesene Zeilen / 100.000 geschriebene Zeilen | 0 Abfragen bei Cache-Hit, höchstens 5 sonst; Listen laufen immer über Indizes |
| KV | 100.000 Lesevorgänge / 1.000 Schreibvorgänge | Seiten-HTML liegt in der Cache API, **belegt kein KV-Schreibkontingent** |
| Workers AI | 10.000 neurons / Tag | Zusammenfassungen, Tags und semantische Suche standardmäßig deaktiviert, bei Bedarf aktivierbar |

> Bei anonymen Zugriffen mit Cache-Hit: **0 D1-Abfragen, 0 KV-Lese-/Schreibvorgänge** — die Geschwindigkeit einer statischen Seite mit der Aktualisierbarkeit einer dynamischen.

---

## 🚀 Schnellstart

Vom Klonen bis zum Livegang sind es nur ein paar Befehle. Ein kostenloses Cloudflare-Konto genügt, um loszulegen.

```bash
# 1. Projekt klonen und in das Verzeichnis wechseln
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. Abhängigkeiten installieren
npm install

# 3. Konfiguration vorbereiten (account_id / D1 / KV-IDs eintragen)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. Lokale Datenbank initialisieren und starten
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Auf das globale Edge-Netzwerk von Cloudflare deployen
npx wrangler login
python scripts/setup_remote.py    # Erstellt D1 / KV / Vectorize automatisch und trägt die IDs ein
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

Nach dem Deployment ist das Backend unter `/admin/login` erreichbar. Melden Sie sich zum ersten Mal mit dem `ADMIN_PASSWORD` aus `.dev.vars` an und ändern Sie das Passwort sofort. Details finden Sie im [vollständigen Entwicklerhandbuch](https://cms.abn.cn/docs.html).

---

## 🧩 Funktionsübersicht

- **Frontend**: Startseiten-Banner, Artikel-Feed (`/p/{slug}.html`), eigenständige Seiten, Kategorien / Tags / Archive, Volltextsuche, Markdown-Rendering, vorheriger und nächster Artikel, verwandte Artikel, Kommentare, RSS / Sitemap / JSON-LD, responsive Seitenleiste
- **Backend**: Login-Schutz (PBKDF2 + KV-Session + Ratenbegrenzung + Turnstile), Verwaltung von Artikeln und Seiten, Markdown-Editor mit zwei Spalten, visuelle Konfiguration des Bild-Hosting-Tokens, Upload des Website-Logos, Code für externe Statistik, Navigationsmenü, Links zu Partnerwebsites, Mediathek, Kommentarmoderation, vollständiger Backup-Export/-Import, Website-Einstellungen
- **Cron**: Tägliche Bereinigung um 03:00 UTC von abgelaufenen Zugriffsdaten und Spam-Kommentaren

Abgesehen vom Kern-Rendering lassen sich fast alle Frontend-Funktionen im Backend ein- und ausschalten.

---

## 📁 Verzeichnisstruktur

```
abncms/
├── src/
│   ├── index.ts           # Alle Routen + Cron + Cache-Strategie
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # Statische Assets: admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # Inkrementelle SQL-Migrationen (idempotent)
├── schema.sql             # Tabellen für eine Neuinstallation anlegen
├── seed.sql               # Beispieldaten
└── wrangler.example.jsonc # Konfigurationsvorlage
```

---

## 🔗 Verwandte Links

| Projekt | Adresse |
|---|---|
| Offizielle Website | https://cms.abn.cn |
| Entwicklerhandbuch (Chinesisch) | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| Online-Demo | https://abncms.eu.cc |
| GitHub-Quellcode | https://github.com/baiyirui/abncms |
| Fehler melden | https://github.com/baiyirui/abncms/issues |
| Kontakt-E-Mail | a@abn.cn |

---

## 📄 Lizenz

[MIT](LICENSE) unter Open-Source-Lizenz. Die Verwendung von Name und Logo ist in [TRADEMARK.md](TRADEMARK.md) geregelt.

Wenn ABNCMS Ihnen hilft, geben Sie dem Repository gerne einen ⭐ oder eröffnen Sie ein Issue / einen PR, um es gemeinsam zu verbessern. Open Source lebt von Ihnen.
