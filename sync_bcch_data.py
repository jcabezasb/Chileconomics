import json
import os
from datetime import datetime
from dotenv import load_dotenv
import bcchapi

# Cargar variables de entorno (BCCH_USER, BCCH_PASSWORD)
load_dotenv()

SERIES_CONFIG = {
    "pib_total": {"id": "F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T", "name": "PIB Nominal", "frequency": "T", "desde": "2018-01-01"},
    "pib_real": {"id": "F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T", "name": "PIB Real Nacional", "frequency": "T", "desde": "2018-01-01"},
    "consumo_privado": {"id": "F033.CPR.FLU.N.CLP.EP18.0.T", "name": "Consumo Privado", "frequency": "T", "desde": "2018-01-01"},
    "gasto_gob_nominal": {"id": "F033.COG.FLU.N.CLP.EP18.0.T", "name": "Gasto de Gobierno", "frequency": "T", "desde": "2018-01-01"},
    "inversion": {"id": "F033.FKF.FLU.N.CLP.EP18.0.T", "name": "Inversión (FBKF)", "frequency": "T", "desde": "2018-01-01"},
    "existencias": {"id": "F033.VAX.FLU.N.CLP.EP18.0.T", "name": "Variación Existencias", "frequency": "T", "desde": "2018-01-01"},
    "exportaciones": {"id": "F033.XBS.FLU.N.CLP.EP18.0.T", "name": "Exportaciones", "frequency": "T", "desde": "2018-01-01"},
    "importaciones": {"id": "F033.IBS.FLU.N.CLP.EP18.0.T", "name": "Importaciones", "frequency": "T", "desde": "2018-01-01"},
    "ipc_index": {"id": "F074.IPC.IND.Z.EP23.C.M", "name": "IPC Indice", "frequency": "M", "desde": "1996-01-01"},
    "dolar": {"id": "F073.TCO.PRE.Z.D", "name": "Dolar Observado", "frequency": "D", "desde": "1996-01-01"},
    "cobre": {"id": "F019.PPB.PRE.100.D", "name": "Precio del Cobre", "frequency": "D", "desde": "1996-01-01"},
    "desempleo": {"id": "F049.DES.TAS.INE9.10.M", "name": "Desempleo", "frequency": "M", "desde": "1996-01-01"},
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
    "pib_reg_XII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T", "name": "PIB Magallanes", "frequency": "T", "desde": "2018-01-01"},
    # Población Nacional
    "pob_total": {"id": "F049.POB.STO.INE1.01.A", "name": "Población total nacional", "frequency": "A", "desde": "2010-01-01"},
    "pob_mujeres": {"id": "F049.POB.STO.INE1.03.A", "name": "Población mujeres nacional", "frequency": "A", "desde": "2010-01-01"},
    "pob_hombres": {"id": "F049.POB.STO.INE1.02.A", "name": "Población hombres nacional", "frequency": "A", "desde": "2010-01-01"},
    # Población Regional - Total
    "pob_reg_XV": {"id": "F049.POBAP.STO.INE.AT.A", "name": "Población Arica y Parinacota", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_I": {"id": "F049.POBTA.STO.INE.AT.A", "name": "Población Tarapacá", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_II": {"id": "F049.POBAN.STO.INE.AT.A", "name": "Población Antofagasta", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_III": {"id": "F049.POBAT.STO.INE.AT.A", "name": "Población Atacama", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IV": {"id": "F049.POBCO.STO.INE.AT.A", "name": "Población Coquimbo", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_V": {"id": "F049.POBVA.STO.INE.AT.A", "name": "Población Valparaíso", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_RM": {"id": "F049.POBRM.STO.INE.AT.A", "name": "Población Metropolitana", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VI": {"id": "F049.POBLI.STO.INE.AT.A", "name": "Población O'Higgins", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VII": {"id": "F049.POBML.STO.INE.AT.A", "name": "Población Maule", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VIII": {"id": "F049.POBBI.STO.INE.AT.A", "name": "Población Biobío", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XVI": {"id": "F049.POBNB.STO.INE.AT.A", "name": "Población Ñuble", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IX": {"id": "F049.POBAR.STO.INE.AT.A", "name": "Población La Araucanía", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XIV": {"id": "F049.POBLR.STO.INE.AT.A", "name": "Población Los Ríos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_X": {"id": "F049.POBLL.STO.INE.AT.A", "name": "Población Los Lagos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XI": {"id": "F049.POBAI.STO.INE.AT.A", "name": "Población Aysén", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XII": {"id": "F049.POBMA.STO.INE.AT.A", "name": "Población Magallanes", "frequency": "A", "desde": "2010-01-01"},
    # Población Regional - Mujeres
    "pob_reg_XV_m": {"id": "F049.POBAP.STO.INE.MT.A", "name": "Población Mujeres Arica y Parinacota", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_I_m": {"id": "F049.POBTA.STO.INE.MT.A", "name": "Población Mujeres Tarapacá", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_II_m": {"id": "F049.POBAN.STO.INE.MT.A", "name": "Población Mujeres Antofagasta", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_III_m": {"id": "F049.POBAT.STO.INE.MT.A", "name": "Población Mujeres Atacama", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IV_m": {"id": "F049.POBCO.STO.INE.MT.A", "name": "Población Mujeres Coquimbo", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_V_m": {"id": "F049.POBVA.STO.INE.MT.A", "name": "Población Mujeres Valparaíso", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_RM_m": {"id": "F049.POBRM.STO.INE.MT.A", "name": "Población Mujeres Metropolitana", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VI_m": {"id": "F049.POBLI.STO.INE.MT.A", "name": "Población Mujeres O'Higgins", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VII_m": {"id": "F049.POBML.STO.INE.MT.A", "name": "Población Mujeres Maule", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VIII_m": {"id": "F049.POBBI.STO.INE.MT.A", "name": "Población Mujeres Biobío", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XVI_m": {"id": "F049.POBNB.STO.INE.MT.A", "name": "Población Mujeres Ñuble", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IX_m": {"id": "F049.POBAR.STO.INE.MT.A", "name": "Población Mujeres La Araucanía", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XIV_m": {"id": "F049.POBLR.STO.INE.MT.A", "name": "Población Mujeres Los Ríos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_X_m": {"id": "F049.POBLL.STO.INE.MT.A", "name": "Población Mujeres Los Lagos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XI_m": {"id": "F049.POBAI.STO.INE.MT.A", "name": "Población Mujeres Aysén", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XII_m": {"id": "F049.POBMA.STO.INE.MT.A", "name": "Población Mujeres Magallanes", "frequency": "A", "desde": "2010-01-01"},
    # Población Regional - Hombres
    "pob_reg_XV_h": {"id": "F049.POBAP.STO.INE.HT.A", "name": "Población Hombres Arica y Parinacota", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_I_h": {"id": "F049.POBTA.STO.INE.HT.A", "name": "Población Hombres Tarapacá", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_II_h": {"id": "F049.POBAN.STO.INE.HT.A", "name": "Población Hombres Antofagasta", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_III_h": {"id": "F049.POBAT.STO.INE.HT.A", "name": "Población Hombres Atacama", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IV_h": {"id": "F049.POBCO.STO.INE.HT.A", "name": "Población Hombres Coquimbo", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_V_h": {"id": "F049.POBVA.STO.INE.HT.A", "name": "Población Hombres Valparaíso", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_RM_h": {"id": "F049.POBRM.STO.INE.HT.A", "name": "Población Hombres Metropolitana", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VI_h": {"id": "F049.POBLI.STO.INE.HT.A", "name": "Población Hombres O'Higgins", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VII_h": {"id": "F049.POBML.STO.INE.HT.A", "name": "Población Hombres Maule", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_VIII_h": {"id": "F049.POBBI.STO.INE.HT.A", "name": "Población Hombres Biobío", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XVI_h": {"id": "F049.POBNB.STO.INE.HT.A", "name": "Población Hombres Ñuble", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_IX_h": {"id": "F049.POBAR.STO.INE.HT.A", "name": "Población Hombres La Araucanía", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XIV_h": {"id": "F049.POBLR.STO.INE.HT.A", "name": "Población Hombres Los Ríos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_X_h": {"id": "F049.POBLL.STO.INE.HT.A", "name": "Población Hombres Los Lagos", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XI_h": {"id": "F049.POBAI.STO.INE.HT.A", "name": "Población Hombres Aysén", "frequency": "A", "desde": "2010-01-01"},
    "pob_reg_XII_h": {"id": "F049.POBMA.STO.INE.HT.A", "name": "Población Hombres Magallanes", "frequency": "A", "desde": "2010-01-01"}
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
            all_data["series"][key] = records
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
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nOK: Datos guardados en: {output_path}")
    print(f"Ultima actualizacion: {all_data['last_update']}")
    print("Data sincronizada con exito")

if __name__ == "__main__":
    sync_data()
