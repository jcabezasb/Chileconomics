"""Temporal: busca en el sitio del Banco Central los Excel de IED por país y muestra su estructura.

Lee las páginas de IED, junta los enlaces a planillas, descarga las que parecen ser por país y
muestra cada hoja: tamaño, primeras filas y últimas filas. No usa credenciales (todo es público).
"""

import io
import re
import sys
from urllib.parse import urljoin

import requests

PAGES = [
    "https://si3.bcentral.cl/estadisticas/Principal1/enlaces/IED/IED.html",
    "https://si3.bcentral.cl/estadisticas/Principal1/enlaces/IED/SE_IED.html",
    "https://si3.bcentral.cl/estadisticas/principal1/excel/se/bdp/excel.html",
]
HEADERS = {"User-Agent": "Mozilla/5.0 (Chileconomics; inspeccion de datos publicos)"}
LINK = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


def links(page):
    respuesta = requests.get(page, headers=HEADERS, timeout=60)
    print(f"\n=== {page} -> HTTP {respuesta.status_code}, {len(respuesta.content)} bytes")
    respuesta.encoding = respuesta.apparent_encoding
    found = [(urljoin(page, href), text(label)) for href, label in LINK.findall(respuesta.text)]
    for url, label in found:
        print(f"  {label[:90]!r} -> {url}")
    return found


def show_sheet(name, rows):
    rows = [[("" if c is None else str(c)).strip() for c in row] for row in rows]
    rows = [row for row in rows if any(row)]
    print(f"\n--- hoja {name!r}: {len(rows)} filas con datos")
    for i, row in enumerate(rows[:45]):
        print(f"  {i:3d} | " + " | ".join(c[:28] for c in row[:16]))
    if len(rows) > 45:
        print("  ...")
        for row in rows[-8:]:
            print("      | " + " | ".join(c[:28] for c in row[:16]))


def inspect(url):
    print(f"\n######## {url}")
    respuesta = requests.get(url, headers=HEADERS, timeout=120)
    print(f"HTTP {respuesta.status_code}, {len(respuesta.content)} bytes, tipo {respuesta.headers.get('content-type')}")
    data = respuesta.content
    if data[:2] == b"PK":
        import openpyxl
        book = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        for sheet in book.worksheets:
            show_sheet(sheet.title, sheet.iter_rows(values_only=True))
    elif data[:4] == b"\xd0\xcf\x11\xe0":
        import xlrd
        book = xlrd.open_workbook(file_contents=data)
        for sheet in book.sheets():
            show_sheet(sheet.name, (sheet.row_values(i) for i in range(sheet.nrows)))
    else:
        print("No es un Excel. Primeros bytes:", data[:300])


def main():
    candidates = []
    for page in PAGES:
        try:
            for url, label in links(page):
                hint = f"{url} {label}".lower()
                if re.search(r"\.xlsx?($|\?)", url, re.I) and re.search(r"pa[ií]s|country|ied|sector|regi", hint):
                    candidates.append(url)
        except requests.RequestException as error:
            print(f"Error en {page}: {error}")
    candidates = list(dict.fromkeys(candidates))
    print(f"\n=== {len(candidates)} planillas candidatas")
    for url in candidates[:8]:
        try:
            inspect(url)
        except Exception as error:  # solo inspección: mostrar el error y seguir
            print(f"Error al leer {url}: {error}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
