"""Descarga las series de SERIES_CONFIG desde la API del Banco Central y genera
public/data/bcch_series.json, el único archivo de datos que lee el sitio.

Uso: npm run sync-data  (requiere BCCH_USER y BCCH_PASSWORD en .env)

Si una serie falla, se conserva la versión anterior del JSON en vez de borrarla. Si fallan
demasiadas (problema de la API o de credenciales) no se escribe nada y el script termina con
error, para que el sitio siga mostrando los últimos datos buenos.
"""

import json
import os
import sys
import time
from datetime import datetime

import bcchapi
from dotenv import load_dotenv

from bcch_shared import SERIES_CONFIG, normalize_dataframe

OUTPUT_PATH = os.path.join("public", "data", "bcch_series.json")
MAX_FAILURE_SHARE = 0.2  # sobre esto se aborta sin escribir
RETRIES = 2
DECIMALS = 6  # más que suficiente para cualquier serie; reduce el tamaño del archivo


def fetch_series(siete, series_id):
    """Serie del BDE como [{"date", "value"}], desde el primer valor no nulo."""
    df = siete.cuadro(series=[series_id], nombres=["value"])
    if df is None or df.empty:
        return []

    records = [record for record in normalize_dataframe(df) if record.get("date")]
    first_valid = next((i for i, record in enumerate(records) if record["value"] is not None), None)
    if first_valid is None:
        return []
    return [
        {"date": record["date"], "value": None if record["value"] is None else round(record["value"], DECIMALS)}
        for record in records[first_valid:]
    ]


def fetch_with_retry(siete, series_id):
    for attempt in range(RETRIES + 1):
        try:
            return fetch_series(siete, series_id)
        except Exception as error:  # bcchapi no expone tipos de error propios
            if attempt == RETRIES:
                raise
            print(f"   reintento {attempt + 1} ({error})")
            time.sleep(2 * (attempt + 1))
    return []


def load_previous():
    if not os.path.exists(OUTPUT_PATH):
        return {}
    with open(OUTPUT_PATH, encoding="utf-8") as file:
        series = json.load(file).get("series", {})
    return {key: entry.get("data", []) if isinstance(entry, dict) else entry for key, entry in series.items()}


def write_atomic(payload):
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    temporary = f"{OUTPUT_PATH}.tmp"
    with open(temporary, "w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporary, OUTPUT_PATH)


def sync_data():
    load_dotenv()
    user = os.getenv("BCCH_USER")
    password = os.getenv("BCCH_PASSWORD")
    if not user or not password:
        print("Error: faltan BCCH_USER y BCCH_PASSWORD (archivo .env o secretos de GitHub).")
        return 1

    siete = bcchapi.Siete(user, password)
    previous = load_previous()
    series = {}
    kept, missing = [], []

    for key, config in SERIES_CONFIG.items():
        print(f"{key}: {config['name']} ({config['id']})")
        try:
            records = fetch_with_retry(siete, config["id"])
        except Exception as error:
            print(f"   ERROR: {error}")
            records = []

        if records:
            series[key] = {"data": records}
            print(f"   OK: {len(records)} registros, {records[0]['date']} -> {records[-1]['date']}")
        elif previous.get(key):
            series[key] = {"data": previous[key]}
            kept.append(key)
            print("   sin datos nuevos: se conserva la versión anterior")
        else:
            missing.append(key)
            print("   sin datos (serie nueva o código inválido)")

    failures = len(kept) + len(missing)
    print(f"\nResumen: {len(SERIES_CONFIG) - failures} actualizadas, {len(kept)} conservadas, {len(missing)} sin datos.")
    if missing:
        print("Sin datos:", ", ".join(missing))

    previously_available = [key for key in SERIES_CONFIG if previous.get(key)]
    if previously_available and len(kept) / len(previously_available) > MAX_FAILURE_SHARE:
        print("Demasiadas series fallaron: no se escribe el archivo para no publicar datos incompletos.")
        return 1

    write_atomic({"last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "series": series})
    print(f"Datos guardados en {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(sync_data())
