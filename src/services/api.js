const mockIndicators = [
    {
        id: "imacec",
        title: "IMACEC",
        value: "1.2%",
        variation: "+0.3%",
        trend: "up",
        period: "Ene 2024",
        description: "Indicador Mensual de Actividad Económica"
    },
    {
        id: "ipc",
        title: "IPC (12 meses)",
        value: "3.8%",
        variation: "-0.1%",
        trend: "down",
        period: "Feb 2024",
        description: "Inflación anual"
    },
    {
        id: "tpm",
        title: "TPM",
        value: "7.25%",
        variation: "-100pb",
        trend: "down",
        period: "Reunión Ene",
        description: "Tasa de Política Monetaria"
    },
    {
        id: "dolar",
        title: "Dólar Obs.",
        value: "$980",
        variation: "+$12",
        trend: "up",
        period: "Hoy",
        description: "Tipo de cambio USD/CLP"
    },
    {
        id: "cobre",
        title: "Cobre",
        value: "$3.85",
        variation: "+0.5%",
        trend: "up",
        period: "Hoy",
        description: "USD/Libra Bolsa Metales"
    },
    {
        id: "desempleo",
        title: "Desempleo",
        value: "8.5%",
        variation: "+0.1%",
        trend: "up",
        period: "Trimestre Movil",
        description: "Tasa de desocupación nacional"
    }
];

const mockGDPComponents = [
    { name: "Consumo Hogares", share: 60, growth: 2.1 },
    { name: "Gobierno", share: 15, growth: 1.5 },
    { name: "Inversión", share: 22, growth: -3.0 },
    { name: "Exportaciones Netas", share: 3, growth: 5.0 }
];

const mockChartData = (indicatorId) => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    let base = 5;
    let volatility = 1;

    switch (indicatorId) {
        case "imacec": base = 1.0; volatility = 0.5; break;
        case "ipc": base = 3.5; volatility = 0.3; break;
        case "tpm": base = 8.0; volatility = 0.75; break;
        case "dolar": base = 950; volatility = 20; break;
        case "cobre": base = 3.8; volatility = 0.2; break;
        case "desempleo": base = 8.5; volatility = 0.4; break;
        default: base = 5; break;
    }

    return months.map((m, i) => {
        let val = base + (Math.random() * volatility - volatility / 2);
        if (indicatorId === "tpm") val -= (i * 0.1);
        if (indicatorId === "imacec") val += (i * 0.05);
        return {
            name: m,
            value: Number(val.toFixed(2))
        };
    });
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const formatNumber = (value, options = {}) => {
    const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits,
        maximumFractionDigits
    }).format(value);
};

const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const parseDateParts = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split('-');
    if (!year || !month) return null;
    return {
        year,
        month: Number(month),
        day: day ? Number(day) : null
    };
};

const formatMonthLabel = (date) => {
    const parts = parseDateParts(date);
    if (!parts || !parts.month) return '';
    const mon = monthShort[parts.month - 1] || '';
    return `${mon} ${parts.year}`;
};

const formatDayLabel = (date) => {
    const parts = parseDateParts(date);
    if (!parts || !parts.day) return '';
    const mon = monthShort[parts.month - 1] || '';
    const day = String(parts.day).padStart(2, '0');
    return `${day}-${mon}`;
};

