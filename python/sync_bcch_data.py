import json
import os
from datetime import datetime
from dotenv import load_dotenv
import bcchapi

from bcch_shared import SERIES_CONFIG_SYNC, normalize_dataframe

# Cargar variables de entorno (BCCH_USER, BCCH_PASSWORD)
load_dotenv()

SERIES_CONFIG = SERIES_CONFIG_SYNC

OUTPUT_DIR = "public/data"

def fetch_series(siete, series_id):
    """Obtiene una serie del BC y la normaliza."""
    df = siete.cuadro(series=[series_id], nombres=["value"])

    if df is None or df.empty:
        return []

    records = normalize_dataframe(df)
    records = [record for record in records if record.get("date")]
    start_index = next(
        (i for i, record in enumerate(records) if record.get("value") is not None),
        None,
    )
    if start_index is None:
        return []

    return records[start_index:]

def sync_data():
    """Descarga todas las series configuradas y las guarda en un JSON."""
    user = os.getenv("BCCH_USER")
    password = os.getenv("BCCH_PASSWORD")
    
    if not user or not password:
        print("Error: No se configuraron las credenciales BCCH_USER y BCCH_PASSWORD")
        return

    siete = bcchapi.Siete(user, password)
    all_data = {
        "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "series": {}
    }

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for key, config in SERIES_CONFIG.items():
        print(f"Obteniendo serie: {config['name']} ({config['id']})")
        try:
            records = fetch_series(siete, config["id"])
            latest = next((record for record in reversed(records) if record.get("value") is not None), None)
            all_data["series"][key] = {
                "data": records,
                "latest": latest
            }
            start_date = records[0]["date"] if records else "N/A"
            start_value = records[0]["value"] if records else "N/A"
            end_date = records[-1]["date"] if records else "N/A"
            end_value = records[-1]["value"] if records else "N/A"
            print(
                f"   OK: {len(records)} registros. Inicio: {start_date} = {start_value}. Ultimo: {end_date} = {end_value}"
            )
        except Exception as e:
            print(f"   ERROR: {str(e)}")

    output_path = os.path.join(OUTPUT_DIR, "bcch_series.json")
    pretty_json = os.getenv("BCCH_PRETTY_JSON", "").lower() in {"1", "true", "yes"}

    with open(output_path, "w", encoding="utf-8") as f:
        if pretty_json:
            json.dump(all_data, f, indent=2, ensure_ascii=False)
        else:
            json.dump(all_data, f, ensure_ascii=False, separators=(",", ":"))
    
    print(f"\nOK: Datos guardados en: {output_path}")
    print(f"Ultima actualizacion: {all_data['last_update']}")
    print("Data sincronizada con exito")

if __name__ == "__main__":
    sync_data()
