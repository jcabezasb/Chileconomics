"""
Script para sincronizar datos del Banco Central de Chile.
Genera archivos JSON que el frontend puede consumir directamente.

Uso: python sync_bcch_data.py
"""
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

import bcchapi

# Configuración de series a sincronizar
SERIES_CONFIG = {
    "pib_real": {
        "id": "F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T",
        "name": "PIB Real Nacional",
        "frequency": "T",
        "desde": "2015-01-01"
    },
    "ipc": {
        "id": "F074.IPC.VAR.Z.Z.C.M",
        "name": "IPC (Var. Mensual)",
        "frequency": "M",
        "desde": "2023-01-01"
    },
    "dolar": {
        "id": "F073.TCO.PRE.Z.D",
        "name": "Dólar Observado",
        "frequency": "D",
        "desde": "2024-01-01"
    },
    # PIB Regional Real
    "pib_reg_XV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.15.0.T", "name": "PIB Arica y Parinacota", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_I": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.01.0.T", "name": "PIB Tarapacá", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_II": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.02.0.T", "name": "PIB Antofagasta", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_III": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.03.0.T", "name": "PIB Atacama", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_IV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.04.0.T", "name": "PIB Coquimbo", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_V": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.05.0.T", "name": "PIB Valparaíso", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_RM": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.13.0.T", "name": "PIB Metropolitana", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_VI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.06.0.T", "name": "PIB O'Higgins", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_VII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.07.0.T", "name": "PIB Maule", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_XVI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.16.0.T", "name": "PIB Ñuble", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_VIII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.08.0.T", "name": "PIB Biobío", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_IX": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.09.0.T", "name": "PIB La Araucanía", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_XIV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.14.0.T", "name": "PIB Los Ríos", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_X": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.10.0.T", "name": "PIB Los Lagos", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_XI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.11.0.T", "name": "PIB Aysén", "frequency": "T", "desde": "2018-01-01"},
    "pib_reg_XII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T", "name": "PIB Magallanes", "frequency": "T", "desde": "2018-01-01"}
}

OUTPUT_DIR = "public/data"


def fetch_series(siete, series_id, desde=None):
    """Obtiene una serie del BC y la normaliza."""
    kwargs = {}
    if desde:
        kwargs["desde"] = desde
    
    df = siete.cuadro(series=[series_id], nombres=["value"], **kwargs)
    
    if df is None or df.empty:
        return []
    
    df = df.reset_index()
    records = []
    
    for _, row in df.iterrows():
        date = row.get("index") or row.get("fecha") or row.get("date")
        value = row.get("value")
        
        if date is not None and hasattr(date, "strftime"):
            date = date.strftime("%Y-%m-%d")
        
        try:
            value = float(value)
        except (TypeError, ValueError):
            value = None
        
        records.append({"date": date, "value": value})
    
    return records


def main():
    user = os.environ.get("BCCH_USER")
    password = os.environ.get("BCCH_PASSWORD")
    
    if not user or not password:
        print("❌ Error: No se encontraron las credenciales BCCH_USER o BCCH_PASSWORD")
        return
    
    print("🔗 Conectando a la API del Banco Central...")
    siete = bcchapi.Siete(user, password)
    
    # Crear directorio de salida
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    all_data = {}
    
    for key, config in SERIES_CONFIG.items():
        print(f"📊 Obteniendo serie: {config['name']} ({config['id']})")
        
        try:
            records = fetch_series(siete, config["id"], config.get("desde"))
            
            # Filtrar valores nulos
            valid_records = [r for r in records if r["value"] is not None]
            
            if valid_records:
                latest = valid_records[-1]
                previous = valid_records[-2] if len(valid_records) > 1 else None
                
                variation = None
                if previous and previous["value"] != 0:
                    variation = ((latest["value"] - previous["value"]) / previous["value"]) * 100
                
                all_data[key] = {
                    "id": config["id"],
                    "name": config["name"],
                    "data": valid_records,
                    "latest": latest,
                    "variation": variation,
                    "updated_at": datetime.now().isoformat()
                }
                
                print(f"   ✅ {len(valid_records)} registros. Último: {latest['date']} = {latest['value']:,.2f}")
            else:
                print(f"   ⚠️ Sin datos válidos")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Guardar archivo combinado
    output_path = os.path.join(OUTPUT_DIR, "bcch_series.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Datos guardados en: {output_path}")
    print(f"📅 Última actualización: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