const fetchData = async (url, fallback) => {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`);
        if (!response.ok) throw new Error("Request failed");
        const payload = await response.json();
        return payload?.data ?? fallback;
    } catch (error) {
        return fallback;
    }
};

export const getKeyIndicators = async () => {
    const bcchData = await loadBcchData();
    if (bcchData) {
        const ipcSeries = bcchData.ipc_index?.data || [];
        const dolarSeries = bcchData.dolar?.data || [];
        const cobreSeries = bcchData.cobre?.data || [];
        const desempleoSeries = bcchData.desempleo?.data || [];

        const ipcYoY = buildYoYFromIndex(ipcSeries, 12);
        const ipcLatest = ipcYoY[ipcYoY.length - 1];
        const ipcPrev = ipcYoY.length > 1 ? ipcYoY[ipcYoY.length - 2] : null;
        const ipcDelta = ipcLatest && ipcPrev ? ipcLatest.value - ipcPrev.value : null;

        const dolarLatest = dolarSeries[dolarSeries.length - 1];
        const dolarPrev = dolarSeries.length > 1 ? dolarSeries[dolarSeries.length - 2] : null;
        const dolarDelta = dolarLatest && dolarPrev ? dolarLatest.value - dolarPrev.value : null;

        const cobreLatest = cobreSeries[cobreSeries.length - 1];
        const cobrePrev = cobreSeries.length > 1 ? cobreSeries[cobreSeries.length - 2] : null;
        const cobreDelta = cobreLatest && cobrePrev && cobrePrev.value
            ? ((cobreLatest.value - cobrePrev.value) / cobrePrev.value) * 100
            : null;

        const desempleoLatest = desempleoSeries[desempleoSeries.length - 1];
        const desempleoPrev = desempleoSeries.length > 1 ? desempleoSeries[desempleoSeries.length - 2] : null;
        const desempleoDelta = desempleoLatest && desempleoPrev
            ? desempleoLatest.value - desempleoPrev.value
            : null;

        if (ipcLatest && dolarLatest && cobreLatest && desempleoLatest) {
            return [
                {
                    id: 'ipc',
                    title: 'IPC (12 meses)',
                    value: `${formatNumber(ipcLatest.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
                    variation: ipcDelta === null
                        ? ''
                        : `${ipcDelta >= 0 ? '+' : ''}${formatNumber(ipcDelta, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
                    trend: ipcDelta === null ? 'neutral' : (ipcDelta >= 0 ? 'up' : 'down'),
                    period: formatMonthLabel(ipcLatest.date),
                    description: 'Inflacion anual'
                },
                {
                    id: 'dolar',
                    title: 'Dolar Obs.',
                    value: `$${formatNumber(dolarLatest.value, { maximumFractionDigits: 0 })}`,
                    variation: dolarDelta === null
                        ? ''
                        : `${dolarDelta >= 0 ? '+' : ''}$${formatNumber(Math.abs(dolarDelta), { maximumFractionDigits: 0 })}`,
                    trend: dolarDelta === null ? 'neutral' : (dolarDelta >= 0 ? 'up' : 'down'),
                    period: formatDayLabel(dolarLatest.date) || 'Hoy',
                    description: 'Tipo de cambio USD/CLP'
                },
                {
                    id: 'cobre',
                    title: 'Cobre',
                    value: `$${formatNumber(cobreLatest.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    variation: cobreDelta === null
                        ? ''
                        : `${cobreDelta >= 0 ? '+' : ''}${formatNumber(cobreDelta, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
                    trend: cobreDelta === null ? 'neutral' : (cobreDelta >= 0 ? 'up' : 'down'),
                    period: formatDayLabel(cobreLatest.date) || 'Hoy',
                    description: 'USD/Libra Bolsa Metales'
                },
                {
                    id: 'desempleo',
                    title: 'Desempleo',
                    value: `${formatNumber(desempleoLatest.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
                    variation: desempleoDelta === null
                        ? ''
                        : `${desempleoDelta >= 0 ? '+' : ''}${formatNumber(desempleoDelta, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}pp`,
                    trend: desempleoDelta === null ? 'neutral' : (desempleoDelta >= 0 ? 'up' : 'down'),
                    period: formatMonthLabel(desempleoLatest.date),
                    description: 'Tasa de desocupacion nacional'
                }
            ];
        }
    }

    return fetchData("/api/indicators", mockIndicators);
};

export const getGDPComponents = async () => {
    return fetchData("/api/gdp-components", mockGDPComponents);
};

const formatChartLabel = (date) => {
    if (!date) return '';
    return date.length >= 7 ? date.substring(0, 7) : date;
};

const buildYoYFromIndex = (series, lag = 12) => {
    const valid = (series || []).filter((entry) => entry && entry.value !== null && entry.value !== undefined);
    return valid.map((entry, index) => {
        const previous = index - lag >= 0 ? valid[index - lag] : null;
        const yoy = previous && previous.value
            ? ((entry.value - previous.value) / previous.value) * 100
            : null;
        return {
            date: entry.date,
            value: yoy
        };
    }).filter((entry) => entry.value !== null);
};

export const getChartData = async (indicatorId) => {
    const bcchData = await loadBcchData();
    const keyMap = {
        ipc: 'ipc_index',
        dolar: 'dolar',
        cobre: 'cobre',
        desempleo: 'desempleo'
    };

    const key = keyMap[indicatorId];
    if (bcchData && key && bcchData[key]) {
        const raw = bcchData[key].data || [];
        let series = raw;

        if (indicatorId === 'ipc') {
            series = buildYoYFromIndex(raw, 12);
        }

        return series
            .filter((entry) => entry && entry.value !== null && entry.value !== undefined)
            .map((entry) => ({
                name: formatChartLabel(entry.date),
                date: entry.date,
                value: entry.value
            }));
    }

    return fetchData(`/api/chart?id=${encodeURIComponent(indicatorId)}`, mockChartData(indicatorId));
};

// Mapeo de IDs de series a claves en el JSON
const SERIES_KEY_MAP = {
    'F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T': 'pib_real',
    'F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T': 'pib_nominal',
    'F033.CPR.FLU.N.CLP.EP18.0.T': 'consumo_privado',
    'F033.COG.FLU.N.CLP.EP18.0.T': 'gasto_gob_nominal',
    'F033.FKF.FLU.N.CLP.EP18.0.T': 'fbkf_nominal',
    'F033.VAX.FLU.N.CLP.EP18.0.T': 'existencias_nominal',
    'F033.XBS.FLU.N.CLP.EP18.0.T': 'export_nominal',
    'F033.IBS.FLU.N.CLP.EP18.0.T': 'import_nominal',
    'F073.TCO.PRE.Z.D': 'dolar',
    'F074.IPC.IND.Z.EP23.C.M': 'ipc_index',
    'F019.PPB.PRE.100.D': 'cobre',
    'F049.DES.TAS.INE9.10.M': 'desempleo',
    // Población Nacional
    'F049.POB.STO.INE1.01.A': 'pob_total',
    'F049.POB.STO.INE1.03.A': 'pob_mujeres',
    'F049.POB.STO.INE1.02.A': 'pob_hombres',
    // Regionales - PIB
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.15.0.T': 'pib_reg_XV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.01.0.T': 'pib_reg_I',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.02.0.T': 'pib_reg_II',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.03.0.T': 'pib_reg_III',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.04.0.T': 'pib_reg_IV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.05.0.T': 'pib_reg_V',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.13.0.T': 'pib_reg_RM',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.06.0.T': 'pib_reg_VI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.07.0.T': 'pib_reg_VII',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.16.0.T': 'pib_reg_XVI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.08.0.T': 'pib_reg_VIII',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.09.0.T': 'pib_reg_IX',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.14.0.T': 'pib_reg_XIV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.10.0.T': 'pib_reg_X',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.11.0.T': 'pib_reg_XI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T': 'pib_reg_XII',
    // Regionales - Población Total
    'F049.POBAP.STO.INE.AT.A': 'pob_reg_XV',
    'F049.POBTA.STO.INE.AT.A': 'pob_reg_I',
    'F049.POBAN.STO.INE.AT.A': 'pob_reg_II',
    'F049.POBAT.STO.INE.AT.A': 'pob_reg_III',
    'F049.POBCO.STO.INE.AT.A': 'pob_reg_IV',
    'F049.POBVA.STO.INE.AT.A': 'pob_reg_V',
    'F049.POBRM.STO.INE.AT.A': 'pob_reg_RM',
    'F049.POBLI.STO.INE.AT.A': 'pob_reg_VI',
    'F049.POBML.STO.INE.AT.A': 'pob_reg_VII',
    'F049.POBBI.STO.INE.AT.A': 'pob_reg_VIII',
    'F049.POBNB.STO.INE.AT.A': 'pob_reg_XVI',
    'F049.POBAR.STO.INE.AT.A': 'pob_reg_IX',
    'F049.POBLR.STO.INE.AT.A': 'pob_reg_XIV',
    'F049.POBLL.STO.INE.AT.A': 'pob_reg_X',
    'F049.POBAI.STO.INE.AT.A': 'pob_reg_XI',
    'F049.POBMA.STO.INE.AT.A': 'pob_reg_XII',
    // Mujeres
    'F049.POBAP.STO.INE.MT.A': 'pob_reg_XV_m',
    'F049.POBTA.STO.INE.MT.A': 'pob_reg_I_m',
    'F049.POBAN.STO.INE.MT.A': 'pob_reg_II_m',
    'F049.POBAT.STO.INE.MT.A': 'pob_reg_III_m',
    'F049.POBCO.STO.INE.MT.A': 'pob_reg_IV_m',
    'F049.POBVA.STO.INE.MT.A': 'pob_reg_V_m',
    'F049.POBRM.STO.INE.MT.A': 'pob_reg_RM_m',
    'F049.POBLI.STO.INE.MT.A': 'pob_reg_VI_m',
    'F049.POBML.STO.INE.MT.A': 'pob_reg_VII_m',
    'F049.POBBI.STO.INE.MT.A': 'pob_reg_VIII_m',
    'F049.POBNB.STO.INE.MT.A': 'pob_reg_XVI_m',
    'F049.POBAR.STO.INE.MT.A': 'pob_reg_IX_m',
    'F049.POBLR.STO.INE.MT.A': 'pob_reg_XIV_m',
    'F049.POBLL.STO.INE.MT.A': 'pob_reg_X_m',
    'F049.POBAI.STO.INE.MT.A': 'pob_reg_XI_m',
    'F049.POBMA.STO.INE.MT.A': 'pob_reg_XII_m',
    // Hombres
    'F049.POBAP.STO.INE.HT.A': 'pob_reg_XV_h',
    'F049.POBTA.STO.INE.HT.A': 'pob_reg_I_h',
    'F049.POBAN.STO.INE.HT.A': 'pob_reg_II_h',
    'F049.POBAT.STO.INE.HT.A': 'pob_reg_III_h',
    'F049.POBCO.STO.INE.HT.A': 'pob_reg_IV_h',
    'F049.POBVA.STO.INE.HT.A': 'pob_reg_V_h',
    'F049.POBRM.STO.INE.HT.A': 'pob_reg_RM_h',
    'F049.POBLI.STO.INE.HT.A': 'pob_reg_VI_h',
    'F049.POBML.STO.INE.HT.A': 'pob_reg_VII_h',
    'F049.POBBI.STO.INE.HT.A': 'pob_reg_VIII_h',
    'F049.POBNB.STO.INE.HT.A': 'pob_reg_XVI_h',
    'F049.POBAR.STO.INE.HT.A': 'pob_reg_IX_h',
    'F049.POBLR.STO.INE.HT.A': 'pob_reg_XIV_h',
    'F049.POBLL.STO.INE.HT.A': 'pob_reg_X_h',
    'F049.POBAI.STO.INE.HT.A': 'pob_reg_XI_h',
    'F049.POBMA.STO.INE.HT.A': 'pob_reg_XII_h'
};

// Cache para datos del BC
let bcchDataCache = null;

const staticKeyAliases = {
    pib_total: 'pib_nominal',
    inversion: 'fbkf_nominal',
    existencias: 'existencias_nominal',
    exportaciones: 'export_nominal',
    importaciones: 'import_nominal'
};

const buildLatestEntry = (series) => {
    const valid = (series || []).filter((entry) => entry && entry.value !== null && entry.value !== undefined);
    for (let i = valid.length - 1; i >= 0; i -= 1) {
        if (valid[i].value !== null && valid[i].value !== undefined) return valid[i];
    }
    return null;
};

const normalizeStaticPayload = (payload) => {
    if (!payload || !payload.series) return payload;
    const normalized = {};

    Object.entries(payload.series).forEach(([key, data]) => {
        const mappedKey = staticKeyAliases[key] || key;
        normalized[mappedKey] = {
            data: Array.isArray(data) ? data : [],
            latest: buildLatestEntry(data)
        };
    });

    return normalized;
};

const loadBcchData = async () => {
    if (bcchDataCache) return bcchDataCache;

    // Priorizamos el archivo estatico generado por GitHub Actions.
    const staticUrl = '/data/bcch_series.json';

    try {
        // Intento 1: Archivo estatico (rapido y confiable)
        const response = await fetch(staticUrl);
        if (response.ok) {
            const payload = await response.json();
            bcchDataCache = normalizeStaticPayload(payload) || payload;
            return bcchDataCache;
        }
        throw new Error('Static data not found');
    } catch (staticError) {
        console.warn('Static data not found:', staticError);
        return null;
    }
};

export const getSeries = async (seriesId, options = {}) => {
    if (!seriesId) return [];

    // Intentar cargar desde JSON estático primero
    const bcchData = await loadBcchData();
    const key = SERIES_KEY_MAP[seriesId];

    if (bcchData && key && bcchData[key]) {
        if (Array.isArray(bcchData[key])) return bcchData[key];
        return bcchData[key].data || [];
    }

    return [];
};

export const getLatestSeries = async (seriesId, frequency) => {
    if (!seriesId) return null;
    return null;
};
