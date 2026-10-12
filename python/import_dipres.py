"""Importa el informe trimestral de ejecución presupuestaria de la DIPRES y actualiza
public/data/finanzas_publicas.json, el archivo que lee la sección de finanzas públicas.

Uso (cuando la DIPRES publica un trimestre nuevo):
    1. Descargar "Informes de Ejecución Presupuestaria" (.xlsx) desde
       https://www.dipres.gob.cl/598/w3-propertyvalue-15492.html
    2. npm run import-dipres -- ruta/al/archivo.xlsx   (se pueden pasar varios)

Cada archivo trae los meses publicados de un año. Esos meses reemplazan a los que había para ese
año (la DIPRES revisa cifras anteriores), y los demás años quedan como estaban.

Se leen dos hojas:
  - "Total": estado de operaciones del Gobierno Central Total (cuadro 1.a).
  - "IngTrib": detalle de los ingresos tributarios (cuadro 4.a).
Antes de escribir se verifica que cada partida sea la suma de sus componentes; si no cuadra, el
formato del Excel cambió y el script termina con error sin tocar el JSON.
"""

import json
import os
import re
import sys
import unicodedata

from openpyxl import load_workbook

OUTPUT_PATH = os.path.join("public", "data", "finanzas_publicas.json")
SOURCE_URL = "https://www.dipres.gob.cl/598/w3-propertyvalue-15492.html"
MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
TOLERANCE = 5  # millones de pesos: las sumas del Excel pueden diferir por redondeo


def row(sheet, label, after=None):
    return {"sheet": sheet, "label": label, "after": after}


def node(node_id, label, source=None, children=None, sum_of_children=False):
    return {"id": node_id, "label": label, "source": source, "children": children or [],
            "sum_of_children": sum_of_children}


# Árbol de la sección. "source" dice de qué fila sale cada partida; las que tienen
# sum_of_children se calculan sumando sus componentes.
TREE = [
    node("ingresos", "Ingresos totales", row("Total", "TOTAL INGRESOS"), [
        node("tributarios", "Ingresos tributarios netos", row("Total", "Ingresos tributarios netos"), [
            node("renta", "Impuesto a la renta", row("IngTrib", "1. Impuestos a la Renta"), [
                node("renta_anual", "Declaración anual (operación renta)", row("IngTrib", "Declaración Anual"), [
                    node("renta_anual_impuesto", "Impuesto declarado", row("IngTrib", "Impuestos", after="Declaración Anual")),
                    node("renta_anual_pagos", "Pagos y créditos ya imputados", row("IngTrib", "Sistemas de Pago", after="Declaración Anual")),
                ]),
                node("renta_mensual", "Declaración y pago mensual", row("IngTrib", "Declaración y Pago Mensual")),
                node("ppm", "Pagos provisionales mensuales (PPM)", row("IngTrib", "Pagos Provisionales Mensuales")),
            ]),
            node("iva", "Impuesto al valor agregado (IVA)", row("IngTrib", "2. Impuesto al Valor Agregado"), [
                node("iva_declarado", "IVA declarado", row("IngTrib", "I.V.A. Declarado")),
                node("iva_constructoras", "Crédito especial empresas constructoras", row("IngTrib", "Crédito Especial Empresas Constructoras")),
                node("iva_devoluciones", "Devoluciones", row("IngTrib", "Devoluciones")),
            ]),
            node("especificos", "Impuestos a productos específicos", row("IngTrib", "3. Impuestos a Productos Específicos"), [
                node("tabacos", "Tabacos, cigarros y cigarrillos", row("IngTrib", "Tabacos, Cigarros y Cigarrillos")),
                node("combustibles", "Combustibles", row("IngTrib", "Combustibles")),
                node("pesca", "Derechos de extracción (Ley de Pesca)", row("IngTrib", "Derechos de Extracción Ley de Pesca")),
            ]),
            node("actos_juridicos", "Impuestos a los actos jurídicos", row("IngTrib", "4. Impuestos a los Actos Jurídicos")),
            node("comercio_exterior", "Impuestos al comercio exterior", row("IngTrib", "5. Impuestos al Comercio Exterior")),
            node("otros_tributarios", "Otros impuestos", row("IngTrib", "6. Otros"), [
                node("otros_tributarios_fluctuacion", "Fluctuación de deudores y diferencias pendientes",
                     row("IngTrib", "Fluctuación Deudores más Diferencias Pendientes")),
                node("otros_tributarios_resto", "Otros", row("IngTrib", "Otros", after="Fluctuación Deudores más Diferencias Pendientes")),
            ]),
        ]),
        node("cobre", "Cobre bruto (Codelco)", row("Total", "Cobre bruto")),
        node("imposiciones", "Imposiciones previsionales", row("Total", "Imposiciones previsionales")),
        node("donaciones", "Donaciones", row("Total", "Donaciones")),
        node("rentas_propiedad", "Rentas de la propiedad", row("Total", "Rentas de la propiedad")),
        node("ingresos_operacion", "Ingresos de operación", row("Total", "Ingresos de operación")),
        node("otros_ingresos", "Otros ingresos", row("Total", "Otros ingresos")),
        node("venta_activos", "Venta de activos físicos", row("Total", "Venta de activos físicos")),
    ]),
    node("gastos", "Gastos totales", row("Total", "TOTAL GASTOS"), [
        node("gasto_corriente", "Gasto corriente", row("Total", "GASTOS"), [
            node("personal", "Personal", row("Total", "Personal")),
            node("bienes_servicios", "Bienes y servicios de consumo y producción", row("Total", "Bienes y servicios de consumo y producción")),
            node("intereses", "Intereses de la deuda", row("Total", "Intereses")),
            node("subsidios", "Subsidios y donaciones", row("Total", "Subsidios y donaciones")),
            node("prestaciones", "Prestaciones previsionales", row("Total", "Prestaciones previsionales")),
            node("otros_gastos", "Otros", row("Total", "Otros", after="Prestaciones previsionales")),
        ]),
        node("gasto_capital", "Gasto de capital", None, [
            node("inversion", "Inversión", row("Total", "Inversión")),
            node("transferencias_capital", "Transferencias de capital", row("Total", "Transferencias de capital")),
        ], sum_of_children=True),
    ]),
]

