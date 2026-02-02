# Dashboard Macroeconómico de Chile

## 📊 Descripción del Proyecto
Este proyecto consiste en el desarrollo de un **Dashboard Macroeconómico de Chile**, publicado como sitio web (one-pager/scrollytelling) con actualización automática de datos oficiales. 

**Objetivo:** Ofrecer una visión clara, estructurada y jerárquica del estado de la economía chilena, similar a informes del Banco Central, Ministerio de Hacienda o research económico.

## 🎯 Objetivos Principales
- **Entender rápidamente** el estado de la economía.
- **Profundizar progresivamente** por dimensiones (PIB, Laboral, Precios, Externo).
- **Responsive:** Funcionalidad óptima en desktop y móvil.
- **Automatización:** Datos actualizados automáticamente sin intervención manual.

## 🧭 Enfoque Conceptual: Scrollytelling
Navegación vertical donde cada sección narra un aspecto macroeconómico:
1.  **Vistazo General (Overview):** Semáforo económico, mapa interactivo y métricas clave.
2.  **Descomposición del PIB:** Orden de magnitud y componentes de oferta/demanda.
3.  **Mercado Laboral:** Desempleo, participación y creación de empleo.
4.  **Precios y Tasas:** Inflación (IPC), TPM y expectativas.
5.  **Sector externo:** Balanza comercial, Cobre y Tipo de Cambio.

## 🧱 Arquitectura Técnica

### Frontend
- **Framework:** React + Vite
- **Estilos:** CSS Modules / Tailwind (según definición)
- **Visualización:** Gráficos (Recharts/Victory) y Mapas interactivos.

### Backend (BFF - Backend for Frontend)
- **Plataforma:** Vercel Serverless Functions
- **Rol:** Proxy seguro entre Frontend y API Banco Central.
- **Funciones:** Ocultar API Keys, cacheo de respuestas, normalización de datos.

### Datos
- **Fuente:** API Banco Central de Chile.
- **Actualización:** Estrategia de Cache + Cron Jobs para mantener datos "calientes" (hot data).

## 🚀 Instalación y Ejecución

```bash
# 1. Instalar dependencias de Frontend y Backend
npm install
pip install -r requirements.txt

# 2. Configurar credenciales
# Crea un archivo .env con:
# BCCH_USER=tu_usuario
# BCCH_PASSWORD=tu_password

# 3. Sincronizar datos por primera vez (descarga series del Banco Central)
npm run sync-data

# 4. Servidor de desarrollo
npm run dev
```

## 🛠 Estado Actual y Próximos Pasos

El dashboard ya se encuentra conectado a la API oficial del Banco Central de Chile:
- **Datos Reales**: PIB (Nacional y de las 16 regiones), IPC y Dólar.
- **Visualización**: Minigráficos (sparklines) y variaciones porcentuales automáticas basadas en historia real.
- **Mapeo Regional**: Interacción con el mapa completamente vinculada a series oficiales.

**Próximos Pasos:**
- Integrar series regionales adicionales (Desempleo, Ocupación, etc.) donde la fuente oficial esté disponible.
- Refinar la visualización de los gráficos de tendencia detallados.
- Implementar el BFF final en Vercel para ocultar credenciales en producción.


## 📄 Licencia
[Definir Licencia]
