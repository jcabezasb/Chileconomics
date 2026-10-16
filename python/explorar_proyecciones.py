"""Temporal: explora qué entregan el FMI y el Banco Central sobre proyecciones. Se borra antes del merge."""

import io
import re
import sys

import pandas as pd
import requests

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}


def get(url, **kw):
    try:
        r = requests.get(url, headers=UA, timeout=90, **kw)
        print(f"\n=== {url} -> {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes")
        return r
    except Exception as exc:  # noqa: BLE001
        print(f"\n=== {url} -> ERROR {exc}")
        return None


def show_text(r, n=1500):
    if r is not None and r.ok:
        print(r.text[:n])


def links(r, pattern):
    if r is None or not r.ok:
        return []
    found = sorted(set(re.findall(r'href="([^"]+)"', r.text)))
    hits = [h for h in found if re.search(pattern, h, re.I)]
    for h in hits[:80]:
        print("  ", h)
    return hits


def show_excel(r, rows=25):
    if r is None or not r.ok:
        return
    try:
        book = pd.read_excel(io.BytesIO(r.content), sheet_name=None, header=None)
    except Exception as exc:  # noqa: BLE001
        print("no es Excel:", exc, r.content[:200])
        return
    for name, frame in book.items():
        print(f"--- hoja {name!r} {frame.shape}")
        print(frame.head(rows).to_string(max_cols=14, max_colwidth=40))


# FMI
show_text(get("https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/CHL"))
show_text(get("https://www.imf.org/external/datamapper/api/v1"), 800)
show_text(get("https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/CHL/WLD/ARG/PER/COL/MEX/BRA"), 3000)
for url in [
    "https://www.imf.org/-/media/Files/Publications/WEO/WEO-Database/WEOhistorical.xlsx",
    "https://www.imf.org/-/media/Files/Research/WEO/WEOhistorical.xlsx",
]:
    r = get(url)
    if r is not None and r.ok and len(r.content) > 10000:
        book = pd.read_excel(io.BytesIO(r.content), sheet_name=None, header=None, nrows=8)
        for name, frame in book.items():
            print(f"--- hoja {name!r}")
            print(frame.to_string(max_cols=12, max_colwidth=25))
        full = pd.read_excel(io.BytesIO(r.content), sheet_name="ngdp_rpch") if "ngdp_rpch" in book else None
        if full is not None:
            print(full[full.iloc[:, 0].astype(str).str.contains("CHL|Chile")].iloc[:, :12].to_string())
            print("columnas:", list(full.columns)[:5], "...", list(full.columns)[-5:])
        break
show_text(get("https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO/CHL.NGDP_RPCH.A"), 1500)
r = get("https://www.imf.org/en/Publications/WEO/weo-database/2025/october")
links(r, r"xls|ashx|download")

# Banco Central: IPoM y EEE
r = get("https://www.bcentral.cl/web/banco-central/areas/politica-monetaria/informe-de-politica-monetaria")
links(r, r"xls|ipom|proyecc")
r = get("https://www.bcentral.cl/web/banco-central/areas/encuestas-economicas/encuesta-expectativas-economicas")
hits = links(r, r"xls|eee|expectativas")
r = get("https://www.bcentral.cl/web/banco-central/areas/politica-monetaria/informe-de-politica-monetaria/proyecciones-del-ipom")
links(r, r"xls|proyecc")
sys.exit(0)