# Series que no son parte del árbol pero se muestran en la sección.
EXTRA = [
    node("balance", "Balance efectivo", row("Total", "PRESTAMO NETO/ENDEUDAMIENTO NETO")),
    node("resultado_operativo", "Resultado operativo bruto", row("Total", "RESULTADO OPERATIVO BRUTO")),
    node("mineria_privada", "Tributación minería privada", row("Total", "Tributación minería privada")),
    node("resto_contribuyentes", "Tributación resto de contribuyentes", row("Total", "Tributación resto contribuyentes")),
]


def normalize(text):
    """'  Prestaciones previsionales 1/' -> 'prestaciones previsionales' (sin tildes ni notas)."""
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode()
    text = re.sub(r"\s+\d+/\s*$", "", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def walk(nodes):
    for item in nodes:
        yield item
        yield from walk(item["children"])


def read_sheet(workbook, name):
    """Filas de una hoja como [(etiqueta normalizada, {mes: valor})], más el año del cuadro."""
    sheet = next((ws for ws in workbook.worksheets if ws.title.strip() == name), None)
    if sheet is None:
        raise ValueError(f"No se encontró la hoja '{name}'")

    year, month_columns, rows = None, None, []
    for cells in sheet.iter_rows(values_only=True):
        texts = [normalize(cell) for cell in cells if isinstance(cell, str)]
        if year is None:
            for text in texts:
                found = re.search(r"(?:gobierno|tributarios|consolidados)\s+(\d{4})", text)
                if found:
                    year = int(found.group(1))
        if month_columns is None:
            if "enero" in texts and "diciembre" in texts:
                month_columns = {
                    MONTHS.index(normalize(cell)) + 1: index
                    for index, cell in enumerate(cells)
                    if isinstance(cell, str) and normalize(cell) in MONTHS
                }
            continue
        label = next((cell for cell in cells[:3] if isinstance(cell, str) and cell.strip()), None)
        if label is None:
            continue
        values = {
            month: float(cells[column])
            for month, column in month_columns.items()
            if column < len(cells) and isinstance(cells[column], (int, float))
        }
        rows.append((normalize(label), values))

    if month_columns is None:
        raise ValueError(f"La hoja '{name}' no tiene la fila de meses (Enero ... Diciembre)")
    return year, rows


def find_row(rows, label, after=None):
    target, start = normalize(label), 0
    if after:
        anchor = normalize(after)
        start = next((i for i, (text, _) in enumerate(rows) if text == anchor), None)
        if start is None:
            raise ValueError(f"No se encontró la fila '{after}'")
    for text, values in rows[start:]:
        if text == target or (target == "cobre bruto" and "codelco" in text):
            return values
    raise ValueError(f"No se encontró la fila '{label}'")


def parse_workbook(path):
    """{'year', 'months': [1..n publicados], 'series': {id: {mes: valor}}} de un archivo."""
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        sheets = {name: read_sheet(workbook, name) for name in ("Total", "IngTrib")}
    except ValueError as error:
        raise ValueError(f"{path}: {error}") from error
    year = sheets["Total"][0]
    if year is None:
        raise ValueError(f"{path}: no se encontró el año en el título de la hoja Total")
    # Algunos años el cuadro tributario no lleva el año en el título.
    if sheets["IngTrib"][0] not in (None, year):
        raise ValueError(f"{path}: las hojas Total e IngTrib son de años distintos")

    # Meses publicados: los que tienen dato de ingresos totales (los demás vienen vacíos o en 0).
    published = sorted(find_row(sheets["Total"][1], "TOTAL INGRESOS"))
    if not published or published != list(range(1, len(published) + 1)):
        raise ValueError(f"{path}: meses publicados inesperados {published}")

    series = {}
    for item in list(walk(TREE)) + EXTRA:
        source = item["source"]
        if source is None:
            continue
        values = find_row(sheets[source["sheet"]][1], source["label"], source["after"])
        series[item["id"]] = {month: values.get(month, 0.0) for month in published}
    for item in walk(TREE):
        if item["sum_of_children"]:
            series[item["id"]] = {
                month: sum(series[child["id"]][month] for child in item["children"]) for month in published
            }
    check_totals(series, published, f"{path} ({year})")
    return {"year": year, "months": published, "series": series}


def check_totals(series, months, where):
    """Cada partida debe ser la suma de sus componentes (salvo diferencias de redondeo)."""
    errors = []
    for item in walk(TREE):
        if not item["children"]:
            continue
        for month in months:
            total = series[item["id"]][month]
            parts = sum(series[child["id"]][month] for child in item["children"])
            if abs(total - parts) > TOLERANCE:
                errors.append(f"{item['id']} mes {month}: {total:,.0f} vs suma {parts:,.0f}")
    if errors:
        raise ValueError(f"{where}: las sumas no cuadran\n  " + "\n  ".join(errors[:10]))


def month_key(year, month):
    return f"{year}-{month:02d}"


def public_tree(nodes):
    return [
        {"id": item["id"], "label": item["label"], **({"children": public_tree(item["children"])} if item["children"] else {})}
        for item in nodes
    ]


def merge(existing, parsed_files):
    """Junta los meses del JSON anterior con los de los archivos nuevos (los nuevos mandan)."""
    by_month = {}
    if existing:
        start_year, start_month = map(int, existing["start"].split("-"))
        for series_id, values in existing["series"].items():
            for offset, value in enumerate(values):
                year = start_year + (start_month - 1 + offset) // 12
                month = (start_month - 1 + offset) % 12 + 1
                if value is not None:
                    by_month.setdefault(series_id, {})[month_key(year, month)] = value

    for parsed in sorted(parsed_files, key=lambda item: item["year"]):
        for series_id, values in parsed["series"].items():
            target = by_month.setdefault(series_id, {})
            for key in [k for k in target if k.startswith(f"{parsed['year']}-")]:
                del target[key]
            for month, value in values.items():
                target[month_key(parsed["year"], month)] = round(value)

    all_keys = sorted({key for values in by_month.values() for key in values})
    first_year, first_month = map(int, all_keys[0].split("-"))
    last_year, last_month = map(int, all_keys[-1].split("-"))
    count = (last_year - first_year) * 12 + (last_month - first_month) + 1
    keys = [month_key(first_year + (first_month - 1 + i) // 12, (first_month - 1 + i) % 12 + 1) for i in range(count)]

    ids = [item["id"] for item in list(walk(TREE)) + EXTRA]
    return {
        "source": "Dirección de Presupuestos (DIPRES), Estado de Operaciones del Gobierno Central Total",
        "source_url": SOURCE_URL,
        "unit": "millones de pesos",
        "start": keys[0],
        "last_period": keys[-1],
        "tree": public_tree(TREE),
        "extra": [{"id": item["id"], "label": item["label"]} for item in EXTRA],
        "series": {series_id: [by_month.get(series_id, {}).get(key) for key in keys] for series_id in ids},
    }


def main(paths):
    if not paths:
        print(__doc__)
        return 1
    try:
        parsed = [parse_workbook(path) for path in paths]
    except ValueError as error:
        print(f"Error: {error}")
        return 1

    existing = None
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, encoding="utf-8") as handle:
            existing = json.load(handle)
    output = merge(existing, parsed)

    temp_path = OUTPUT_PATH + ".tmp"
    with open(temp_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, separators=(",", ":"))
    os.replace(temp_path, OUTPUT_PATH)

    for item in parsed:
        print(f"{item['year']}: {len(item['months'])} meses (hasta {MONTHS[item['months'][-1] - 1]})")
    print(f"Datos guardados en {OUTPUT_PATH}: {output['start']} -> {output['last_period']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
