# CLAUDE.md — Afinador

Contexto para asistentes de código (Claude, etc.). Idioma del repo: español.

## Qué es

Afinador cromático web por micrófono para afinaciones no tradicionales: cada cuerda apunta a una frecuencia arbitraria (en Hz o por razones respecto de una fundamental). Vanilla JS, sin build, sin dependencias, sin backend. Desplegado en GitHub Pages: https://cralvearm.github.io/afinador/

## Arquitectura

- `app.js` + `app.css` compartidos en la raíz. Un `index.html` por instrumento (raíz y `bajo/`) que define `window.AFINADOR`: clave de localStorage, cuerdas por defecto, pasaAltos y afinaciones precargadas.
- Detección de tono: método de McLeod (autocorrelación normalizada). Elección manual de cuerda como único modo.
- Los datos del usuario viven solo en su navegador: `localStorage` con clave por instrumento (definida en `window.AFINADOR`). Export/import en texto y archivo .json (sección "Copia de respaldo"), más `navigator.storage.persist()`.
- Enlace compartible por afinación: `?a=<base64url>`, con Web Share o portapapeles.
- PWA instalable: `manifest.webmanifest` + `sw.js` (cache name `afinador-v5`) con precarga y modo offline.

## Reglas del repo

- La app pública parte vacía (`afinaciones: []`): cada usuario guarda sus propias afinaciones en su navegador. No precargar afinaciones en el index público.
- `sw.js`: subir VERSION (`afinador-v4`, `-v5`…) cada vez que cambie index.html o los assets, para refrescar las copias instaladas.
- Commits en español, modo imperativo. Cambios mayores por rama + PR (squash) a `main`; docs y detalles directos a `main`.
- `cristian/` es la copia personal del dueño: sus 8 afinaciones van precargadas en claro dentro de su index (mismo bloque `window.AFINADOR` que el repo privado `afinador-cristian`), sin candado ni clave; abre directo y carga `../app.js` de inmediato. La app de la raíz sigue partiendo vacía: no moverle esas precargadas. localStorage de esa carpeta: `afinador.cristian.afinaciones`, para lo que el dueño agregue.

## Qué se hizo recientemente (2026-10-24), fuera de Claude

La app la construyó originalmente Claude; estos cambios posteriores se hicieron con otro asistente. Los commits aparecen con el autor del dueño del repo. En orden:

- **PR #1 — PWA**: `manifest.webmanifest` + `sw.js` con precarga y modo offline; enlace compartible por afinación (`?a=<base64url>`); respaldo .json; `navigator.storage.persist()`.
- **PR #2 — la app pública parte vacía** (`afinaciones: []`): las 8 afinaciones personales del dueño salieron del index público para que terceros la abran sin verlas. Las de cada usuario viven en su propio localStorage. Las 8 originales quedaron respaldadas.
- **PR #3 y #4 — `cristian/`**: copia privada del dueño dentro de este repo, con sus afinaciones cifradas con clave (ver formato en "Reglas del repo"). Renombrada desde `m/` (la URL vieja ya no existe). En línea: https://cralvearm.github.io/afinador/cristian/
- **Respaldo maestro en claro**: repo privado `cralvearm/afinador-cristian`, con las 8 afinaciones sin cifrar y el procedimiento de recifrado (ver su propio CLAUDE.md).
- La clave de cifrado de esa versión ya no existe en el código (retirada el 2026-10-25); ninguna clave va jamás en este repo ni en ningún archivo.
- **2026-10-25 — se quitó la clave de `cristian/`** (a pedido del dueño): fuera el candado y el blob cifrado; ahora las 8 afinaciones van precargadas en claro y la página abre directo. `sw.js` subió a `afinador-v5`.

## Estructura

- `/` — afinador principal (guitarra)
- `bajo/` — afinador de bajo
- `cristian/` — afinador personal del dueño (8 afinaciones precargadas, sin clave)
- `app.js`, `app.css` — código compartido
- `sw.js`, `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png` — PWA
