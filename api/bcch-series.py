import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import bcchapi


def _build_response(handler, status, payload):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "s-maxage=300, stale-while-revalidate=600")
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
        query = parse_qs(urlparse(self.path).query)
        series = query.get("series", [None])[0]
        start = query.get("desde", [None])[0]
        end = query.get("hasta", [None])[0]
        frequency = query.get("frecuencia", [None])[0]
        last = query.get("last", [None])[0]

        if not series:
            _build_response(self, 400, {"error": "missing series parameter"})
            return

        user = os.environ.get("BCCH_USER")
        password = os.environ.get("BCCH_PASSWORD")

        if not user or not password:
            _build_response(self, 500, {"error": "missing BCCH_USER or BCCH_PASSWORD"})
            return

        try:
            siete = bcchapi.Siete(user, password)
            kwargs = {}
            if start:
                kwargs["desde"] = start
            if end:
                kwargs["hasta"] = end
            if frequency:
                kwargs["frecuencia"] = frequency

            df = siete.cuadro(series=[series], nombres=["value"], **kwargs)
            records = _normalize_dataframe(df)
            latest = None
            for entry in reversed(records):
                if entry.get("value") is not None:
                    latest = entry
                    break

            if last == "1" or last == "true":
                _build_response(self, 200, {"series": series, "latest": latest})
                return

            _build_response(self, 200, {"series": series, "data": records, "latest": latest})
        except Exception as error:
            _build_response(self, 500, {"error": str(error)})
