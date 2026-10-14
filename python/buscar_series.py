"""Busca series en el catálogo de la API del Banco Central (BDE) por palabras del título.

Uso: python python/buscar_series.py inversion directa
     python python/buscar_series.py canada --frecuencia ANNUAL

Muestra el código, la frecuencia, el período y el título de cada serie cuyo título (en español
o en inglés) contiene todas las palabras buscadas, sin importar tildes ni mayúsculas.
Requiere BCCH_USER y BCCH_PASSWORD en .env (o como variables de entorno).
"""

import argparse
import os
import sys
import unicodedata

import requests
from dotenv import load_dotenv

API_URL = "https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx"
FRECUENCIAS = ["DAILY", "MONTHLY", "QUARTERLY", "ANNUAL"]


def normalizar(texto):
    """Minúsculas y sin tildes, para comparar 'Inversión' con 'inversion'."""
    sin_tildes = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in sin_tildes if not unicodedata.combining(c)).lower()


def coincide(serie, palabras):
    titulo = normalizar(f"{serie.get('spanishTitle', '')} {serie.get('englishTitle', '')}")
    return all(normalizar(palabra) in titulo for palabra in palabras)


def descargar_catalogo(usuario, clave, frecuencia):
    params = {"user": usuario, "pass": clave, "frequency": frecuencia, "function": "SearchSeries"}
    respuesta = requests.get(API_URL, params=params, timeout=120)
    respuesta.raise_for_status()
    datos = respuesta.json()
    if datos.get("Codigo") != 0:
        raise RuntimeError(f"La API respondió: {datos.get('Descripcion')}")
    return datos.get("SeriesInfos") or []


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("palabras", nargs="+", help="palabras que deben aparecer en el título")
    parser.add_argument("--frecuencia", choices=FRECUENCIAS, help="buscar solo en una frecuencia")
    args = parser.parse_args()

    load_dotenv()
    usuario, clave = os.getenv("BCCH_USER"), os.getenv("BCCH_PASSWORD")
    if not usuario or not clave:
        sys.exit("Faltan BCCH_USER y BCCH_PASSWORD (en .env o como variables de entorno).")

    total = 0
    for frecuencia in [args.frecuencia] if args.frecuencia else FRECUENCIAS:
        encontradas = [s for s in descargar_catalogo(usuario, clave, frecuencia) if coincide(s, args.palabras)]
        total += len(encontradas)
        for serie in encontradas:
            periodo = f"{serie.get('firstObservation', '?')} a {serie.get('lastObservation', '?')}"
            print(f"{serie['seriesId']}\t{frecuencia}\t{periodo}\t{serie.get('spanishTitle', '')}")
    print(f"-- {total} series con: {' '.join(args.palabras)}")


if __name__ == "__main__":
    main()
