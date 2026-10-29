"""Pruebas del importador de mercados de EE.UU. con respuestas armadas en la prueba (mismo formato que las reales)."""

import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_mercados_eeuu as im  # noqa: E402

TREASURY_CSV = """Date,"1 Mo","1 Yr","2 Yr","3 Yr","5 Yr","10 Yr","30 Yr"
10/16/2026,4.12,4.46,4.74,4.82,4.89,5.09,5.43
10/15/2026,4.17,4.49,4.77,4.85,4.91,5.10,5.43
"""


def test_lee_la_curva_del_tesoro_con_fechas_iso():
    out = im.parse_treasury_csv(TREASURY_CSV, im.TREASURY_NOMINAL)
    assert out["ust_10"] == {"2026-10-16": 5.09, "2026-10-15": 5.10}
    assert out["ust_1"]["2026-10-15"] == 4.49


def test_columnas_que_faltan_quedan_vacias():
    out = im.parse_treasury_csv('Date,"5 YR"\n01/02/2003,1.75\n', im.TREASURY_REAL)
    assert out == {"tips_5": {"2003-01-02": 1.75}, "tips_10": {}}


def test_lee_la_tasa_efectiva_y_el_rango_de_la_fed():
    payload = {"refRates": [
        {"effectiveDate": "2026-10-16", "type": "EFFR", "percentRate": 3.88, "targetRateFrom": 3.75, "targetRateTo": 4.0},
        {"effectiveDate": "2026-10-15", "type": "EFFR", "percentRate": None},
    ]}
    out = im.parse_effr(payload)
    assert out == {"effr": {"2026-10-16": 3.88}, "fed_low": {"2026-10-16": 3.75}, "fed_high": {"2026-10-16": 4.0}}


def test_fred_ignora_los_dias_sin_dato():
    text = "observation_date,VIXCLS\n2026-10-15,19.5\n2026-10-16,.\n2026-10-17,\n"
    assert im.parse_fred_csv(text) == {"2026-10-15": 19.5}


def test_con_historia_solo_baja_los_dos_ultimos_anos():
    today = date(2026, 10, 23)
    assert list(im.years_to_fetch(False, today)) == list(range(2015, 2027))
    assert list(im.years_to_fetch(True, today)) == [2025, 2026]
