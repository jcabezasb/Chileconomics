import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler

import bcchapi

from bcch_shared import SERIES_CONFIG_BUNDLE, normalize_dataframe


def _block_production(handler):
    if os.environ.get("VERCEL_ENV") == "production":
        _build_response(handler, 403, {"error": "forbidden"})
        return True

    return False



def _build_response(handler, status, payload):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
    handler.end_headers()
    handler.wfile.write(json.dumps(payload).encode("utf-8"))


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if _block_production(self):
            return

        user = os.environ.get("BCCH_USER")
        password = os.environ.get("BCCH_PASSWORD")

        if not user or not password:
            _build_response(self, 500, {"error": "missing BCCH_USER or BCCH_PASSWORD"})
            return

        try:
            siete = bcchapi.Siete(user, password)
            payload = {}

            for key, config in SERIES_CONFIG_BUNDLE.items():
                df = siete.cuadro(series=[config["id"]], nombres=["value"])
                records = normalize_dataframe(df)
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
