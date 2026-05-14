# Open Carrusel 2.0

Open Carrusel 2.0 es una app local-first para crear, editar, exportar, publicar y programar carruseles de Instagram con IA.

Esta versión está inspirada en el proyecto original [Open Carrusel](https://github.com/Hainrixz/open-carrusel) de Hainrixz, y extiende el flujo con publicación vía Make, programación local de posteos, caption automático, mejoras de dashboard y una estructura más lista para compartir con la comunidad.

## Qué hace

- Genera carruseles con IA desde un chat integrado.
- Permite editar slides, reordenarlos, duplicarlos y usar referencias visuales.
- Exporta imágenes listas para Instagram.
- Publica en Instagram mediante un webhook conectado a Make.
- Programa publicaciones para más tarde.
- Genera caption automáticamente y permite editarlo o regenerarlo.
- Organiza tus carruseles con filtros por estado y vista en tarjetas o lista.
- Guarda todo localmente en JSON, uploads y exports.

## Funciones principales

### Editor

- Preview en vivo del carrusel
- Filmstrip para navegar slides
- Safe zones para revisar composición
- Referencias visuales con miniaturas
- Undo por slide

### Publicación

- Botón `Publicar IG`
- Botón `Programar`
- Re-exportación automática solo si cambió el contenido visual
- Detección de carruseles ya publicados
- Pestaña `Posted` con historial de publicación

### Dashboard

- `My Carousels`
- `Templates`
- `Posted`
- Filtros por estado
- Vista `Tarjetas` y vista `Lista`

## Quickstart

### Requisitos

- Node.js 20 o superior
- npm
- Opcional: Docker Desktop
- Opcional: Claude Code CLI
- Opcional: OpenAI API key si querés usar Codex
- Opcional: Make + Instagram Business para publicar

### Instalación local

```bash
npm install
npm run setup
npm run dev
```

Abrí:

- [http://localhost:3000](http://localhost:3000)

### Instalación con Docker

1. Copiá `.env.example` a `.env`
2. Completá las variables que necesites
3. Ejecutá:

```bash
docker compose up -d --build open-carrusel
```

Abrí:

- [http://127.0.0.1:3002](http://127.0.0.1:3002)

## Configuración básica

### Marca

Configurá:

- nombre de marca
- colores
- tipografías
- logo opcional
- style keywords

### IA

Podés usar:

- Claude Code CLI
- Codex / OpenAI API

### Integraciones

Para publicar en Instagram configurá:

- `MAKE_INSTAGRAM_WEBHOOK`
- `IG_USER_ID`

Esto se puede cargar desde la UI o desde `.env` como fallback en Docker.

## Publicar y programar

### Publicar ahora

El flujo actual:

1. Revisa si el carrusel necesita re-exportarse.
2. Si cambió visualmente, reexporta automáticamente.
3. Si falta caption, lo genera automáticamente.
4. Sube las imágenes y envía el payload al webhook de Make.
5. Guarda fecha de publicación y, si Make lo devuelve, link o ID del post.

### Programar

Podés programar un carrusel para más tarde desde el botón `Programar`.

Importante:

- el scheduler actual es local
- la PC y la app tienen que estar encendidas
- si el servidor está apagado, no se dispara el webhook

## Estructura útil del proyecto

- `src/app/`: rutas y pantallas
- `src/components/`: UI
- `src/application/`: casos de uso
- `src/contracts/`: validación y contratos
- `src/infrastructure/`: integración con chat, export, publish
- `src/lib/repositories/`: persistencia local
- `data/`: carousels, templates, brand, integrations, exports
- `public/uploads/`: logos y referencias

## Documentación

Guía más completa:

- [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)

Ahí está explicado:

- setup local
- setup Docker
- Claude / Codex
- branding
- publicación con Make
- scheduling
- troubleshooting
- cómo generar una copia limpia para compartir

## Créditos

Inspirado en el proyecto original [Open Carrusel](https://github.com/Hainrixz/open-carrusel) creado por Hainrixz.

## Licencia

MIT
