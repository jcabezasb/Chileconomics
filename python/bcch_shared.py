"""Registro de series del Banco Central de Chile (BDE) que usa el sitio.

Cada entrada de SERIES_CONFIG queda como una clave en public/data/bcch_series.json; el frontend
las referencia por esa clave (ver src/data/bcch/seriesKeys.js). Para agregar una serie:
1. Sumarla a NATIONAL_SERIES (o a la tabla de regiones si es regional).
2. Correr `npm run sync-data` (o esperar la sincronización diaria de GitHub Actions).
3. Usar la clave en el frontend.
"""

# Frecuencias: D diaria, M mensual, T trimestral, A anual.
NATIONAL_SERIES = {
    # Cuentas nacionales (miles de millones de pesos, referencia 2018)
    "pib_total": ("F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T", "PIB Nominal", "T"),
    "pib_real": ("F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T", "PIB Real Nacional", "T"),
    "consumo_privado": ("F033.CPR.FLU.N.CLP.EP18.0.T", "Consumo Privado", "T"),
    "gasto_gob_nominal": ("F033.COG.FLU.N.CLP.EP18.0.T", "Gasto de Gobierno", "T"),
    "inversion": ("F033.FKF.FLU.N.CLP.EP18.0.T", "Inversion (FBKF)", "T"),
    "existencias": ("F033.VAX.FLU.N.CLP.EP18.0.T", "Variacion Existencias", "T"),
    "exportaciones": ("F033.XBS.FLU.N.CLP.EP18.0.T", "Exportaciones", "T"),
    "importaciones": ("F033.IBS.FLU.N.CLP.EP18.0.T", "Importaciones", "T"),
    # Precios
    "ipc_general": ("G073.IPC.IND.2023.M", "IPC General", "M"),
    "ipc_core": ("G073.IPCSV.IND.2023.M", "IPC Subyacente", "M"),
    "ipc_volatile": ("G073.IPCV.IND.2023.M", "IPC Volatil", "M"),
    # Tipo de cambio y commodities
    "dolar": ("F073.TCO.PRE.Z.D", "Dolar Observado", "D"),
    "tcr": ("F073.TCR.IND.199101.M", "Tipo de cambio real", "M"),
    "tcr_5": ("F073.TR5.IND.198601.M", "Tipo de cambio real TCR-5", "M"),
    "tc_cny": ("F072.CLP.CNY.N.O.D", "Tipo de cambio Yuan", "D"),
    "tc_eur": ("F072.CLP.EUR.N.O.D", "Tipo de cambio Euro", "D"),
    "tc_ars": ("F072.CLP.ARS.N.O.D", "Tipo de cambio Peso Argentino", "D"),
    "tc_jpy": ("F072.CLP.JPY.N.O.D", "Tipo de cambio Yen", "D"),
    "cobre": ("F019.PPB.PRE.100.D", "Precio del Cobre", "D"),
    # Mercado laboral
    "desempleo": ("F049.DES.TAS.INE9.10.M", "Desempleo", "M"),
    # Actividad (IMACEC, índice 2018=100)
    "imacec": ("F032.IMC.IND.Z.Z.EP18.Z.Z.0.M", "IMACEC", "M"),
    "imacec_bienes": ("F032.IMC.IND.Z.Z.EP18.PB.Z.0.M", "Produccion de bienes", "M"),
    "imacec_mineria": ("F032.IMC.IND.Z.Z.EP18.03.Z.0.M", "Mineria", "M"),
    "imacec_industria": ("F032.IMC.IND.Z.Z.EP18.04.Z.0.M", "Industria", "M"),
    "imacec_resto_bienes": ("F032.IMC.IND.Z.Z.EP18.RB.Z.0.M", "Resto de bienes", "M"),
    "imacec_comercio": ("F032.IMC.IND.Z.Z.EP18.COM.Z.0.M", "Comercio", "M"),
    "imacec_servicios": ("F032.IMC.IND.Z.Z.EP18.SERV.Z.0.M", "Servicios", "M"),
    "imacec_no_minero": ("F032.IMC.IND.Z.Z.EP18.N03.Z.0.M", "IMACEC no minero", "M"),
    # Población (INE, anual, incluye proyecciones)
    "pob_total": ("F049.POB.STO.INE1.01.A", "Poblacion total nacional", "A"),
    "pob_mujeres": ("F049.POB.STO.INE1.03.A", "Poblacion mujeres nacional", "A"),
    "pob_hombres": ("F049.POB.STO.INE1.02.A", "Poblacion hombres nacional", "A"),
}

