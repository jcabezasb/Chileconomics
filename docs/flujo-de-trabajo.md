# Flujo de trabajo y CI/CD

## Las dos ramas importantes

- **`main`** es producción: lo que está en `main` es lo que se ve en chileconomics.cl.
- **Las demás ramas** son espacios de trabajo. Se puede romper cualquier cosa ahí sin afectar el sitio.

## El ciclo de un cambio

```bash
git switch main && git pull           # 1. partir de lo último (el robot sube datos a diario)
git switch -c mejora-algo             # 2. rama nueva para el cambio
npm run dev                           # 3. trabajar y probar en http://localhost:5173
npm run lint && npm test              # 4. revisar antes de subir
git add -A && git commit -m "..."     # 5. guardar el cambio
git push -u origin mejora-algo        # 6. subir la rama
```

Al subir la rama pasan dos cosas automáticamente:

1. **CI (GitHub Actions, `.github/workflows/ci.yml`)**: revisa el código con lint, corre las pruebas
   de frontend y de Python, y compila el sitio. El resultado aparece como ✓ o ✗ junto al commit en
   GitHub (pestaña *Actions*).
2. **Vista previa (Vercel)**: publica esa rama en una URL propia, distinta de chileconomics.cl.
   Solo la puede ver quien tenga sesión en la cuenta de Vercel. La URL aparece en GitHub junto al
   commit (el check "Vercel") y en el panel de Vercel.

Cuando el CI está en verde y la vista previa se ve bien:

```bash
git switch main && git pull
git merge --no-ff mejora-algo         # 7. llevar el cambio a producción
git push                              # 8. Vercel publica chileconomics.cl en ~1 minuto
```

(También se puede hacer con un *Pull Request* en GitHub: muestra el CI y la vista previa en una
sola página y tiene un botón para hacer el merge.)

## Qué es CI/CD

- **CI, integración continua**: cada cambio se revisa automáticamente apenas se sube. Si algo se rompe,
  se nota en minutos y en la rama, no en producción.
- **CD, despliegue continuo**: publicar no requiere pasos manuales. `main` siempre se publica en
  producción y cada rama tiene su vista previa.

En este proyecto:

| Qué | Dónde | Cuándo |
|---|---|---|
| Lint, pruebas y build | GitHub Actions (`ci.yml`) | Cada push a cualquier rama y cada Pull Request |
| Vista previa | Vercel | Cada push a una rama que no sea `main` |
| Producción | Vercel | Cada push a `main` |
| Datos (Banco Central, DIPRES, FMI, EE.UU.) | GitHub Actions (`data-sync.yml`) | Todos los días a las 00:00 UTC, al hacer merge a `main` y a mano (*Actions → Data Sync → Run workflow*) |

La sincronización de datos hace commit en `main` solo si los datos cambiaron, y ese commit dispara
la publicación. Las credenciales del Banco Central están como *secrets* del repositorio
(`BCCH_USER`, `BCCH_PASSWORD`).

## Agregar una serie nueva

1. Agregarla en `python/bcch_shared.py` (`NATIONAL_SERIES`, o la tabla `REGIONS` si es regional).
2. Agregar su clave en `src/data/bcch/seriesKeys.js` y usarla desde el componente.
3. Bajar los datos: `npm run sync-data` en local (con el entorno de Python activo), o hacer merge y
   esperar la sincronización automática.
4. `npm test` confirma que la clave existe en el JSON.

## Finanzas públicas (DIPRES)

La DIPRES publica el informe de ejecución del Gobierno Central unas tres o cuatro semanas después
de cada trimestre. La sincronización diaria busca el Excel "Informes de Ejecución Presupuestaria" más
reciente en https://www.dipres.gob.cl/598/w3-propertyvalue-15492.html y lo importa: reemplaza los
meses de ese año y deja los demás. Mientras no haya un informe nuevo, los datos quedan iguales.

El importador revisa que cada partida sea igual a la suma de sus componentes. Si la DIPRES cambia
el formato del Excel, termina con un error que dice qué fila no encontró o qué suma no cuadra, y no
toca el archivo de datos (en *Actions → Data Sync* el paso "Descargar finanzas públicas" queda con
aviso). En ese caso se puede importar a mano un archivo descargado, con el entorno de Python activo:
`npm run import-dipres -- ~/Descargas/archivo.xlsx` (se pueden pasar varios, por ejemplo para
corregir años anteriores).

## Si algo sale mal

- **CI en rojo**: abrir el run en *Actions* y ver qué paso falló; correr el mismo comando en local
  (`npm run lint`, `npm test`, `npm run build`).
- **Producción rota después de un merge**: en Vercel, *Deployments*, elegir la publicación anterior
  y usar *Promote to Production* (vuelve atrás en segundos). Después corregir con calma en una rama.
- **Los datos no se actualizan**: revisar el run de *Data Sync* en *Actions*. Si dice "Demasiadas
  series fallaron", la API del Banco Central o las credenciales tuvieron un problema; el sitio sigue
  mostrando los últimos datos buenos.
