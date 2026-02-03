# 🎓 Chileconomics: Guía de Profundización Teórica

Este documento es tu mapa para entender el 100% de cómo funciona este repositorio. No te preocupes por el código técnico; aquí explicamos la **lógica** detrás de cada pieza.

---

## 🗺️ Nivel 1: El Cerebro de Datos (Python + API)
**Objetivo**: Entender cómo los números pasan del Banco Central a tu computadora.

- [ ] **Misión: Los Códigos Maestros**
    - Estudia `sync_bcch_data.py`. Fíjate en la lista `SERIES_CONFIG`. 
    - *Pregunta para investigar*: ¿Qué pasa si quiero agregar el precio de la gasolina? ¿Dónde buscarías el ID?
- [ ] **Misión: El Traductor (Pandas)**
    - Entiende por qué usamos `df = df.reset_index()` y cómo Python limpia los datos para que no haya errores si el Banco Central envía un dato vacío.
- [ ] **Misión: El Robot (GitHub Actions)**
    - Abre `.github/workflows/hourly_sync.yml`. 
    - *Concepto clave*: ¿Cómo sabe GitHub tu contraseña del Banco Central sin que esté escrita en el código? (Pista: Busca la palabra `secrets`).

---

## 🎨 Nivel 2: La Fábrica Visual (React + Estética)
**Objetivo**: Entender cómo se dibujan los gráficos y por qué el sitio es rápido.

- [ ] **Misión: Las Piezas de LEGO (Componentes)**
    - Explora `src/components/Overview/`. 
    - Compara `CompactIndicator.jsx` con `MacroCard.jsx`. ¿Por qué uno es una grilla y el otro usa "columnas" distintas?
- [ ] **Misión: Matemáticas Visuales (SVG)**
    - Mira el código de `MiniSparkline` dentro de `CompactIndicator.jsx`. 
    - Intenta entender cómo una lista de números se convierte en una línea curva usando solo coordenadas X e Y.
- [ ] **Misión: El Estilo Neón (CSS)**
    - Abre `src/styles/global.css`. 
    - Busca las "Variables" (esos nombres que empiezan con `--`). Cambiar un color ahí cambia TODO el sitio.

---

## 🚀 Nivel 3: El Despliegue (Vercel + Git)
**Objetivo**: Entender cómo tu código llega a internet.

- [ ] **Misión: Ramas y Merges**
    - Acabamos de unir (`merge`) una rama con otra. 
    - *Reto*: ¿Por qué es mejor trabajar en una "rama nueva" antes de pasar las cosas a la "principal"?
- [ ] **Misión: Vercel**
    - Revisa `vercel.json`. Este archivo le dice a internet: "Oye, trata a la carpeta `/api` de una forma especial para que Python pueda correr ahí".

---

> [!TIP]
> **¿Por dónde quieres empezar?** Elige una misión y pregúntame: *"Explícame la Misión de [Nombre]"* y profundizaremos hasta que lo entiendas a la perfección.
