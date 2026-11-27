<div align="center">

<img src="docs/assets/logo-readme.svg" alt="ABNCMS" width="520">

**Un CMS ligero, gratuito, de código abierto y rápido a nivel mundial**

**A free, open-source, globally fast lightweight CMS — built for Cloudflare's free tier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-f6821f.svg)](https://workers.cloudflare.com/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/baiyirui/abncms/pulls)

[官网 Website](https://cms.abn.cn) · [开发手册 Docs](https://cms.abn.cn/docs.html) · [在线演示 Demo](https://abncms.883663.xyz) · [GitHub](https://github.com/baiyirui/abncms) · [邮箱 Email](mailto:a@abn.cn)

<br/>

**🌐 Idiomas / Languages**

[Chino simplificado](README.md) · [Inglés](README-en.md) · [Japonés](README-ja.md) · [Coreano](README-ko.md) · [Español](README-es.md) · [Francés](README-fr.md) · [Alemán](README-de.md) · [Portugués](README-pt.md) · [Ruso](README-ru.md)

</div>

---

## 🌱 Motivación

Queremos crear un sistema de gestión de contenidos que pertenezca **realmente a todos**.

Crear un sitio web solía significar enfrentarse a una serie de dificultades: comprar un servidor, configurar una base de datos, pagar cada mes, preocuparse por los parches de seguridad y reconstruirlo todo cada vez que cambiabas una línea de texto. Y, sin embargo, para blogueros individuales, equipos pequeños y sitios de recursos, donde el contenido no se actualiza con demasiada frecuencia, eso supone pagar a largo plazo por una infraestructura pesada que apenas necesitan.

Al mismo tiempo, el plan gratuito de Cloudflare ya es lo bastante potente para alojar sitios reales: red global de borde, base de datos D1, KV, HTTPS gratuito y protección DDoS. Pero nos faltaba un CMS de código abierto **diseñado en torno a la cuota gratuita y que, al mismo tiempo, conservara una experiencia de escritura visual con panel de administración**: los sitios estáticos son rápidos, pero hay que reconstruirlos en cada cambio; los dinámicos son flexibles, pero hay que pagar un servidor.

**ABNCMS nace para cubrir ese vacío**:

> Cualquier persona con una cuenta gratuita de Cloudflare puede tener un sitio acelerado globalmente, sin mantenimiento, con panel de administración y contenido actualizable en cualquier momento — y además completamente gratuito y de código abierto.

Por eso hemos traducido la documentación a varios idiomas: el espíritu del código abierto consiste en **permitir que personas de todos los rincones del mundo lo usen, lo entiendan y lo mejoren en igualdad de condiciones**. El idioma no debería ser una barrera.

---

## ✨ Ventajas principales

### 1. Coste realmente cero
Todo funciona dentro del plan gratuito de Cloudflare: **sin servidor y sin necesidad de vincular una tarjeta**. D1, KV, Worker y AI entran en la cuota gratuita; la única dependencia de producción es `hono`.

### 2. Aceleración global nativa
Las páginas se almacenan en caché en los **más de 300 nodos de borde** de Cloudflare en todo el mundo, de modo que cada visitante accede desde el punto más cercano, con la misma fluidez en cualquier región. Incluye de forma gratuita certificado HTTPS y protección DDoS.

### 3. Con panel, actualizable cuando quieras
A diferencia de los sitios puramente estáticos, no hace falta reconstruir el proyecto. Escribe artículos, sube imágenes y cambia ajustes en el **panel visual**; los cambios se reflejan al instante en el frontend. Tras publicar, sigues teniendo el control total.

### 4. Caché de borde ultrarrápida
Cuando se acierta en la caché de página: **0 consultas a la base de datos, 0 lecturas/escrituras en KV**, y se devuelve el HTML completo directamente. Al publicar o editar un artículo solo se incrementa en +1 la generación de caché `cache_gen`, invalidando al instante la caché anterior: todo el sitio se actualiza en segundos, sin necesidad de limpiar página por página.

### 5. Ligero y con consumo controlado
El panel permite activar o desactivar por separado la caché de páginas, los artículos populares, las lecturas relacionadas, la búsqueda semántica, los resúmenes con IA, los comentarios y las estadísticas de visitas. Un sitio pequeño puede reducirlo todo de un clic a «solo caché HTML + unas pocas lecturas», para gastar la cuota gratuita donde más importa.

### 6. Optimizado para SEO y seguro
URLs semiestáticas `/p/{slug}.html` + redirecciones 301 de enlaces antiguos, RSS, Sitemap y datos estructurados JSON-LD; contraseñas PBKDF2, sesiones en KV, verificación de mismo origen, limitación de intentos fallidos, tokens cifrados con AES-GCM y SQL totalmente parametrizado.

### 7. Tus datos son tuyos, sin cautividad
Exportación e importación de copias de seguridad completas: los datos te pertenecen. Código abierto bajo licencia MIT: haz un fork, modifícalo o despliégalo en privado sin restricciones.

---

## 💰 Cuota gratuita, aprovechada al máximo

| Recurso | Cuota gratuita | Optimización de ABNCMS |
|---|---|---|
| Workers | 100 000 peticiones / día | La caché de borde responde directamente; renderizado ligero |
| Base de datos D1 | 5 millones de lecturas / 100 000 escrituras | 0 consultas con caché, ≤ 5 sin ella; las listas siempre usan índice |
| KV | 100 000 lecturas / 1 000 escrituras | El HTML de las páginas va a Cache API, **sin consumir cuota de escritura de KV** |
| Workers AI | 10 000 neurons / día | Resúmenes, etiquetas y búsqueda semántica desactivados por defecto; actívalos cuando los necesites |

> Cuando una visita anónima acierta en caché: **0 consultas a D1, 0 lecturas/escrituras en KV** — la velocidad de un sitio estático con la capacidad de «actualizar cuando quieras» de uno dinámico.

---

## 🚀 Inicio rápido

Del clonado a la publicación bastan unos pocos comandos. Una cuenta gratuita de Cloudflare es todo lo que necesitas para empezar.

```bash
# 1. Clona el proyecto y entra en el directorio
git clone https://github.com/baiyirui/abncms.git && cd abncms

# 2. Instala las dependencias
npm install

# 3. Prepara la configuración (rellena account_id / D1 / KV ID)
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars

# 4. Inicializa la base de datos local y arranca
npm run db:local
npx wrangler d1 execute cf-press-db --local --file=./seed.sql
npm run dev          # → http://127.0.0.1:8787

# 5. Despliega en la red global de borde de Cloudflare
npx wrangler login
python scripts/setup_remote.py    # Crea D1 / KV / Vectorize automáticamente y rellena los ID
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

Tras el despliegue, el panel está en `/admin/login`. Inicia sesión por primera vez con el `ADMIN_PASSWORD` de `.dev.vars` y cambia la contraseña inmediatamente. Consulta los pasos detallados en el [manual de desarrollo completo](https://cms.abn.cn/docs.html).

---

## 🧩 Funcionalidades

- **Frontend**: banner de inicio, flujo de artículos (`/p/{slug}.html`), páginas independientes, categorías / etiquetas / archivo, búsqueda de texto completo, renderizado Markdown, artículo anterior y siguiente, lecturas relacionadas, comentarios, RSS / Sitemap / JSON-LD, barra lateral adaptable
- **Panel de administración**: protección de acceso (PBKDF2 + sesión en KV + limitación de intentos + Turnstile), gestión de artículos y páginas, editor Markdown de doble panel, configuración visual del token del alojamiento de imágenes, subida del logotipo del sitio, código de analítica de terceros, menú de navegación, enlaces amigos, biblioteca multimedia, moderación de comentarios, exportación e importación de copias de seguridad completas, ajustes del sitio
- **Cron**: limpieza diaria a las 03:00 UTC de los registros de visitas caducados y de los comentarios spam

Aparte del renderizado básico, casi todas las funciones del frontend se pueden activar o desactivar desde el panel.

---

## 📁 Estructura del proyecto

```
abncms/
├── src/
│   ├── index.ts           # Todas las rutas + Cron + estrategia de caché
│   ├── lib/               # db / auth / crypto / imgbed / markdown / ai / util
│   └── views/             # layout / front / admin
├── public/                # Recursos estáticos: admin.js, favicon, robots.txt
├── scripts/               # setup_remote / migrate / smoke_test
├── migrations/            # Migraciones SQL incrementales (idempotentes)
├── schema.sql             # Crea las tablas en una instalación nueva
├── seed.sql               # Datos de ejemplo
└── wrangler.example.jsonc # Plantilla de configuración
```

---

## 🔗 Enlaces relacionados

| Proyecto | Dirección |
|---|---|
| Sitio web del producto | https://cms.abn.cn |
| Manual de desarrollo (chino) | https://cms.abn.cn/docs.html |
| Documentation (EN) | https://cms.abn.cn/docs-en.html |
| Demostración en línea | https://abncms.883663.xyz |
| Código fuente en GitHub | https://github.com/baiyirui/abncms |
| Informar de problemas | https://github.com/baiyirui/abncms/issues |
| Correo de contacto | a@abn.cn |

---

## 📄 Licencia

[MIT](LICENSE) de código abierto. El uso del nombre y del logotipo se detalla en [TRADEMARK.md](TRADEMARK.md).

Si ABNCMS te ha resultado útil, no dudes en dar una ⭐ al repositorio o enviar un Issue / un PR para mejorarlo. El código abierto es mejor gracias a ti.
