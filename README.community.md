# Open Carrusel 2.0

Open Carrusel 2.0 es una app local-first para crear, editar, exportar, publicar y programar carruseles de Instagram con IA.

Está inspirada en el proyecto original [Open Carrusel](https://github.com/Hainrixz/open-carrusel) de Hainrixz, y esta versión comunitaria viene preparada para arrancar limpia, sin datos personales ni configuraciones privadas.

## Incluye

- generación de slides con IA
- editor con preview en vivo
- exportación de imágenes
- publicación en Instagram vía Make
- programación de posteos
- caption automático editable o regenerable
- templates
- branding
- filtros de dashboard y vista lista/tarjetas
- soporte Docker

## Quickstart

### Requisitos

- Node.js 20+
- npm
- opcional: Docker
- opcional: Claude Code CLI
- opcional: OpenAI API key
- opcional: Make + Instagram Business

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
2. Configurá lo que necesites
3. Ejecutá:

```bash
docker compose up -d --build open-carrusel
```

Abrí:

- [http://127.0.0.1:3002](http://127.0.0.1:3002)

## Guía completa

Ver:

- [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)

Incluye:

- setup local
- setup Docker
- Claude / Codex
- Make + Instagram
- scheduler local
- troubleshooting
- cómo compartir una copia limpia

## Notas

- `scripts/setup.mjs` crea los archivos base en `data/`
- `public/uploads/` guarda logos e imágenes de referencia
- `data/` guarda carousels, templates, exports e integraciones
- las publicaciones programadas requieren que la app siga corriendo

## Licencia

MIT
