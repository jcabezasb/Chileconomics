"""Temporal: explora qué entregan el FMI y el Banco Central sobre proyecciones. Se borra antes del merge."""

import io
import re
from urllib.parse import quote

import pandas as pd
import requests

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}


def get(url, **kw):
    try:
        r = requests.get(url, headers=UA, timeout=120, **kw)
        print(f"\n=== {url} -> {r.status_code} {len(r.content)} bytes", flush=True)
        return r
    except Exception as exc:  # noqa: BLE001
        print(f"\n=== {url} -> ERROR {exc}", flush=True)
        return None


page = get("https://www.bcentral.cl/web/banco-central/areas/politica-monetaria/informe-de-politica-monetaria")
link = next((h for h in re.findall(r'href="([^"]+)"', page.text) if "Proyecciones IPoM" in h), None)
r = get("https://www.bcentral.cl" + quote(link, safe="/-"))
frame = pd.read_excel(io.BytesIO(r.content), sheet_name="Tabla", header=None)
for col in range(frame.shape[1]):
    print(f"col {col}: anio={frame.iat[1, col]!r} ipom={frame.iat[2, col]!r} pib={frame.iat[4, col]!r} ipc_dic={frame.iat[15, col]!r}")
print("filas:", [str(frame.iat[i, 0]) for i in range(frame.shape[0])])

r = get("https://api.imf.org/external/sdmx/2.1/dataflow/IMF.RES/all/all")
ids = sorted(set(re.findall(r'id="(WEO[^"]*)" version="([^"]+)"', r.text)))
print("WEO dataflows:", ids)
for flow, version in ids:
    r = get(f"https://api.imf.org/external/sdmx/2.1/data/IMF.RES,{flow},{version}/CHL.NGDP_RPCH.A")
    if r is not None and r.ok:
        head = re.search(r"<message:DataSet[^>]*>", r.text)
        print("  dataset:", head.group(0)[-400:] if head else None)
        series = re.search(r"<Series[^>]*>", r.text)
        print("  series:", series.group(0)[:600] if series else None)
        print("  obs:", re.findall(r'TIME_PERIOD="(\d{4})"[^>]*OBS_VALUE="([^"]+)"', r.text)[-9:])
for name in ["WEO_2025_APR_VINTAGE", "WEO_2024_OCT_VINTAGE", "WEO_2024_APR_VINTAGE", "WEO_2023_OCT_VINTAGE"]:
    r = get(f"https://api.imf.org/external/sdmx/2.1/data/IMF.RES,{name}/CHL.NGDP_RPCH.A")
    if r is not None and r.ok:
        print("  obs:", re.findall(r'TIME_PERIOD="(\d{4})"[^>]*OBS_VALUE="([^"]+)"', r.text)[-9:])
