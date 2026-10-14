"""Pruebas de la búsqueda por título en el catálogo del Banco Central."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from buscar_series import coincide  # noqa: E402

SERIE = {
    "seriesId": "X.1",
    "spanishTitle": "Inversión directa en Chile, Canadá",
    "englishTitle": "Direct investment in Chile, Canada",
}


def test_ignora_tildes_y_mayusculas():
    assert coincide(SERIE, ["INVERSION", "canada"])


def test_exige_todas_las_palabras():
    assert not coincide(SERIE, ["inversion", "japon"])


def test_busca_tambien_en_ingles():
    assert coincide(SERIE, ["direct investment"])
