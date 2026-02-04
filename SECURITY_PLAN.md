# Plan de Seguridad para Chileconomics (Sitio Publico)

Objetivo: evitar exposicion de credenciales, bloquear acceso a datos sensibles y mantener un sitio publico seguro con actualizacion diaria.

## Resumen de decision
- El sitio usara solo el archivo publico `public/data/bcch_series.json`.
- Las APIs que consultan al Banco Central no se usaran en el frontend.
- La actualizacion sera 1 vez al dia via GitHub Actions.

## Acciones prioritarias
1) Desactivar consumo de APIs en el frontend
   - El frontend solo debe leer `public/data/bcch_series.json`.
   - Eliminar o deshabilitar el fallback a `/api/bcch-bundle` y `/api/bcch-series`.

2) Bloquear APIs en produccion
   - Quitar el cron de Vercel que llama `/api/bcch-bundle`.
   - Opcion preferida: responder error en produccion si no existe un header secreto.

3) Actualizacion diaria segura
   - Mantener GitHub Actions con cron diario.
   - Usar solo secretos `BCCH_USER` y `BCCH_PASSWORD` en GitHub Secrets.

4) Higiene de credenciales
   - Rotar credenciales BCCH actuales.
   - Mantener `.env` y `.env.local` solo en local y fuera de git.
   - Crear un `.env.example` sin datos reales si se necesita para onboarding.

5) Endurecimiento de seguridad en despliegue
   - Agregar headers en `vercel.json` (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).

## Verificaciones rapidas
- Confirmar que no hay secretos en el repo ni en el historial.
- Confirmar que el sitio en produccion no puede acceder a las APIs.
- Confirmar que el JSON publico se actualiza 1 vez al dia.

## Notas
- `public/data/bcch_series.json` contiene datos publicos del BCCH y es seguro exponerlo.
- Cualquier acceso a la API del BCCH debe ocurrir solo en GitHub Actions o en un entorno privado.
