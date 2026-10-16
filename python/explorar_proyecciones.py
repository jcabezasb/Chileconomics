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
        print(f"\n=== {url} -> {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes", flush=True)
        return r
    except Exception as exc:  # noqa: BLE001
        print(f"\n=== {url} -> ERROR {exc}", flush=True)
        return None


# Banco Central: Excel histórico de proyecciones del IPoM
page = get("https://www.bcentral.cl/web/banco-central/areas/politica-monetaria/informe-de-politica-monetaria")
link = next((h for h in re.findall(r'href="([^"]+)"', page.text) if "Proyecciones IPoM" in h), None)
print("link:", link)
if link:
    r = get("https://www.bcentral.cl" + quote(link, safe="/-"))
    book = pd.read_excel(io.BytesIO(r.content), sheet_name=None, header=None)
    for name, frame in book.items():
        print(f"\n--- hoja {name!r} {frame.shape}")
        print(frame.head(60).to_string(max_cols=40, max_colwidth=22))

# FMI: API SDMX. Estructura de la respuesta y versiones del WEO
r = get("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO/CHL.NGDP_RPCH.A")
print(r.text[1500:7000])
r = get("https://api.imf.org/external/sdmx/2.1/dataflow/IMF.RES/all/all")
if r is not None and r.ok:
    for m in re.finditer(r'<str:Dataflow[^>]*id="([^"]+)"[^>]*version="([^"]+)"', r.text):
        print("  dataflow", m.group(1), m.group(2))
    print(r.text[:1500])
for version in ["1.0.0", "2.0.0", "3.0.0", "4.0.0", "5.0.0", "6.0.0", "7.0.0", "8.0.0", "9.0.0"]:
    r = get(f"https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO,{version}/CHL.NGDP_RPCH.A")
    if r is not None and r.ok:
        pub = re.search(r'PUBLICATION_DATE="([^"]+)"', r.text)
        obs = re.findall(r'TIME_PERIOD="(\d{4})"[^>]*OBS_VALUE="([^"]+)"', r.text)
        print("  publicado:", pub.group(1) if pub else None, "obs:", obs[-10:])
r = get("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO/CHL+WLD+G001.NGDP_RPCH.A?startPeriod=2020")
print(r.text[:300] if r is not None else "")
