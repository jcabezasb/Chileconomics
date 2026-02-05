import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler

import bcchapi


def _block_production(handler):
    if os.environ.get("VERCEL_ENV") == "production":
        _build_response(handler, 403, {"error": "forbidden"})
        return True

    return False

SERIES_CONFIG = {
    "pib_real": {"id": "F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T", "name": "PIB Real Nacional"},
    "pib_nominal": {"id": "F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T", "name": "PIB Nominal Nacional"},
    "consumo_privado": {"id": "F033.CPR.FLU.N.CLP.EP18.0.T", "name": "Consumo Privado (Hogares + IPSFL)"},
    "gasto_gob_nominal": {"id": "F033.COG.FLU.N.CLP.EP18.0.T", "name": "Gasto de Gobierno"},
    "fbkf_nominal": {"id": "F033.FKF.FLU.N.CLP.EP18.0.T", "name": "Formacion Bruta de Capital Fijo"},
    "existencias_nominal": {"id": "F033.VAX.FLU.N.CLP.EP18.0.T", "name": "Variacion de Existencias"},
    "export_nominal": {"id": "F033.XBS.FLU.N.CLP.EP18.0.T", "name": "Exportaciones Bienes y Servicios"},
    "import_nominal": {"id": "F033.IBS.FLU.N.CLP.EP18.0.T", "name": "Importaciones Bienes y Servicios"},
    "ipc_index": {"id": "F074.IPC.IND.Z.EP23.C.M", "name": "IPC Indice"},
    "dolar": {"id": "F073.TCO.PRE.Z.D", "name": "Dolar Observado"},
    "cobre": {"id": "F019.PPB.PRE.100.D", "name": "Precio del Cobre"},
    "desempleo": {"id": "F049.DES.TAS.INE9.10.M", "name": "Desempleo"},
    # Regionales
    "pib_reg_XV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.15.0.T", "name": "PIB Arica y Parinacota"},
    "pib_reg_I": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.01.0.T", "name": "PIB Tarapaca"},
    "pib_reg_II": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.02.0.T", "name": "PIB Antofagasta"},
    "pib_reg_III": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.03.0.T", "name": "PIB Atacama"},
    "pib_reg_IV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.04.0.T", "name": "PIB Coquimbo"},
    "pib_reg_V": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.05.0.T", "name": "PIB Valparaiso"},
    "pib_reg_RM": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.13.0.T", "name": "PIB Metropolitana"},
    "pib_reg_VI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.06.0.T", "name": "PIB O'Higgins"},
    "pib_reg_VII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.07.0.T", "name": "PIB Maule"},
    "pib_reg_XVI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.16.0.T", "name": "PIB Nuble"},
    "pib_reg_VIII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.08.0.T", "name": "PIB Biobio"},
    "pib_reg_IX": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.09.0.T", "name": "PIB La Araucania"},
    "pib_reg_XIV": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.14.0.T", "name": "PIB Los Rios"},
    "pib_reg_X": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.10.0.T", "name": "PIB Los Lagos"},
    "pib_reg_XI": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.11.0.T", "name": "PIB Aysen"},
    "pib_reg_XII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T", "name": "PIB Magallanes"},
    # Poblacion Nacional
    "pob_total": {"id": "F049.POB.STO.INE1.01.A", "name": "Poblacion total nacional"},
    "pob_mujeres": {"id": "F049.POB.STO.INE1.03.A", "name": "Poblacion mujeres nacional"},
    "pob_hombres": {"id": "F049.POB.STO.INE1.02.A", "name": "Poblacion hombres nacional"},
    # Poblacion Regional - Total
    "pob_reg_XV": {"id": "F049.POBAP.STO.INE.AT.A", "name": "Poblacion Arica y Parinacota"},
    "pob_reg_I": {"id": "F049.POBTA.STO.INE.AT.A", "name": "Poblacion Tarapaca"},
    "pob_reg_II": {"id": "F049.POBAN.STO.INE.AT.A", "name": "Poblacion Antofagasta"},
    "pob_reg_III": {"id": "F049.POBAT.STO.INE.AT.A", "name": "Poblacion Atacama"},
    "pob_reg_IV": {"id": "F049.POBCO.STO.INE.AT.A", "name": "Poblacion Coquimbo"},
    "pob_reg_V": {"id": "F049.POBVA.STO.INE.AT.A", "name": "Poblacion Valparaiso"},
    "pob_reg_RM": {"id": "F049.POBRM.STO.INE.AT.A", "name": "Poblacion Metropolitana"},
    "pob_reg_VI": {"id": "F049.POBLI.STO.INE.AT.A", "name": "Poblacion O'Higgins"},
    "pob_reg_VII": {"id": "F049.POBML.STO.INE.AT.A", "name": "Poblacion Maule"},
    "pob_reg_VIII": {"id": "F049.POBBI.STO.INE.AT.A", "name": "Poblacion Biobio"},
    "pob_reg_XVI": {"id": "F049.POBNB.STO.INE.AT.A", "name": "Poblacion Nuble"},
    "pob_reg_IX": {"id": "F049.POBAR.STO.INE.AT.A", "name": "Poblacion La Araucania"},
    "pob_reg_XIV": {"id": "F049.POBLR.STO.INE.AT.A", "name": "Poblacion Los Rios"},
    "pob_reg_X": {"id": "F049.POBLL.STO.INE.AT.A", "name": "Poblacion Los Lagos"},
    "pob_reg_XI": {"id": "F049.POBAI.STO.INE.AT.A", "name": "Poblacion Aysen"},
    "pob_reg_XII": {"id": "F049.POBMA.STO.INE.AT.A", "name": "Poblacion Magallanes"},
    # Poblacion Regional - Mujeres
    "pob_reg_XV_m": {"id": "F049.POBAP.STO.INE.MT.A", "name": "Poblacion Mujeres Arica y Parinacota"},
    "pob_reg_I_m": {"id": "F049.POBTA.STO.INE.MT.A", "name": "Poblacion Mujeres Tarapaca"},
    "pob_reg_II_m": {"id": "F049.POBAN.STO.INE.MT.A", "name": "Poblacion Mujeres Antofagasta"},
    "pob_reg_III_m": {"id": "F049.POBAT.STO.INE.MT.A", "name": "Poblacion Mujeres Atacama"},
    "pob_reg_IV_m": {"id": "F049.POBCO.STO.INE.MT.A", "name": "Poblacion Mujeres Coquimbo"},
    "pob_reg_V_m": {"id": "F049.POBVA.STO.INE.MT.A", "name": "Poblacion Mujeres Valparaiso"},
    "pob_reg_RM_m": {"id": "F049.POBRM.STO.INE.MT.A", "name": "Poblacion Mujeres Metropolitana"},
    "pob_reg_VI_m": {"id": "F049.POBLI.STO.INE.MT.A", "name": "Poblacion Mujeres O'Higgins"},
    "pob_reg_VII_m": {"id": "F049.POBML.STO.INE.MT.A", "name": "Poblacion Mujeres Maule"},
    "pob_reg_VIII_m": {"id": "F049.POBBI.STO.INE.MT.A", "name": "Poblacion Mujeres Biobio"},
    "pob_reg_XVI_m": {"id": "F049.POBNB.STO.INE.MT.A", "name": "Poblacion Mujeres Nuble"},
    "pob_reg_IX_m": {"id": "F049.POBAR.STO.INE.MT.A", "name": "Poblacion Mujeres La Araucania"},
    "pob_reg_XIV_m": {"id": "F049.POBLR.STO.INE.MT.A", "name": "Poblacion Mujeres Los Rios"},
    "pob_reg_X_m": {"id": "F049.POBLL.STO.INE.MT.A", "name": "Poblacion Mujeres Los Lagos"},
    "pob_reg_XI_m": {"id": "F049.POBAI.STO.INE.MT.A", "name": "Poblacion Mujeres Aysen"},
    "pob_reg_XII_m": {"id": "F049.POBMA.STO.INE.MT.A", "name": "Poblacion Mujeres Magallanes"},
    # Poblacion Regional - Hombres
    "pob_reg_XV_h": {"id": "F049.POBAP.STO.INE.HT.A", "name": "Poblacion Hombres Arica y Parinacota"},
    "pob_reg_I_h": {"id": "F049.POBTA.STO.INE.HT.A", "name": "Poblacion Hombres Tarapaca"},
    "pob_reg_II_h": {"id": "F049.POBAN.STO.INE.HT.A", "name": "Poblacion Hombres Antofagasta"},
    "pob_reg_III_h": {"id": "F049.POBAT.STO.INE.HT.A", "name": "Poblacion Hombres Atacama"},
    "pob_reg_IV_h": {"id": "F049.POBCO.STO.INE.HT.A", "name": "Poblacion Hombres Coquimbo"},
    "pob_reg_V_h": {"id": "F049.POBVA.STO.INE.HT.A", "name": "Poblacion Hombres Valparaiso"},
    "pob_reg_RM_h": {"id": "F049.POBRM.STO.INE.HT.A", "name": "Poblacion Hombres Metropolitana"},
    "pob_reg_VI_h": {"id": "F049.POBLI.STO.INE.HT.A", "name": "Poblacion Hombres O'Higgins"},
    "pob_reg_VII_h": {"id": "F049.POBML.STO.INE.HT.A", "name": "Poblacion Hombres Maule"},
    "pob_reg_VIII_h": {"id": "F049.POBBI.STO.INE.HT.A", "name": "Poblacion Hombres Biobio"},
    "pob_reg_XVI_h": {"id": "F049.POBNB.STO.INE.HT.A", "name": "Poblacion Hombres Nuble"},
    "pob_reg_IX_h": {"id": "F049.POBAR.STO.INE.HT.A", "name": "Poblacion Hombres La Araucania"},
    "pob_reg_XIV_h": {"id": "F049.POBLR.STO.INE.HT.A", "name": "Poblacion Hombres Los Rios"},
    "pob_reg_X_h": {"id": "F049.POBLL.STO.INE.HT.A", "name": "Poblacion Hombres Los Lagos"},
    "pob_reg_XI_h": {"id": "F049.POBAI.STO.INE.HT.A", "name": "Poblacion Hombres Aysen"},
    "pob_reg_XII_h": {"id": "F049.POBMA.STO.INE.HT.A", "name": "Poblacion Hombres Magallanes"}
}


