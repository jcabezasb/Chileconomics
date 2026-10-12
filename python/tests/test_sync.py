"""Pruebas de la configuración de series y de la sincronización (sin llamar a la API real)."""

import json
import os
import sys

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import bcch_shared  # noqa: E402
import sync_bcch_data  # noqa: E402


def test_config_keys_and_ids_are_unique():
    config = bcch_shared.SERIES_CONFIG
    ids = [entry["id"] for entry in config.values()]
    assert len(ids) == len(set(ids))
    assert len(config) == len(bcch_shared.NATIONAL_SERIES) + len(bcch_shared.REGIONS) * (7 + len(bcch_shared.PIB_ACTIVITIES))


def test_regional_codes_follow_bde_patterns():
    config = bcch_shared.SERIES_CONFIG
    assert config["pib_reg_RM"]["id"] == "F035.PIB.FLU.R.CLP.2018.Z.Z.Z.13.0.T"
    assert config["pob_reg_RM_m"]["id"] == "F049.POBRM.STO.INE.MT.A"
    assert config["labor_ocu_reg_VIII"]["id"] == "F049.OCU.PMT.INE9.18N.M"
    assert config["pib_reg_I_mineria"]["id"] == "F035.PIB.FLU.R.CLP.2018.03.21.Z.01.0.T"


def test_frontend_keys_exist_in_config():
    """Las claves que usa src/data/bcch/seriesKeys.js deben estar en la configuración."""
    keys_file = os.path.join(os.path.dirname(__file__), "..", "..", "src", "data", "bcch", "seriesKeys.js")
    with open(keys_file, encoding="utf-8") as file:
        source = file.read()
    national = [line.split("'")[1] for line in source.split("export const SERIES")[1].split("};")[0].splitlines() if "'" in line]
    missing = [key for key in national if key not in bcch_shared.SERIES_CONFIG]
    assert not missing


def frame(values):
    index = pd.to_datetime([date for date, _ in values])
    return pd.DataFrame({"value": [value for _, value in values]}, index=index)


class FakeSiete:
    def __init__(self, responses):
        self.responses = responses

    def cuadro(self, series, nombres):
        response = self.responses.get(series[0])
        if isinstance(response, Exception):
            raise response
        return response


@pytest.fixture
def run_sync(tmp_path, monkeypatch):
    output = tmp_path / "bcch_series.json"
    monkeypatch.setattr(sync_bcch_data, "OUTPUT_PATH", str(output))
    monkeypatch.setattr(sync_bcch_data, "RETRIES", 0)
    monkeypatch.setattr(sync_bcch_data, "load_dotenv", lambda: None)
    monkeypatch.setenv("BCCH_USER", "usuario")
    monkeypatch.setenv("BCCH_PASSWORD", "clave")
    monkeypatch.setattr(sync_bcch_data, "SERIES_CONFIG", {
        "a": {"id": "ID.A", "name": "A", "frequency": "M"},
        "b": {"id": "ID.B", "name": "B", "frequency": "M"},
    })

    def run(responses, previous=None):
        if previous is not None:
            output.write_text(json.dumps({"series": previous}))
        monkeypatch.setattr(sync_bcch_data.bcchapi, "Siete", lambda user, password: FakeSiete(responses))
        code = sync_bcch_data.sync_data()
        data = json.loads(output.read_text()) if output.exists() else None
        return code, data

    return run


def test_sync_writes_all_series(run_sync):
    code, data = run_sync({
        "ID.A": frame([("2024-01-01", None), ("2024-02-01", 1.123456789)]),
        "ID.B": frame([("2024-01-01", 5)]),
    })
    assert code == 0
    assert data["series"]["a"]["data"] == [{"date": "2024-02-01", "value": 1.123457}]
    assert data["series"]["b"]["data"] == [{"date": "2024-01-01", "value": 5.0}]


def test_failed_series_keeps_previous_data(run_sync):
    previous = {"a": {"data": [{"date": "2023-01-01", "value": 1}]}, "b": {"data": [{"date": "2023-01-01", "value": 2}]}}
    # 1 de 2 falla = 50% > umbral: no se escribe
    code, data = run_sync({"ID.A": RuntimeError("caída"), "ID.B": frame([("2024-01-01", 3)])}, previous)
    assert code == 1
    assert data["series"] == previous


def test_failed_series_below_threshold_is_preserved(run_sync, monkeypatch):
    monkeypatch.setattr(sync_bcch_data, "MAX_FAILURE_SHARE", 0.6)
    previous = {"a": {"data": [{"date": "2023-01-01", "value": 1}]}, "b": {"data": [{"date": "2023-01-01", "value": 2}]}}
    code, data = run_sync({"ID.A": RuntimeError("caída"), "ID.B": frame([("2024-01-01", 3)])}, previous)
    assert code == 0
    assert data["series"]["a"]["data"] == [{"date": "2023-01-01", "value": 1}]
    assert data["series"]["b"]["data"] == [{"date": "2024-01-01", "value": 3.0}]


def test_missing_credentials_fails(run_sync, monkeypatch):
    monkeypatch.delenv("BCCH_USER")
    assert sync_bcch_data.sync_data() == 1
