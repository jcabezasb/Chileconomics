# Guía de Contexto del Proyecto: Chileconomics

Este documento está diseñado para proporcionar a cualquier IA o desarrollador futuro el contexto necesario para continuar trabajando en este dashboard económico sin pérdida de conocimiento.

## 📌 Resumen del Proyecto
**Chileconomics** es un dashboard macroeconómico de alto impacto visual centrado en la economía chilena. El objetivo es ofrecer una lectura rápida, técnica y estética del pulso del país, combinando datos nacionales con un desglose regional profundo.

## 🛠️ Stack Tecnológico
- **Frontend**: React (Vite) + CSS puro (variables para temas).
- **Visualización**: Recharts (Customizado para estética premium).
- **Datos**: 
  - **BCCH API**: Conexión mediante Python (`sync_bcch_data.py`) que descarga series en `public/data/bcch_series.json`.
  - **Fallback**: Mocks realistas para desarrollo offline.

## 📊 Estructura de Datos Crítica
- **PIB Nacional**: Serie `F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T`.
- **Dólar**: Serie `F073.TCO.PRE.Z.D`.
- **IPC**: Serie `F074.IPC.VAR.Z.Z.C.M`.
- **Componentes PIB**: Actualmente se calculan mediante pesos históricos (Consumo ~62%, Inversión ~22%, etc.) aplicados al PIB Real total.

## 🏗️ Estado Actual y Enfoque (Febrero 2026)
Estamos en una fase de **Rediseño Estructural**:
- **Visión General**: Priorizamos la composición del PIB (Oferta/Demanda) sobre la ubicación geográfica en el primer impacto.
- **Gráfico PIB**: Comparativa "PIB Total" vs "Componentes" con **Importaciones representadas en el eje negativo**.
- **Análisis Regional**: El mapa interactivo se movió a una sección inferior para un análisis más pausado, mostrando el "Peso Nacional (%)" de cada región.

## 🧩 Cambios Recientes
- **Gráfico PIB**: Importaciones en negativo con stack por signo; paleta neón fría aplicada.
- **Tooltip PIB**: Título "Composicion" y valores con 1 decimal.
- **Tabla componentes**: Layout en grilla, columnas alineadas y separadores verticales; encabezados abreviados (VALOR, %PIB, TREND, VAR.%).

## 🚀 Hoja de Ruta (Futuro)
1.  **Conexión Real de Componentes**: Mapear series específicas del BCCH para Consumo, Inversión y Gasto para eliminar los cálculos por pesos fijos.
2.  **Mercado Laboral**: Implementar una sección de empleo con datos del INE (Desempleo regional).
3.  **Comparativo Histórico**: Permitir ver la evolución de la estructura del PIB a través de los años (Cómo ha cambiado el peso de la inversión vs consumo).
4.  **Exportaciones**: Detallar por rubro (Cobre, Litio, Agricultura) de forma interactiva.

## 🧠 Guía para la IA Siguiente
- **Estética**: Mantener el estilo "Glassmorphism" y modo oscuro. Usar paletas de colores sobrias (#6366f1, #10b981, #f43f5e).
- **Precisión**: Siempre validar las transformaciones de datos YoY (Year-over-Year) para evitar ruido estacional.
- **Estructura**: `App.jsx` centraliza la lógica de estado; los componentes en `src/components/` deben ser atómicos.
