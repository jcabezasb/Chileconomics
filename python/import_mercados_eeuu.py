"""Descarga tasas y precios de mercado de EE.UU. y genera public/data/mercados_eeuu.json, que usa la
sección Mercados (junto con las series de Chile de bcch_series.json).

Uso: npm run import-mercados-eeuu

Corre solo en la sincronización diaria de GitHub (no necesita credenciales: las fuentes son públicas).

Fuentes (todas diarias, porcentaje anual salvo los índices):
  - Departamento del Tesoro: curva de bonos del Tesoro (1, 2, 3, 5 y 10 años) y curva real de los
    bonos indexados a la inflación, TIPS (5 y 10 años). Un CSV por año.
  - Fed de Nueva York: tasa efectiva de fondos federales (EFFR) y rango meta de la Fed.
  - FRED (Fed de St. Louis): índice amplio del dólar (Reserva Federal) y VIX (Cboe).

Con historia ya guardada solo se vuelven a bajar los dos últimos años (el Tesoro corrige días
recientes); lo anterior se conserva. Si una fuente falla se conserva su versión anterior; si fallan
todas, no se escribe nada y el script termina con error.
"""

import csv
import io
import json
import os
import sys
from datetime import date, datetime

import requests

OUTPUT_PATH = os.path.join("public", "data", "mercados_eeuu.json")
START = "2015-01-01"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Chileconomics/1.0; +https://chileconomics.cl)"}
TIMEOUT = 120

TREASURY_URL = ("https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/"
                "{year}/all?type={kind}&field_tdr_date_value={year}&page&_format=csv")
NYFED_URL = "https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate={start}&endDate={end}"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={id}&cosd={start}"

# Fuente -> (clave en el JSON, columna o código en la fuente).
TREASURY_NOMINAL = {"ust_1": "1 Yr", "ust_2": "2 Yr", "ust_3": "3 Yr", "ust_5": "5 Yr", "ust_10": "10 Yr"}
TREASURY_REAL = {"tips_5": "5 YR", "tips_10": "10 YR"}
FRED = {"dolar_global": "DTWEXBGS", "vix": "VIXCLS"}

SOURCES = {
    "treasury": {"name": "Departamento del Tesoro de EE.UU.", "url": "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"},
    "nyfed": {"name": "Fed de Nueva York", "url": "https://www.newyorkfed.org/markets/reference-rates/effr"},
    "fred": {"name": "FRED, Fed de St. Louis", "url": "https://fred.stlouisfed.org"},
}


def to_number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def parse_treasury_csv(text, columns):
    """CSV del Tesoro (fechas MM/DD/YYYY) -> {clave: {fecha ISO: valor}} para las columnas pedidas."""
    out = {key: {} for key in columns}
    for row in csv.DictReader(io.StringIO(text)):
        day = datetime.strptime(row["Date"], "%m/%d/%Y").date().isoformat()
        for key, column in columns.items():
            value = to_number(row.get(column))
            if value is not None:
                out[key][day] = value
    return out


def parse_effr(payload):
    """Respuesta de la API del NY Fed -> tasa efectiva y límites del rango meta, por fecha."""
    out = {"effr": {}, "fed_low": {}, "fed_high": {}}
    for rate in payload.get("refRates", []):
        day = rate.get("effectiveDate")
        for key, field in (("effr", "percentRate"), ("fed_low", "targetRateFrom"), ("fed_high", "targetRateTo")):
            value = to_number(rate.get(field))
            if day and value is not None:
                out[key][day] = value
    return out


def parse_fred_csv(text):
    """CSV de FRED (observation_date, valor; "." si no hay dato) -> {fecha: valor}."""
    reader = csv.reader(io.StringIO(text))
    next(reader, None)
    return {row[0]: float(row[1]) for row in reader if len(row) == 2 and to_number(row[1]) is not None}


def get(url):
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return response


def years_to_fetch(previous_series, today):
    """Todos los años desde START si no hay historia; si la hay, solo el año pasado y el actual."""
    first = int(START[:4]) if not previous_series else today.year - 1
    return range(first, today.year + 1)


def load_treasury(kind, columns, previous, today):
    known = {key: dict(previous.get(key, {})) for key in columns}
    for year in years_to_fetch(any(known.values()), today):
        text = get(TREASURY_URL.format(year=year, kind=kind)).text
        for key, values in parse_treasury_csv(text, columns).items():
            known[key].update(values)
    if not all(known.values()):
        raise ValueError(f"El Tesoro no entregó datos de {kind}")
    return known


def load_nyfed(previous, today):
    known = {key: dict(previous.get(key, {})) for key in ("effr", "fed_low", "fed_high")}
    start = "2016-03-01" if not known["effr"] else f"{today.year - 1}-01-01"
    for key, values in parse_effr(get(NYFED_URL.format(start=start, end=today.isoformat())).json()).items():
        known[key].update(values)
    if not known["effr"]:
        raise ValueError("La API del NY Fed no entregó la tasa efectiva")
    return known


def load_fred(previous, today):
    out = {}
    for key, code in FRED.items():
        values = parse_fred_csv(get(FRED_URL.format(id=code, start=START)).text)
        if not values:
            raise ValueError(f"FRED no entregó {code}")
        out[key] = values
    return out


def load_previous():
    if not os.path.exists(OUTPUT_PATH):
        return {"series": {}, "sources": {}}
    with open(OUTPUT_PATH, encoding="utf-8") as file:
        payload = json.load(file)
    series = {key: {p["date"]: p["value"] for p in entry["data"]} for key, entry in payload.get("series", {}).items()}
    return {"series": series, "sources": payload.get("sources", {})}


def main():
    today = date.today()
    previous = load_previous()
    series, sources, failures = {}, {}, 0
    loaders = {
        "treasury": lambda: {
            **load_treasury("daily_treasury_yield_curve", TREASURY_NOMINAL, previous["series"], today),
            **load_treasury("daily_treasury_real_yield_curve", TREASURY_REAL, previous["series"], today),
        },
        "nyfed": lambda: load_nyfed(previous["series"], today),
        "fred": lambda: load_fred(previous["series"], today),
    }
    for source, loader in loaders.items():
        try:
            loaded = loader()
            series.update(loaded)
            sources[source] = {**SOURCES[source], "checked_at": today.isoformat(), "series": sorted(loaded)}
            print(f"{source}: {', '.join(f'{k} hasta {max(v)}' for k, v in loaded.items())}")
        except (requests.RequestException, ValueError, KeyError) as error:
            failures += 1
            print(f"{source}: ERROR {error}")
            kept = previous["sources"].get(source)
            if kept:
                sources[source] = kept
                series.update({key: previous["series"][key] for key in kept["series"] if key in previous["series"]})
                print(f"{source}: se conserva la versión anterior")
    if failures == len(loaders):
        print("Fallaron todas las fuentes: no se escribe el archivo.")
        return 1
    payload = {
        "sources": sources,
        "series": {
            key: {"data": [{"date": day, "value": round(value, 4)} for day, value in sorted(values.items()) if day >= START]}
            for key, values in sorted(series.items())
        },
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    temporary = f"{OUTPUT_PATH}.tmp"
    with open(temporary, "w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporary, OUTPUT_PATH)
    print(f"Datos guardados en {OUTPUT_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
