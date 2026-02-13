---
description: Revisa y mejora el código automáticamente tras un push.
---

# Workflow: Revisión Post-Push

Este flujo se activa automáticamente (o manualmente) para validar los últimos cambios realizados en el repositorio.

## Pasos

### 1. Identificación de Cambios
// turbo
El agente debe identificar qué archivos han cambiado en el último commit o durante la sesión actual de trabajo. Usa comandos de git como:
`git diff --name-only HEAD~1 HEAD`

### 2. Análisis Experto
Para cada archivo modificado:
1. Leer el contenido actual.
2. Comparar con los estándares definidos en la skill `expert-developer`.
3. Buscar vulnerabilidades, cuellos de botella de rendimiento o falta de alineación estética.

### 3. Aplicación de Mejoras
// turbo
Si el agente detecta una mejora evidente (ej. una función que puede ser más corta, una variable mal nombrada, un import innecesario):
1. Aplicar el cambio directamente en el archivo.
2. Notificar al usuario mediante un comentario sobre el cambio realizado y su justificación técnica.

### 4. Reporte Final
Generar un breve resumen de los archivos revisados y las mejoras aplicadas.
