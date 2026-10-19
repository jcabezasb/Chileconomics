"""Pruebas del importador de la DIPRES con un Excel armado en la prueba (mismo formato que el real)."""

import io
import json
import os
import sys
from datetime import date

import pytest
from openpyxl import Workbook

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_dipres  # noqa: E402

MONTH_HEADER = ["Enero", "Febrero", "Marzo", "1°Trim.", "Abril", "Mayo", "Junio", "2°Trim.", "1°Sem.",
                "Julio", "Agosto", "Septiembre", "3°Trim.", "Octubre", "Noviembre", "Diciembre",
                "4°Trim.", "2°Sem.", "Total Año"]
MONTH_POSITIONS = [i for i, name in enumerate(MONTH_HEADER) if "Trim" not in name and "Sem" not in name and "Total" not in name]

# Valor mensual de cada partida hoja (millones). Los totales se calculan para que cuadren.
LEAVES = {
    "renta_anual_impuesto": 50, "renta_anual_pagos": -30, "renta_mensual": 40, "ppm": 60,
    "iva_declarado": 200, "iva_constructoras": -5, "iva_devoluciones": -45,
    "tabacos": 10, "combustibles": 20, "pesca": 1, "actos_juridicos": 8, "comercio_exterior": 4,
    "otros_tributarios_fluctuacion": -3, "otros_tributarios_resto": 7,
    "cobre": 30, "imposiciones": 25, "donaciones": 1, "rentas_propiedad": 9, "ingresos_operacion": 6,
    "otros_ingresos": 4, "venta_activos": 1,
    "personal": 100, "bienes_servicios": 40, "intereses": 20, "subsidios": 150, "prestaciones": 90,
    "otros_gastos": 2, "inversion": 30, "transferencias_capital": 35,
}


def node_values():
    values = dict(LEAVES)

    def total(item):
        if item["id"] in values:
            return values[item["id"]]
        values[item["id"]] = sum(total(child) for child in item["children"])
        return values[item["id"]]

    for item in import_dipres.TREE:
        total(item)
    values["balance"] = values["ingresos"] - values["gastos"]
    values["resultado_operativo"] = values["ingresos"] - values["venta_activos"] - values["gasto_corriente"]
    values["mineria_privada"] = 70
    values["resto_contribuyentes"] = values["tributarios"] - 70
    return values


def month_row(label, value, months, offset):
    cells = [None] * offset + [label]
    numbers = [None] * len(MONTH_HEADER)
    for position in MONTH_POSITIONS[:months]:
        numbers[position] = value
    return cells + numbers


def write_workbook(path, year=2025, months=12, break_sum=False):
    values = node_values()
    if break_sum:
        values["personal"] += 1000
    workbook = Workbook()
    total = workbook.active
    total.title = "Total"
    total.append([None, f"ESTADO DE OPERACIONES DE GOBIERNO  {year}"])
    total.append([None, None] + MONTH_HEADER)
    tax = workbook.create_sheet("IngTrib")
    tax.append([f"EJECUCION INGRESOS TRIBUTARIOS {year} 1/"])
    tax.append([None, "Ley de Presupuestos Aprobada"] + MONTH_HEADER)

    sources = [item for item in list(import_dipres.walk(import_dipres.TREE)) + import_dipres.EXTRA if item["source"]]
    for item in sources:
        source = item["source"]
        if source["sheet"] == "Total":
            label = source["label"] + (" 1/" if item["id"] == "prestaciones" else "")
            total.append(month_row(label, values[item["id"]], months, offset=1))
        else:
            # La hoja tributaria tiene una columna extra (ley aprobada) antes de los meses.
            tax.append(["    " + source["label"], 999] + month_row(None, values[item["id"]], months, offset=0)[1:])
    workbook.save(path)


def test_parses_tree_and_published_months(tmp_path):
    path = tmp_path / "informe.xlsx"
    write_workbook(path, year=2026, months=6)
    parsed = import_dipres.parse_workbook(str(path))
    assert parsed["year"] == 2026
    assert parsed["months"] == [1, 2, 3, 4, 5, 6]
    values = node_values()
    assert parsed["series"]["ingresos"][6] == values["ingresos"]
    assert parsed["series"]["gasto_capital"][1] == LEAVES["inversion"] + LEAVES["transferencias_capital"]
    assert parsed["series"]["otros_gastos"][3] == LEAVES["otros_gastos"]  # "Otros" bajo los gastos
    assert parsed["series"]["renta_anual_impuesto"][2] == LEAVES["renta_anual_impuesto"]


def test_rejects_workbook_whose_totals_do_not_add_up(tmp_path):
    path = tmp_path / "informe.xlsx"
    write_workbook(path, break_sum=True)
    with pytest.raises(ValueError, match="no cuadran"):
        import_dipres.parse_workbook(str(path))


def test_merge_replaces_only_the_years_in_the_new_files(tmp_path):
    old_path, new_path = tmp_path / "2025.xlsx", tmp_path / "2026.xlsx"
    write_workbook(old_path, year=2025, months=12)
    write_workbook(new_path, year=2026, months=3)
    first = import_dipres.merge(None, [import_dipres.parse_workbook(str(old_path))])
    assert (first["start"], first["last_period"]) == ("2025-01", "2025-12")

    second = import_dipres.merge(first, [import_dipres.parse_workbook(str(new_path))])
    assert (second["start"], second["last_period"]) == ("2025-01", "2026-03")
    assert len(second["series"]["ingresos"]) == 15
    assert second["series"]["ingresos"][0] == first["series"]["ingresos"][0]
    assert second["tree"][0]["id"] == "ingresos"
    assert "source" not in second["tree"][0]


def test_find_latest_excel_takes_the_first_report():
    html = """
        <a href="articles-410030_doc_pdf_Indice.pdf?ts=1">Indice</a>
        <a href="articles-410030_doc_xls_informes.xlsx?ts=1785510639">Informes de Ejecución Presupuestaria</a>
        <a href="articles-369688_doc_xls_informes.xlsx?ts=1769806589">Informes de Ejecución Presupuestaria</a>
        <a href="articles-99111_doc_xls_iniciativas_inversion_region.xls?ts=1">Iniciativas de inversión</a>
    """
    assert import_dipres.find_latest_excel(html) == (
        "https://www.dipres.gob.cl/598/articles-410030_doc_xls_informes.xlsx?ts=1785510639"
    )
    assert import_dipres.find_latest_excel('<a href="otro.pdf">x</a>') is None


def test_main_writes_the_check_date(tmp_path, monkeypatch):
    path = tmp_path / "informe.xlsx"
    write_workbook(path, year=2026, months=3)
    output = tmp_path / "finanzas_publicas.json"
    monkeypatch.setattr(import_dipres, "OUTPUT_PATH", str(output))
    assert import_dipres.main([str(path)]) == 0
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["checked_at"] == date.today().isoformat()
    assert payload["last_period"] == "2026-03"


def test_main_does_not_touch_the_data_if_the_download_is_not_an_excel(tmp_path, monkeypatch):
    output = tmp_path / "finanzas_publicas.json"
    output.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(import_dipres, "OUTPUT_PATH", str(output))
    monkeypatch.setattr(import_dipres, "download", lambda: (io.BytesIO(b"<html>bloqueado</html>"), "https://x"))
    assert import_dipres.main([]) == 1
    assert output.read_text(encoding="utf-8") == "{}"
