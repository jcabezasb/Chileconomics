import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler

import bcchapi

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
    "pib_reg_XII": {"id": "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T", "name": "PIB Magallanes"}
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
