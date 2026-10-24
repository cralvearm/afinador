# CLAUDE.md — Afinador

Contexto para asistentes de código (Claude, etc.). Idioma del repo: español.

## Qué es

Afinador cromático web por micrófono para afinaciones no tradicionales: cada cuerda apunta a una frecuencia arbitraria (en Hz o por razones respecto de una fundamental). Vanilla JS, sin build, sin dependencias, sin backend. Desplegado en GitHub Pages: https://cralvearm.github.io/afinador/

## Arquitectura

- `app.js` + `app.css` compartidos en la raíz. Un `index.html` por instrumento (raíz y `bajo/`) que define `window.AFINADOR`: clave de localStorage, cuerdas por defecto, pasaAltos y afinaciones precargadas.
- Detección de tono: método de McLeod (autocorrelación normalizada). Elección manual de cuerda como único modo.
- Los datos del usuario viven solo en su navegador: `localStorage` con clave por instrumento (definida en `window.AFINADOR`). Export/import en texto y archivo .json (sección "Copia de respaldo"), más `navigator.storage.persist()`.
- Enlace compartible por afinación: `?a=<base64url>`, con Web Share o portapapeles.
- PWA instalable: `manifest.webmanifest` + `sw.js` (cache name `afinador-v3`) con precarga y modo offline.

## Reglas del repo

- La app pública parte vacía (`afinaciones: []`): cada usuario guarda sus propias afinaciones en su navegador. No precargar afinaciones en el index público.
- `sw.js`: subir VERSION (`afinador-v4`, `-v5`…) cada vez que cambie index.html o los assets, para refrescar las copias instaladas.
- Commits en español, modo imperativo. Cambios mayores por rama + PR (squash) a `main`; docs y detalles directos a `main`.
- `cristian/` es la copia privada del dueño: sus afinaciones viajan cifradas dentro de su index. No descifrar ni alterar ese blob, y nunca poner claves o afinaciones en claro en este repo. Formato del blob (el código de esa carpeta ya lo implementa): base64 de [salt 16 B][iv 12 B][ciphertext], PBKDF2-SHA256 600 000 iteraciones + AES-256-GCM con WebCrypto; tras descifrar, carga `../app.js` dinámicamente. localStorage: `afinador.cristian.afinaciones` (afinaciones) y `afinador.cristian.clave` (clave recordada por aparato).

## Qué se hizo recientemente (2026-10-24), fuera de Claude

La app la construyó originalmente Claude; estos cambios posteriores se hicieron con otro asistente. Los commits aparecen con el autor del dueño del repo. En orden:

- **PR #1 — PWA**: `manifest.webmanifest` + `sw.js` con precarga y modo offline; enlace compartible por afinación (`?a=<base64url>`); respaldo .json; `navigator.storage.persist()`.
- **PR #2 — la app pública parte vacía** (`afinaciones: []`): las 8 afinaciones personales del dueño salieron del index público para que terceros la abran sin verlas. Las de cada usuario viven en su propio localStorage. Las 8 originales quedaron respaldadas.
- **PR #3 y #4 — `cristian/`**: copia privada del dueño dentro de este repo, con sus afinaciones cifradas con clave (ver formato en "Reglas del repo"). Renombrada desde `m/` (la URL vieja ya no existe). En línea: https://cralvearm.github.io/afinador/cristian/
- **Respaldo maestro en claro**: repo privado `cralvearm/afinador-cristian`, con las 8 afinaciones sin cifrar y el procedimiento de recifrado (ver su propio CLAUDE.md).
- La clave de cifrado jamás va en este repo ni en ningún archivo: la maneja solo el dueño. Si hay que recifrar, se hace con una clave nueva.

## Estructura

- `/` — afinador principal (guitarra)
- `bajo/` — afinador de bajo
- `cristian/` — afinador privado cifrado (ver reglas)
- `app.js`, `app.css` — código compartido
- `sw.js`, `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png` — PWA
