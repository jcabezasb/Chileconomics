# Contexto del Proyecto: Chileconomics

**Para el Agente AI (y desarrolladores):**
Este archivo sirve para mantener el contexto del proyecto al cambiar de entorno de desarrollo. Lee esto para "ponerte al día" rápidamente.

## 🎯 Objetivo General
Construir un dashboard macroeconómico de Chile tipo "Scrollytelling".
- **Estilo:** Informe económico premium, sobrio, alta jerarquía visual.
- **Formato:** Single-page web con navegación vertical.
- **Usuario:** Analistas, economistas, público general interesado.

## 🛠 Stack Tecnológico
- **Frontend:** React + Vite.
- **Estilos:** Vanilla CSS con variables CSS (Diseño System personalizado, sin Tailwind salvo solicitud explícita).
- **Mapa:** `react-simple-maps` + TopoJSON de Chile.
- **Iconos:** `lucide-react`.
- **Datos:** API Banco Central de Chile (actualmente usando Mocks en `src/services/api.js`).
- **Backend (Futuro):** Vercel Serverless Functions para proxy/caché.

## ✅ Estado Actual
### Progress
- [x] Initial React + Vite scaffolding.
- [x] Interactive TopoJSON Map of Chile (Local asset).
- [x] Key Macro Indicators grid with Sparkline charts.
- [x] Responsive layout with synchronized component heights.
- [x] Mock API service with time-series data.
- [x] Dark mode design system (Neon accents).
- [x] **Inicialización:** Proyecto Vite creado y configurado.
- [x] **Diseño:** Sistema de variables CSS (Slate/Blue palette) creado.
- [x] **Componente Mapa:** Implementado `MacroMap.jsx` con interactividad básica (selección de regiones).
- [x] **Layout Principal:** Grilla "Overview" implementada (Mapa a la izquierda/arriba, Tarjetas a la derecha/abajo).
- [x] **Mock Data:** Servicio `api.js` creado con datos ficticios de IMACEC, IPC, Dólar, etc.

## 📋 Próximos Pasos (To-Do List)
1.  **Visualización de Datos (Priority):**
    - Implementar gráficos de línea (Sparklines o gráficos detallados) para Inflación y Cobre usando `recharts`.
    - Integrar estos gráficos en la sección de Overview o en secciones detalladas.

2.  **Detalle Regional:**
    - Hacer que al hacer clic en una región del mapa, se actualicen o muestren datos específicos de esa región (actualmente solo hace `console.log`).

3.  **Backend & API Real:**
    - Configurar Vercel Serverless Functions.
    - Conectar a la API real del Banco Central (User tiene credenciales).
    - Reemplazar Mocks con datos reales.

4.  **Secciones Scrollytelling:**
    - Desarrollar sección "Descomposición del PIB".
    - Desarrollar sección "Mercado Laboral".

## 📝 Instrucción para retomar
Si eres el agente retomando este trabajo:
1.  Analiza `src/App.jsx` para ver la estructura actual.
2.  Revisa `src/services/api.js` para entender la estructura de datos.
3.  Continúa con la implementación de **Gráficos** (Task 1).
