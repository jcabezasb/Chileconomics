# Chileconomics

Dashboard macroeconómico de Chile con datos oficiales del Banco Central: actividad (IMACEC),
precios (IPC), tipo de cambio, cobre, empleo, composición del PIB y análisis regional.

Sitio: https://chileconomics.cl

## Cómo funciona (en una frase)

Un script de Python descarga todos los días las series del Banco Central y las guarda en
`public/data/bcch_series.json`; el sitio (React) lee ese archivo y dibuja todo en el navegador.
No hay servidor ni base de datos.

## Instalación

Requisitos: Node 22 (ver `.nvmrc`) y Python 3.10 o superior.

```bash
npm install
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env   # y completar BCCH_USER / BCCH_PASSWORD
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Sitio local en http://localhost:5173 (se actualiza al guardar) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Revisa el código (estilo y errores comunes) |
| `npm test` | Pruebas del frontend (Vitest) |
| `npm run sync-data` | Descarga las series del Banco Central (requiere `.env` y el entorno de Python activo) |
| `.venv/bin/python -m pytest python/tests` | Pruebas de Python |

## Estructura

```
src/
  app/          Shell del sitio: rutas, tema, navegación
  data/bcch/    Carga del JSON y cálculo de indicadores
  features/     Una carpeta por sección (overview, regional, pib, blog, ...)
  shared/       Componentes y funciones reutilizables
  styles/       CSS por sección (global.css los importa en orden)
python/         Configuración de series y sincronización con el Banco Central
public/data/    bcch_series.json (generado automáticamente, no editar a mano)
docs/           Arquitectura y flujo de trabajo
```

## Documentación

- [docs/arquitectura.md](docs/arquitectura.md): cómo está armado el código y por qué.
- [docs/flujo-de-trabajo.md](docs/flujo-de-trabajo.md): ramas, CI/CD, vistas previas y cómo publicar.
