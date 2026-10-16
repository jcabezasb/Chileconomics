"""Pruebas del importador de proyecciones (IPoM y FMI) con datos armados en la prueba."""

import os
import sys
from datetime import datetime

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_proyecciones as ip  # noqa: E402


@pytest.mark.parametrize("value, expected", [
    ("4,5 - 5,5", [4.5, 5.5]),
    ("4,25-5,25", [4.25, 5.25]),
    ("3,0- 4,0", [3.0, 4.0]),
    ("-2,5 / -1,5", [-2.5, -1.5]),
    ("-7,5/-5,5", [-7.5, -5.5]),
    ("-0,5 /0", [-0.5, 0.0]),
    ("2 / 2,75", [2.0, 2.75]),
    ("5,2", [5.2, 5.2]),
    (2.2829615, [2.28, 2.28]),
    (-0.0478, [-0.05, -0.05]),
    (None, None),
    ("s/i", None),
])
def test_parse_range(value, expected):
    assert ip.parse_range(value) == expected


def test_find_ipom_link():
    html = (
        '<a href="/documents/1/2/IPoM Septiembre 2026.pdf/x">pdf</a>'
        '<a href="/documents/33528/8620949/Proyecciones IPoM 2010-2028 Septiembre 2026.xlsx/aac0">xlsx</a>'
    )
    assert ip.find_ipom_link(html) == (
        "https://www.bcentral.cl/documents/33528/8620949/Proyecciones%20IPoM%202010-2028%20Septiembre%202026.xlsx/aac0"
    )
    assert ip.find_ipom_link('<a href="/otro.xlsx">x</a>') is None


def ipom_rows():
    """Hoja como la del Banco Central: bloques por año proyectado, una columna por IPoM."""
    return [
        ["IPOM", None, "Año de proyección", None, None, None, "Año de proyección", None, None],
        [None, None, 2025, None, None, None, 2026, None, None],
        [None, None, datetime(2024, 9, 1), datetime(2025, 3, 1), datetime(2025, 12, 1), None,
         datetime(2025, 3, 1), datetime(2026, 9, 26), None],
        ["Variables (*)", None, None, None, None, None, None, None, None],
        ["PIB", None, "1,5 / 2,5", "1,75 /2,75", 2.4, None, None, "0,25 / 0,75", None],
        ["Ingreso nacional", None, 3, 3, 3, None, 3, 3, None],
    ]


def test_parse_ipom_groups_by_report():
    vintages = ip.parse_ipom(ipom_rows())
    assert [v["date"] for v in vintages] == ["2024-09-01", "2025-03-01", "2025-12-01", "2026-09-01"]
    assert vintages[0] == {"date": "2024-09-01", "label": "IPoM septiembre 2024", "values": {"2025": [1.5, 2.5]}}
    # El IPoM de marzo 2025 proyecta 2025; para 2026 la celda está vacía y no se inventa nada.
    assert vintages[1]["values"] == {"2025": [1.75, 2.75]}
    assert vintages[2]["values"] == {"2025": [2.4, 2.4]}
    assert vintages[3] == {"date": "2026-09-01", "label": "IPoM septiembre 2026", "values": {"2026": [0.25, 0.75]}}


def test_parse_ipom_requires_rows():
    with pytest.raises(ValueError):
        ip.parse_ipom([["Otra cosa", 1, 2]])


WEO_XML = """<?xml version='1.0' encoding='UTF-8'?>
<message:StructureSpecificData xmlns:message="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message">
<message:DataSet PUBLICATION_DATE="2026-10-13T02:00:00Z" action="Replace">
<Series COUNTRY="CHL" INDICATOR="NGDP_RPCH" FREQUENCY="A">
<Obs TIME_PERIOD="2025" OBS_VALUE="2.459255"/>
<Obs TIME_PERIOD="2026" OBS_VALUE="0.605295"/>
<Obs TIME_PERIOD="2027" OBS_VALUE="2.610688"/>
<Obs TIME_PERIOD="2028" OBS_VALUE="NaN"/>
</Series></message:DataSet></message:StructureSpecificData>"""


def test_parse_weo():
    values, published = ip.parse_weo(WEO_XML)
    assert values == {"2025": 2.46, "2026": 0.61, "2027": 2.61}
    assert published == "2026-10-13"


def test_weo_vintage_from_name_and_publication():
    values = {"2025": 2.5, "2026": 2.0}
    assert ip.weo_vintage("WEO_2025_OCT_VINTAGE", values, None) == {
        "date": "2025-10-01", "label": "WEO octubre 2025", "values": {"2025": 2.5, "2026": 2.0},
    }
    # La edición vigente se identifica por su fecha de publicación; los años ya cerrados no se guardan.
    assert ip.weo_vintage("WEO", values, "2026-10-13") == {
        "date": "2026-10-01", "label": "WEO octubre 2026", "values": {"2026": 2.0},
    }
    assert ip.weo_vintage("WEO", values, None) is None
    assert ip.weo_vintage("WEO_RARO", values, None) is None


def test_weo_flows():
    xml = ('<str:Dataflow id="WEO" version="9.0.0"/><str:Dataflow id="WEO" version="6.0.0"/>'
           '<str:Dataflow id="WEO_2026_APR_VINTAGE" version="1.0.0"/><str:Dataflow id="PCPS" version="9.0.0"/>')
    assert ip.weo_flows(xml) == [("WEO", "6.0.0"), ("WEO", "9.0.0"), ("WEO_2026_APR_VINTAGE", "1.0.0")]