def _build_response(handler, status, payload):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
    handler.end_headers()
    handler.wfile.write(json.dumps(payload).encode("utf-8"))


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_dataframe(df):
    if df is None:
        return []

    if hasattr(df, "reset_index"):
        df = df.reset_index()

    records = []
    for _, row in df.iterrows():
        date = None
        if "index" in row:
            date = row["index"]
        elif "fecha" in row:
            date = row["fecha"]
        elif "date" in row:
            date = row["date"]

        value = None
        if "value" in row:
            value = row["value"]
        elif len(row) > 1:
            value = row.iloc[1]

        if date is not None and hasattr(date, "strftime"):
            date = date.strftime("%Y-%m-%d")

        records.append({
            "date": date,
            "value": _parse_float(value)
        })

    return records


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if _block_production(self):
            return

        user = os.environ.get("BCCH_USER")
        password = os.environ.get("BCCH_PASSWORD")

        if not user or not password:
            _build_response(self, 500, {"error": "missing BCCH_USER or BCCH_PASSWORD"})
            return

        try:
            siete = bcchapi.Siete(user, password)
            payload = {}

            for key, config in SERIES_CONFIG.items():
                df = siete.cuadro(series=[config["id"]], nombres=["value"])
                records = _normalize_dataframe(df)
                valid = [entry for entry in records if entry.get("value") is not None]
                latest = None
                for entry in reversed(valid):
                    if entry.get("value") is not None:
                        latest = entry
                        break
                payload[key] = {
                    "id": config["id"],
                    "name": config["name"],
                    "data": valid,
                    "latest": latest,
                    "updated_at": datetime.now().isoformat()
                }

            _build_response(self, 200, payload)
        except Exception as error:
            _build_response(self, 500, {"error": str(error)})