# Regiones y sus códigos en el BDE, que no siguen un único estándar:
# (id, nombre, código PIB, código población, código fuerza de trabajo, código ocupados/desocupación,
#  segmento de las series de PIB por actividad: 'Z' salvo Tarapacá, que usa '21').
REGIONS = [
    ("XV", "Arica y Parinacota", "15", "AP", "RAP", "25", "Z"),
    ("I", "Tarapaca", "01", "TA", "RTA", "11", "21"),
    ("II", "Antofagasta", "02", "AN", "RAN", "12", "Z"),
    ("III", "Atacama", "03", "AT", "RAT", "13", "Z"),
    ("IV", "Coquimbo", "04", "CO", "RCO", "14", "Z"),
    ("V", "Valparaiso", "05", "VA", "RVA", "15", "Z"),
    ("RM", "Metropolitana", "13", "RM", "RRM", "23", "Z"),
    ("VI", "O'Higgins", "06", "LI", "RLI", "16", "Z"),
    ("VII", "Maule", "07", "ML", "RML", "17", "Z"),
    ("XVI", "Nuble", "16", "NB", "RNB", "26", "Z"),
    ("VIII", "Biobio", "08", "BI", "RBI", "18N", "Z"),
    ("IX", "La Araucania", "09", "AR", "RAR", "19", "Z"),
    ("XIV", "Los Rios", "14", "LR", "RLR", "24", "Z"),
    ("X", "Los Lagos", "10", "LL", "RLL", "20", "Z"),
    ("XI", "Aysen", "11", "AI", "RAI", "21", "Z"),
    ("XII", "Magallanes", "12", "MA", "RMA", "22", "Z"),
]

# Actividades del PIB regional: clave -> código BDE.
PIB_ACTIVITIES = {
    "bienes": "PB",
    "mineria": "03",
    "industria": "04",
    "resto": "RB",
    "comercio": "COM",
    "servicios": "SERV",
}


def _regional_series(region):
    region_id, name, pib_code, pob_code, ftr_code, labor_code, activity_segment = region
    series = {
        f"pib_reg_{region_id}": (f"F035.PIB.FLU.R.CLP.2018.Z.Z.Z.{pib_code}.0.T", f"PIB {name}", "T"),
        f"pob_reg_{region_id}": (f"F049.POB{pob_code}.STO.INE.AT.A", f"Poblacion {name}", "A"),
        f"pob_reg_{region_id}_m": (f"F049.POB{pob_code}.STO.INE.MT.A", f"Poblacion Mujeres {name}", "A"),
        f"pob_reg_{region_id}_h": (f"F049.POB{pob_code}.STO.INE.HT.A", f"Poblacion Hombres {name}", "A"),
        f"labor_ftr_reg_{region_id}": (f"F049.FTR.STO.INE9.{ftr_code}.M", f"Fuerza de trabajo {name}", "M"),
        f"labor_ocu_reg_{region_id}": (f"F049.OCU.PMT.INE9.{labor_code}.M", f"Ocupados {name}", "M"),
        f"labor_des_reg_{region_id}": (f"F049.DES.TAS.INE9.{labor_code}.M", f"Desocupacion {name}", "M"),
    }
    for activity, code in PIB_ACTIVITIES.items():
        series[f"pib_reg_{region_id}_{activity}"] = (
            f"F035.PIB.FLU.R.CLP.2018.{code}.{activity_segment}.Z.{pib_code}.0.T",
            f"PIB {activity} {name}",
            "T",
        )
    return series


def build_series_config():
    """Todas las series a sincronizar: {clave: {"id", "name", "frequency"}}."""
    entries = dict(NATIONAL_SERIES)
    for region in REGIONS:
        entries.update(_regional_series(region))
    return {
        key: {"id": series_id, "name": name, "frequency": frequency}
        for key, (series_id, name, frequency) in entries.items()
    }


SERIES_CONFIG = build_series_config()


def parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_dataframe(df):
    """DataFrame de bcchapi -> [{"date": "YYYY-MM-DD", "value": float | None}]."""
    if df is None:
        return []

    if hasattr(df, "reset_index"):
        df = df.reset_index()

    records = []
    for _, row in df.iterrows():
        date = None
        for column in ("index", "fecha", "date"):
            if column in row:
                date = row[column]
                break

        value = None
        if "value" in row:
            value = row["value"]
        elif len(row) > 1:
            value = row.iloc[1]

        if date is not None and hasattr(date, "strftime"):
            date = date.strftime("%Y-%m-%d")

        records.append({"date": date, "value": parse_float(value)})

    return records
